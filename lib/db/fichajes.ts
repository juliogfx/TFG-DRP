/**
 * @file lib/db/fichajes.ts
 * @description Acceso a BD para el módulo de Fichajes (F1.5).
 *
 * Fuente de datos: PlazaDotacion (asignación por plaza, "Opción B").
 * Sustituye a la lectura de AsignacionPersonalDotacion que quedó
 * desincronizada cuando la pantalla de Asignación pasó a escribir en
 * PlazaDotacion. El `asignacionId` que ve la UI es en realidad el `id`
 * de la plaza — se mantiene el nombre por compatibilidad con el endpoint.
 *
 * Añade los campos derivados que la pantalla necesita (acreditado,
 * llegadaTardia, etc.) y que no están persistidos en BD.
 */

import { prisma } from '@/lib/db/prisma';
import type { TipoDotacion } from '@prisma/client';
import type { FichajeItem, TipoIncorporacion, UpdateFichajeInput } from '@/types/fichaje';

function diferenciaHoras(inicio: Date | null, fin: Date | null): number | null {
  if (!inicio || !fin) return null;
  const ms = fin.getTime() - inicio.getTime();
  if (ms <= 0) return null;
  return Math.round((ms / 1000 / 60 / 60) * 100) / 100;
}

/**
 * Heurística por defecto: UCO/Clínicas/Banquillo entran a plantío (30 min
 * antes). El resto a servicio. Se usa solo si la plaza no tiene su propio
 * campo `incorporacion` con un valor válido.
 */
function tipoIncorporacionDeDotacion(tipoDotacion: TipoDotacion): TipoIncorporacion {
  return tipoDotacion === 'UCO_UNIT' || tipoDotacion === 'CLINICA' || tipoDotacion === 'BANQUILLO'
    ? 'PLANTIO'
    : 'SERVICIO';
}

function resolverIncorporacion(plazaIncorporacion: string | null, tipoDotacion: TipoDotacion): TipoIncorporacion {
  if (plazaIncorporacion === 'PLANTIO' || plazaIncorporacion === 'SERVICIO') return plazaIncorporacion;
  return tipoIncorporacionDeDotacion(tipoDotacion);
}

const plazaSelect = {
  id: true,
  rolRequerido: true,
  incorporacion: true,
  observaciones: true,
  asiste: true,
  turnoInicioReal: true,
  turnoFinReal: true,
  dotacion: { select: { id: true, codigo: true, tipo: true } },
  persona: {
    select: {
      id: true,
      nombreCompleto: true,
      telefono: true,
      acreditacion: true,
      titulacion: { select: { nombre: true } },
    },
  },
} as const;

type PlazaConPersona = {
  id: number;
  rolRequerido: string | null;
  incorporacion: string | null;
  observaciones: string | null;
  asiste: boolean | null;
  turnoInicioReal: Date | null;
  turnoFinReal: Date | null;
  dotacion: { id: number; codigo: string; tipo: TipoDotacion };
  persona: {
    id: number;
    nombreCompleto: string;
    telefono: string | null;
    acreditacion: string | null;
    titulacion: { nombre: string } | null;
  };
};

function serializarPlaza(p: PlazaConPersona): FichajeItem {
  const puesto = p.rolRequerido ?? p.persona.titulacion?.nombre ?? '';
  return {
    asignacionId: p.id,
    personaId: p.persona.id,
    nombreCompleto: p.persona.nombreCompleto,
    telefono: p.persona.telefono,
    puesto,
    dotacionId: p.dotacion.id,
    dotacionCodigo: p.dotacion.codigo,
    // Mientras la plaza tenga persona asignada consideramos que está en el
    // listado de plantío. Cuando F1.5 formalice el listado, este flag
    // pasará a leerse de otro campo.
    listadoPlantio: true,
    incorporacion: resolverIncorporacion(p.incorporacion, p.dotacion.tipo),
    asiste: p.asiste,
    // PlazaDotacion no persiste horario previsto — se dejaría para F1.5.2.
    // Sin previsto no hay forma de calcular tardanza, así que ambos flags
    // van a false para no dar falsos positivos.
    turnoInicioPrev: null,
    turnoFinPrev: null,
    turnoInicioReal: p.turnoInicioReal?.toISOString() ?? null,
    turnoFinReal: p.turnoFinReal?.toISOString() ?? null,
    observaciones: p.observaciones,
    acreditado: p.persona.acreditacion != null && p.persona.acreditacion.trim() !== '',
    faltaPrevia: !!p.observaciones && /falta previa/i.test(p.observaciones),
    llegadaTardia: false,
    salidaTardia: false,
    horas: diferenciaHoras(p.turnoInicioReal, p.turnoFinReal),
  };
}

export async function getFichajesByEvento(eventoId: number): Promise<FichajeItem[]> {
  const plazas = await prisma.plazaDotacion.findMany({
    where: { dotacion: { eventoId }, personaId: { not: null } },
    select: plazaSelect,
    orderBy: [
      { dotacion: { codigo: 'asc' } },
      { numero: 'asc' },
    ],
  });

  // El where filtra personaId != null, pero Prisma aún tipa la relación como
  // opcional. Este type guard convierte de forma segura sin `as`.
  return plazas
    .filter((p): p is PlazaConPersona => p.persona !== null)
    .map(serializarPlaza);
}

export async function updateFichaje(plazaId: number, input: UpdateFichajeInput): Promise<FichajeItem> {
  const existe = await prisma.plazaDotacion.findUnique({
    where: { id: plazaId },
    select: { id: true, personaId: true },
  });
  if (!existe) {
    const err: Error & { code?: string } = new Error(`No existe fichaje con id ${plazaId}`);
    err.code = 'P2025';
    throw err;
  }
  if (existe.personaId === null) {
    throw new Error(`La plaza ${plazaId} no tiene persona asignada — no se puede fichar.`);
  }

  await prisma.plazaDotacion.update({
    where: { id: plazaId },
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

  const refrescada = await prisma.plazaDotacion.findUniqueOrThrow({
    where: { id: plazaId },
    select: plazaSelect,
  });
  if (refrescada.persona === null) {
    throw new Error(`La plaza ${plazaId} se quedó sin persona durante el update.`);
  }
  return serializarPlaza(refrescada as PlazaConPersona);
}
