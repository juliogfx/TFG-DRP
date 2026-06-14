/**
 * @file lib/db/intervenciones.ts
 * @description Funciones de acceso a base de datos para el módulo de Intervenciones.
 */

import { prisma } from '@/lib/db/prisma';
import type {
  IntervencionListItem,
  CreateIntervencionInput,
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
    abierta: i.horaFinal === null,
  };
}

/**
 * Devuelve todas las intervenciones de un evento ordenadas por numeroIntervencion DESC.
 * Marca abierta=true si horaFinal es null.
 */
export async function getIntervencionesByEvento(
  eventoId: number
): Promise<IntervencionListItem[]> {
  const intervenciones = await prisma.intervencion.findMany({
    where: { eventoId },
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
