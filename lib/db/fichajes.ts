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
 * Heurística por defecto: UCO/Clínicas/Banquillo entran a plantío (60 min
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

/**
 * Devuelve `true` si la plaza entra 60 min antes del arranque del evento
 * — PLANTIO y B85 sí, SERVICIO no. Sin valor explícito cae a la heurística
 * por tipo de dotación (misma que resolverIncorporacion).
 */
function entraAnticipada(plazaIncorporacion: string | null, tipoDotacion: TipoDotacion): boolean {
  const raw = plazaIncorporacion?.toUpperCase() ?? null;
  if (raw === 'PLANTIO' || raw === 'B85') return true;
  if (raw === 'SERVICIO') return false;
  return tipoIncorporacionDeDotacion(tipoDotacion) === 'PLANTIO';
}

/**
 * Combina la fecha del evento (`@db.Date`, Date a medianoche UTC) con
 * una hora "HH:mm" en horario local de España (Europe/Madrid) y devuelve
 * el ISO UTC correspondiente. Aplica opcionalmente un offset en minutos.
 *
 * Es independiente del timezone del servidor: si el servidor corre en UTC
 * (Vercel, contenedor) o en Madrid (dev local), el ISO devuelto refleja
 * el mismo instante. Respeta DST — CEST (verano, +02:00) o CET (invierno, +01:00).
 */
function componerHoraIso(fecha: Date, horaHHmm: string | null, offsetMinutos = 0): string | null {
  if (!horaHHmm) return null;
  const partes = horaHHmm.split(':');
  if (partes.length < 2) return null;
  const hh = parseInt(partes[0], 10);
  const mm = parseInt(partes[1], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  const y = fecha.getUTCFullYear();
  const M = fecha.getUTCMonth();
  const D = fecha.getUTCDate();
  // Instante "wall-clock" fingiendo que la hora local es UTC.
  const candidatoMs = Date.UTC(y, M, D, hh, mm + offsetMinutos, 0);
  // Offset real de Madrid para ese instante; Madrid va por delante de UTC,
  // así que el instante real en UTC es el candidato MENOS ese offset.
  const offsetMadridMs = offsetMadridMinutos(new Date(candidatoMs)) * 60000;
  return new Date(candidatoMs - offsetMadridMs).toISOString();
}

/**
 * Offset (minutos) de Europe/Madrid respecto a UTC para el instante dado.
 * +60 en invierno (CET), +120 en verano (CEST).
 */
function offsetMadridMinutos(instante: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(instante);
  const num = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const madridUtcMs = Date.UTC(
    num('year'), num('month') - 1, num('day'),
    num('hour') % 24, num('minute'), num('second'),
  );
  return Math.round((madridUtcMs - instante.getTime()) / 60000);
}

type EventoHorario = {
  fecha: Date;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
};

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

function serializarPlaza(p: PlazaConPersona, evento: EventoHorario | null): FichajeItem {
  const puesto = p.rolRequerido ?? p.persona.titulacion?.nombre ?? '';
  // Horarios propuestos derivados del evento: PLANTIO/B85 arrancan 60 min
  // antes del inicio; SERVICIO al inicio. El fin coincide con el fin del
  // evento para todos. Son propuestas — el coordinador puede sobrescribirlas.
  const offsetInicio = entraAnticipada(p.incorporacion, p.dotacion.tipo) ? -60 : 0;
  const turnoInicioPrev = evento
    ? componerHoraIso(evento.fecha, evento.horaInicioEvento, offsetInicio)
    : null;
  const turnoFinPrev = evento
    ? componerHoraIso(evento.fecha, evento.horaFinEvento, 0)
    : null;
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
    turnoInicioPrev,
    turnoFinPrev,
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
  const [evento, plazas] = await Promise.all([
    prisma.evento.findUnique({
      where: { id: eventoId },
      select: { fecha: true, horaInicioEvento: true, horaFinEvento: true },
    }),
    prisma.plazaDotacion.findMany({
      where: { dotacion: { eventoId }, personaId: { not: null } },
      select: plazaSelect,
      orderBy: [
        { dotacion: { codigo: 'asc' } },
        { numero: 'asc' },
      ],
    }),
  ]);

  // El where filtra personaId != null, pero Prisma aún tipa la relación como
  // opcional. Este type guard convierte de forma segura sin `as`.
  return plazas
    .filter((p): p is PlazaConPersona => p.persona !== null)
    .map((p) => serializarPlaza(p, evento));
}

export async function updateFichaje(plazaId: number, input: UpdateFichajeInput): Promise<FichajeItem> {
  const existe = await prisma.plazaDotacion.findUnique({
    where: { id: plazaId },
    select: {
      id: true,
      personaId: true,
      dotacion: { select: { eventoId: true } },
    },
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

  const [refrescada, evento] = await Promise.all([
    prisma.plazaDotacion.findUniqueOrThrow({
      where: { id: plazaId },
      select: plazaSelect,
    }),
    prisma.evento.findUnique({
      where: { id: existe.dotacion.eventoId },
      select: { fecha: true, horaInicioEvento: true, horaFinEvento: true },
    }),
  ]);
  if (refrescada.persona === null) {
    throw new Error(`La plaza ${plazaId} se quedó sin persona durante el update.`);
  }
  return serializarPlaza(refrescada as PlazaConPersona, evento);
}
