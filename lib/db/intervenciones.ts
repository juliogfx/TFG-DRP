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
} from '@/types/intervencion';

const intervencionSelect = {
  id: true,
  numeroIntervencion: true,
  horaAviso: true,
  horaLlegada: true,
  horaFinal: true,
  gravedad: true,
  altaEnLugar: true,
  trasladoClinica: true,
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
  altaEnLugar: boolean;
  trasladoClinica: boolean;
  trasladoHospital: boolean;
  hospitalDestino: string | null;
  sintomatologia: { id: number; tipo: string } | null;
  dotacionActiva: { id: number; codigo: string; tipo: string };
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
    altaEnLugar: i.altaEnLugar,
    trasladoClinica: i.trasladoClinica,
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
 * Crea una nueva intervención calculando numeroIntervencion automáticamente
 * como MAX(numeroIntervencion) + 1 para ese eventoId, o 1 si es la primera.
 * Usa transacción para garantizar atomicidad del contador.
 */
export async function createIntervencion(
  input: CreateIntervencionInput
): Promise<IntervencionListItem> {
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
        dotacionActivaId: input.dotacionActivaId,
        sintomatologiaId: input.sintomatologiaId,
        gravedad: input.gravedad,
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
 * @param id - ID de la intervención a actualizar.
 * @param input - Campos a actualizar.
 * @returns La intervención actualizada serializada.
 */
export async function updateIntervencion(
  id: number,
  input: UpdateIntervencionInput
): Promise<IntervencionListItem> {
  const intervencion = await prisma.intervencion.update({
    where: { id },
    data: {
      ...(input.dotacionActivaId !== undefined && { dotacionActivaId: input.dotacionActivaId }),
      ...(input.sintomatologiaId !== undefined && { sintomatologiaId: input.sintomatologiaId }),
      ...(input.gravedad !== undefined && { gravedad: input.gravedad }),
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
      ...(input.altaEnLugar !== undefined && { altaEnLugar: input.altaEnLugar }),
      ...(input.trasladoClinica !== undefined && { trasladoClinica: input.trasladoClinica }),
      ...(input.trasladoHospital !== undefined && { trasladoHospital: input.trasladoHospital }),
      ...(input.hospitalDestino !== undefined && { hospitalDestino: input.hospitalDestino }),
      ...(input.dotacionTrasladoId !== undefined && { dotacionTrasladoId: input.dotacionTrasladoId }),
      ...(input.observaciones !== undefined && { observaciones: input.observaciones }),
    },
    select: intervencionSelect,
  });
  return serializarIntervencion(intervencion);
}
