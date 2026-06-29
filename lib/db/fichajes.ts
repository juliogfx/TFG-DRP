/**
 * @file lib/db/fichajes.ts
 * @description Acceso a BD para el módulo de Fichajes (F1.5).
 *
 * Convierte filas de AsignacionPersonalDotacion en FichajeItem,
 * añadiendo los campos derivados (acreditado, llegadaTardia, etc.)
 * que la pantalla de fichajes necesita.
 */

import { prisma } from '@/lib/db/prisma';
import type { FichajeItem, TipoIncorporacion, UpdateFichajeInput } from '@/types/fichaje';

const MARGEN_LLEGADA_MIN = 10; // minutos de gracia antes de marcar llegada tardía

function diferenciaHoras(inicio: Date | null, fin: Date | null): number | null {
  if (!inicio || !fin) return null;
  const ms = fin.getTime() - inicio.getTime();
  if (ms <= 0) return null;
  return Math.round((ms / 1000 / 60 / 60) * 100) / 100;
}

/**
 * Calcula el tipo de incorporación de una dotación en un evento.
 * Para el MVP usamos la heurística: las dotaciones cuyo tipo es
 * UCO_UNIT, CLINICA o BANQUILLO acuden a PLANTIO (anticipo de 30 min);
 * el resto SERVICIO (a hora inicio evento). Si esto cambia debe
 * persistirse como columna en Dotacion.
 */
function tipoIncorporacion(tipoDotacion: string): TipoIncorporacion {
  return tipoDotacion === 'UCO_UNIT' || tipoDotacion === 'CLINICA' || tipoDotacion === 'BANQUILLO'
    ? 'PLANTIO'
    : 'SERVICIO';
}

function llegadaTardia(prev: Date | null, real: Date | null): boolean {
  if (!prev || !real) return false;
  return real.getTime() > prev.getTime() + MARGEN_LLEGADA_MIN * 60 * 1000;
}

function salidaTardia(prev: Date | null, real: Date | null): boolean {
  if (!prev || !real) return false;
  return real.getTime() > prev.getTime();
}

export async function getFichajesByEvento(eventoId: number): Promise<FichajeItem[]> {
  const asignaciones = await prisma.asignacionPersonalDotacion.findMany({
    where: { dotacion: { eventoId } },
    select: {
      id: true,
      rolEnDotacion: true,
      turnoInicioPrev: true,
      turnoFinPrev: true,
      asiste: true,
      turnoInicioReal: true,
      turnoFinReal: true,
      observaciones: true,
      dotacion: { select: { id: true, codigo: true, tipo: true } },
      persona: { select: { id: true, nombreCompleto: true, telefono: true, acreditacion: true } },
    },
    orderBy: [
      { dotacion: { codigo: 'asc' } },
      { persona: { nombreCompleto: 'asc' } },
    ],
  });

  return asignaciones.map((a): FichajeItem => ({
    asignacionId: a.id,
    personaId: a.persona.id,
    nombreCompleto: a.persona.nombreCompleto,
    telefono: a.persona.telefono,
    puesto: a.rolEnDotacion,
    dotacionId: a.dotacion.id,
    dotacionCodigo: a.dotacion.codigo,
    // Mientras la asignación exista en BD consideramos que la persona
    // está en el listado de plantío. En el futuro se podría diferenciar
    // con una columna explícita.
    listadoPlantio: true,
    incorporacion: tipoIncorporacion(a.dotacion.tipo),
    asiste: a.asiste,
    turnoInicioPrev: a.turnoInicioPrev?.toISOString() ?? null,
    turnoFinPrev: a.turnoFinPrev?.toISOString() ?? null,
    turnoInicioReal: a.turnoInicioReal?.toISOString() ?? null,
    turnoFinReal: a.turnoFinReal?.toISOString() ?? null,
    observaciones: a.observaciones,
    acreditado: a.persona.acreditacion != null && a.persona.acreditacion.trim() !== '',
    // "Falta previa" se marca textualmente en observaciones por ahora —
    // si en el futuro hay columna dedicada, basta con cambiar la fuente.
    faltaPrevia: !!a.observaciones && /falta previa/i.test(a.observaciones),
    llegadaTardia: llegadaTardia(a.turnoInicioPrev, a.turnoInicioReal),
    salidaTardia: salidaTardia(a.turnoFinPrev, a.turnoFinReal),
    horas: diferenciaHoras(a.turnoInicioReal, a.turnoFinReal),
  }));
}

export async function updateFichaje(asignacionId: number, input: UpdateFichajeInput): Promise<FichajeItem> {
  const existe = await prisma.asignacionPersonalDotacion.findUnique({
    where: { id: asignacionId },
    select: { id: true },
  });
  if (!existe) {
    const err: Error & { code?: string } = new Error(`No existe fichaje con id ${asignacionId}`);
    err.code = 'P2025';
    throw err;
  }

  await prisma.asignacionPersonalDotacion.update({
    where: { id: asignacionId },
    data: {
      ...(input.asiste !== undefined && { asiste: input.asiste }),
      ...(input.turnoInicioReal !== undefined && {
        turnoInicioReal: input.turnoInicioReal ? new Date(input.turnoInicioReal) : null,
      }),
      ...(input.turnoFinReal !== undefined && {
        turnoFinReal: input.turnoFinReal ? new Date(input.turnoFinReal) : null,
      }),
      ...(input.observaciones !== undefined && { observaciones: input.observaciones }),
    },
  });

  // Devolvemos la fila reconstruida con todos los campos derivados.
  const refrescada = await prisma.asignacionPersonalDotacion.findUniqueOrThrow({
    where: { id: asignacionId },
    select: {
      id: true,
      rolEnDotacion: true,
      turnoInicioPrev: true,
      turnoFinPrev: true,
      asiste: true,
      turnoInicioReal: true,
      turnoFinReal: true,
      observaciones: true,
      dotacion: { select: { id: true, codigo: true, tipo: true } },
      persona: { select: { id: true, nombreCompleto: true, telefono: true, acreditacion: true } },
    },
  });

  return {
    asignacionId: refrescada.id,
    personaId: refrescada.persona.id,
    nombreCompleto: refrescada.persona.nombreCompleto,
    telefono: refrescada.persona.telefono,
    puesto: refrescada.rolEnDotacion,
    dotacionId: refrescada.dotacion.id,
    dotacionCodigo: refrescada.dotacion.codigo,
    listadoPlantio: true,
    incorporacion: tipoIncorporacion(refrescada.dotacion.tipo),
    asiste: refrescada.asiste,
    turnoInicioPrev: refrescada.turnoInicioPrev?.toISOString() ?? null,
    turnoFinPrev: refrescada.turnoFinPrev?.toISOString() ?? null,
    turnoInicioReal: refrescada.turnoInicioReal?.toISOString() ?? null,
    turnoFinReal: refrescada.turnoFinReal?.toISOString() ?? null,
    observaciones: refrescada.observaciones,
    acreditado: refrescada.persona.acreditacion != null && refrescada.persona.acreditacion.trim() !== '',
    faltaPrevia: !!refrescada.observaciones && /falta previa/i.test(refrescada.observaciones),
    llegadaTardia: llegadaTardia(refrescada.turnoInicioPrev, refrescada.turnoInicioReal),
    salidaTardia: salidaTardia(refrescada.turnoFinPrev, refrescada.turnoFinReal),
    horas: diferenciaHoras(refrescada.turnoInicioReal, refrescada.turnoFinReal),
  };
}
