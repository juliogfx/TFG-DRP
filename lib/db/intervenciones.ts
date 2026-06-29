/**
 * @file lib/db/intervenciones.ts
 * @description Funciones de acceso a base de datos para el módulo de Intervenciones.
 */

import { prisma } from '@/lib/db/prisma';
import type {
  IntervencionListItem,
  CreateIntervencionInput,
  UpdateIntervencionInput,
  SintomatologiaItem,
  GravedadIntervencion,
  EstadoIntervencion,
  ResolucionIntervencion,
} from '@/types/intervencion';

const intervencionSelect = {
  id: true,
  numeroIntervencion: true,
  horaAviso: true,
  horaLlegada: true,
  horaFinal: true,
  gravedad: true,
  estado: true,
  uco: true,
  sector: true,
  lugar: true,
  resolucion: true,
  parte: true,
  altaEnLugar: true,
  trasladoClinica: true,
  altaEnClinica: true,
  trasladoHospital: true,
  hospitalDestino: true,
  sintomatologia: { select: { id: true, tipo: true } },
  dotacionActiva: { select: { id: true, codigo: true, tipo: true } },
  dotacionApoyo: { select: { id: true, codigo: true } },
  dotacionTraslado: { select: { id: true, codigo: true } },
} as const;

function serializarIntervencion(i: {
  id: number;
  numeroIntervencion: number;
  horaAviso: Date | null;
  horaLlegada: Date | null;
  horaFinal: Date | null;
  gravedad: string;
  estado: string;
  uco: string;
  sector: string | null;
  lugar: string | null;
  resolucion: string | null;
  parte: string | null;
  altaEnLugar: boolean;
  trasladoClinica: boolean;
  altaEnClinica: boolean;
  trasladoHospital: boolean;
  hospitalDestino: string | null;
  sintomatologia: { id: number; tipo: string } | null;
  dotacionActiva: { id: number; codigo: string; tipo: string } | null;
  dotacionApoyo: { id: number; codigo: string } | null;
  dotacionTraslado: { id: number; codigo: string } | null;
}): IntervencionListItem {
  return {
    id: i.id,
    numeroIntervencion: i.numeroIntervencion,
    horaAviso: i.horaAviso?.toISOString() ?? null,
    horaLlegada: i.horaLlegada?.toISOString() ?? null,
    horaFinal: i.horaFinal?.toISOString() ?? null,
    gravedad: i.gravedad as GravedadIntervencion,
    estado: i.estado as EstadoIntervencion,
    uco: i.uco,
    sector: i.sector,
    lugar: i.lugar,
    resolucion: (i.resolucion as ResolucionIntervencion | null) ?? null,
    parte: i.parte,
    altaEnLugar: i.altaEnLugar,
    trasladoClinica: i.trasladoClinica,
    altaEnClinica: i.altaEnClinica,
    trasladoHospital: i.trasladoHospital,
    hospitalDestino: i.hospitalDestino,
    sintomatologia: i.sintomatologia,
    dotacionActiva: i.dotacionActiva,
    dotacionApoyo: i.dotacionApoyo,
    dotacionTraslado: i.dotacionTraslado,
    abierta: i.horaFinal === null,
  };
}

/**
 * Devuelve las intervenciones de un evento ordenadas por numeroIntervencion DESC.
 * Marca abierta=true si horaFinal es null.
 *
 * @param eventoId        ID del evento.
 * @param soloAbiertas    Si true, restringe a las que tengan horaFinal null
 *                        (las "en curso"/"pendientes"). El dashboard UCO lo
 *                        usa para no traerse el histórico de cerradas.
 */
export async function getIntervencionesByEvento(
  eventoId: number,
  soloAbiertas = false,
): Promise<IntervencionListItem[]> {
  const intervenciones = await prisma.intervencion.findMany({
    where: {
      eventoId,
      ...(soloAbiertas ? { horaFinal: null } : {}),
    },
    select: intervencionSelect,
    orderBy: { numeroIntervencion: 'desc' },
  });
  return intervenciones.map(serializarIntervencion);
}

/**
 * Mapea ResolucionIntervencion al campo Boolean correspondiente para
 * mantener compatibilidad con la columna histórica.
 */
function flagsDesdeResolucion(r: ResolucionIntervencion | null | undefined): {
  altaEnLugar?: boolean;
  trasladoClinica?: boolean;
  altaEnClinica?: boolean;
  trasladoHospital?: boolean;
} {
  if (!r) return {};
  return {
    altaEnLugar: r === 'ALTA_EN_LUGAR',
    trasladoClinica: r === 'TRASLADO_CLINICA',
    altaEnClinica: r === 'ALTA_EN_CLINICA',
    trasladoHospital: r === 'TRASLADO_HOSPITALARIO',
  };
}

/**
 * Crea una nueva intervención calculando numeroIntervencion automáticamente
 * como MAX(numeroIntervencion) + 1 para ese eventoId, o 1 si es la primera.
 * Usa transacción para garantizar atomicidad del contador.
 *
 * Estado inicial:
 *   - PENDIENTE_DOTACION si no se pasa dotacionActivaId
 *   - EN_CURSO si se pasa dotacionActivaId
 */
export async function createIntervencion(
  input: CreateIntervencionInput
): Promise<IntervencionListItem> {
  const estadoInicial: EstadoIntervencion = input.dotacionActivaId ? 'EN_CURSO' : 'PENDIENTE_DOTACION';
  const intervencion = await prisma.$transaction(async (tx) => {
    const ultima = await tx.intervencion.findFirst({
      where: { eventoId: input.eventoId },
      orderBy: { numeroIntervencion: 'desc' },
      select: { numeroIntervencion: true },
    });
    const numeroIntervencion = (ultima?.numeroIntervencion ?? 0) + 1;

    return tx.intervencion.create({
      data: {
        eventoId: input.eventoId,
        numeroIntervencion,
        dotacionActivaId: input.dotacionActivaId ?? null,
        sintomatologiaId: input.sintomatologiaId,
        gravedad: input.gravedad,
        estado: estadoInicial,
        uco: input.uco ?? 'UCO1',
        sector: input.sector ?? null,
        lugar: input.lugar ?? null,
        horaAviso: input.horaAviso ? new Date(input.horaAviso) : null,
        horaLlegada: input.horaLlegada ? new Date(input.horaLlegada) : null,
        horaFinal: input.horaFinal ? new Date(input.horaFinal) : null,
        dotacionApoyoId: input.dotacionApoyoId ?? null,
        altaEnLugar: input.altaEnLugar ?? false,
        trasladoClinica: input.trasladoClinica ?? false,
        trasladoHospital: input.trasladoHospital ?? false,
        hospitalDestino: input.hospitalDestino ?? null,
        dotacionTrasladoId: input.dotacionTrasladoId ?? null,
        observaciones: input.observaciones ?? null,
      },
      select: intervencionSelect,
    });
  });
  return serializarIntervencion(intervencion);
}

/**
 * Devuelve todas las sintomatologías ordenadas por tipo ASC.
 */
export async function getSintomatologias(): Promise<SintomatologiaItem[]> {
  return prisma.sintomatologia.findMany({
    select: { id: true, tipo: true, descripcion: true },
    orderBy: { tipo: 'asc' },
  });
}

/**
 * Actualiza los campos de una intervención existente.
 * Todos los campos son opcionales (PATCH semántico).
 *
 * Lógica de estado de intervención:
 *   - Si llega resolucion + horaFinal → estado = CERRADA
 *   - Si llega dotacionActivaId no nulo y antes era nulo → EN_CURSO
 *   - Si llega dotacionActivaId nulo y antes había una → PENDIENTE_DOTACION
 *
 * Transiciones automáticas de claves de dotación (F2.1):
 *   - Asignar dotación nueva → dotación nueva pasa a CL1_EN_CAMINO
 *   - Reasignar (cambiar de dotA a dotB) → dotA a CL0_DISPONIBLE, dotB a CL1_EN_CAMINO
 *   - Desasignar (dotación → null) → dotA a CL0_DISPONIBLE
 *
 * Al cerrar, los Boolean altaEnLugar/trasladoClinica/altaEnClinica/trasladoHospital
 * se actualizan en función de `resolucion` para mantener compatibilidad.
 */
export async function updateIntervencion(
  id: number,
  input: UpdateIntervencionInput
): Promise<IntervencionListItem> {
  const actual = await prisma.intervencion.findUnique({
    where: { id },
    select: { estado: true, dotacionActivaId: true },
  });
  if (!actual) {
    const err: Error & { code?: string } = new Error(`No existe intervención con id ${id}`);
    err.code = 'P2025';
    throw err;
  }

  const cerrando = input.resolucion !== undefined && input.resolucion !== null && input.horaFinal;
  const dotacionAnteriorId = actual.dotacionActivaId;
  const dotacionPropuestaId = input.dotacionActivaId;
  const cambioDotacion = dotacionPropuestaId !== undefined && dotacionPropuestaId !== dotacionAnteriorId;
  const asignandoNueva = cambioDotacion && dotacionPropuestaId !== null;
  const desasignando = cambioDotacion && dotacionPropuestaId === null;

  let estadoCalculado: EstadoIntervencion | undefined;
  if (cerrando) {
    estadoCalculado = 'CERRADA';
  } else if (asignandoNueva && actual.estado === 'PENDIENTE_DOTACION') {
    estadoCalculado = 'EN_CURSO';
  } else if (desasignando) {
    estadoCalculado = 'PENDIENTE_DOTACION';
  }

  const flagsResolucion = input.resolucion !== undefined ? flagsDesdeResolucion(input.resolucion) : {};

  const intervencion = await prisma.$transaction(async (tx) => {
    // Transiciones de claves de dotación.
    // El UCO confirma la llegada (CL1→CL2) en un endpoint aparte; aquí solo
    // tratamos asignar/desasignar/reasignar.
    if (cambioDotacion) {
      if (dotacionAnteriorId) {
        await tx.dotacion.update({
          where: { id: dotacionAnteriorId },
          data: { estado: 'CL0_DISPONIBLE' },
        });
      }
      if (asignandoNueva && dotacionPropuestaId) {
        await tx.dotacion.update({
          where: { id: dotacionPropuestaId },
          data: { estado: 'CL1_EN_CAMINO' },
        });
      }
    }

    return tx.intervencion.update({
      where: { id },
      data: {
      ...(input.dotacionActivaId !== undefined && { dotacionActivaId: input.dotacionActivaId }),
      ...(input.sintomatologiaId !== undefined && { sintomatologiaId: input.sintomatologiaId }),
      ...(input.gravedad !== undefined && { gravedad: input.gravedad }),
      ...(input.uco !== undefined && { uco: input.uco }),
      ...(input.sector !== undefined && { sector: input.sector }),
      ...(input.lugar !== undefined && { lugar: input.lugar }),
      ...(input.resolucion !== undefined && { resolucion: input.resolucion }),
      ...(input.parte !== undefined && { parte: input.parte }),
      ...(input.horaAviso !== undefined && {
        horaAviso: input.horaAviso ? new Date(input.horaAviso) : null,
      }),
      ...(input.horaLlegada !== undefined && {
        horaLlegada: input.horaLlegada ? new Date(input.horaLlegada) : null,
      }),
      ...(input.horaFinal !== undefined && {
        horaFinal: input.horaFinal ? new Date(input.horaFinal) : null,
      }),
      ...(input.dotacionApoyoId !== undefined && { dotacionApoyoId: input.dotacionApoyoId }),
      ...flagsResolucion,
      ...(input.altaEnLugar !== undefined && { altaEnLugar: input.altaEnLugar }),
      ...(input.trasladoClinica !== undefined && { trasladoClinica: input.trasladoClinica }),
      ...(input.altaEnClinica !== undefined && { altaEnClinica: input.altaEnClinica }),
      ...(input.trasladoHospital !== undefined && { trasladoHospital: input.trasladoHospital }),
      ...(input.hospitalDestino !== undefined && { hospitalDestino: input.hospitalDestino }),
      ...(input.dotacionTrasladoId !== undefined && { dotacionTrasladoId: input.dotacionTrasladoId }),
      ...(input.observaciones !== undefined && { observaciones: input.observaciones }),
      ...(estadoCalculado && { estado: estadoCalculado }),
      },
      select: intervencionSelect,
    });
  });
  return serializarIntervencion(intervencion);
}

/**
 * Marca la llegada de la dotación al lugar de una intervención (F2.1).
 * Operación atómica:
 *   - intervencion.horaLlegada = now()
 *   - dotacion_activa.estado = CL2_EN_INTERVENCION
 *
 * Precondiciones (validadas en el endpoint):
 *   - La intervención debe tener dotacionActivaId
 *   - El estado de la dotación debe ser CL1_EN_CAMINO
 *   - horaLlegada aún no debe estar registrada
 */
export async function marcarLlegadaIntervencion(id: number): Promise<IntervencionListItem> {
  const actual = await prisma.intervencion.findUnique({
    where: { id },
    select: { dotacionActivaId: true, horaLlegada: true, estado: true },
  });
  if (!actual) {
    const err: Error & { code?: string } = new Error(`No existe intervención con id ${id}`);
    err.code = 'P2025';
    throw err;
  }
  if (!actual.dotacionActivaId) {
    throw new Error('La intervención no tiene dotación asignada — no se puede registrar llegada.');
  }
  if (actual.horaLlegada) {
    throw new Error('La llegada ya estaba registrada para esta intervención.');
  }

  const intervencion = await prisma.$transaction(async (tx) => {
    await tx.dotacion.update({
      where: { id: actual.dotacionActivaId! },
      data: { estado: 'CL2_EN_INTERVENCION' },
    });
    return tx.intervencion.update({
      where: { id },
      data: { horaLlegada: new Date(), estado: 'EN_CURSO' },
      select: intervencionSelect,
    });
  });
  return serializarIntervencion(intervencion);
}
