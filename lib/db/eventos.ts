/**
 * @file lib/db/eventos.ts
 * @description Funciones de acceso a base de datos para el módulo de Eventos.
 *
 * Encapsula todas las consultas Prisma relacionadas con el modelo Evento.
 * Es la única capa que importa @prisma/client — las API routes y componentes
 * solo ven los tipos definidos en types/evento.ts.
 *
 * Patrones obligatorios del proyecto:
 * - Soft-delete: filtrar siempre deletedAt: null en consultas de lectura.
 * - Snake_case en BD via @@map/@map — Prisma lo gestiona automáticamente.
 * - Singleton de Prisma importado desde lib/db/prisma.ts.
 */

import { prisma } from '@/lib/db/prisma';
import type { EventoListItem, EventoDetalle, CreateEventoInput, UpdateEventoInput } from '@/types/evento';

const ubicacionSelect = { id: true, nombre: true, codigo: true } as const;
const ubicacionDetalleSelect = { id: true, nombre: true, codigo: true, direccion: true, aforoMaximo: true } as const;
const tipoEventoSelect = { id: true, nombre: true, codigo: true } as const;
const empresaSelect = { id: true, nombre: true, codigo: true } as const;

/**
 * Obtiene la lista de todos los eventos activos (no eliminados).
 * Incluye ubicación, tipo de evento y conteo de dotaciones activas.
 * Ordenados por fecha descendente (más reciente primero).
 *
 * @returns Array de EventoListItem listos para serializar como JSON.
 */
export async function getEventos(): Promise<EventoListItem[]> {
  const eventos = await prisma.evento.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      nombre: true,
      fecha: true,
      rival: true,
      aforoPrevisto: true,
      temporada: true,
      ubicacion: { select: ubicacionSelect },
      tipoEvento: { select: tipoEventoSelect },
      dotaciones: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { fecha: 'desc' },
  });

  return eventos.map((e: (typeof eventos)[number]) => ({
    ...e,
    fecha: e.fecha.toISOString().split('T')[0],
    numeroDotaciones: e.dotaciones.length,
    dotaciones: undefined,
  })) as EventoListItem[];
}

/**
 * Obtiene el detalle completo de un evento por su ID.
 *
 * @param id - ID numérico del evento a buscar.
 * @returns EventoDetalle si existe y no está eliminado, null en caso contrario.
 */
export async function getEventoById(id: number): Promise<EventoDetalle | null> {
  const evento = await prisma.evento.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, nombre: true, fecha: true, rival: true,
      aforoPrevisto: true, aforoEstimado: true, temporada: true,
      directorMedico: true, observaciones: true,
      horaIncorporacionSspp: true, horaFinalizacionSspp: true,
      createdAt: true, updatedAt: true,
      ubicacion: { select: ubicacionDetalleSelect },
      tipoEvento: { select: tipoEventoSelect },
      empresaPromotor: { select: empresaSelect },
      empresaContratada: { select: empresaSelect },
      dotaciones: {
        where: { deletedAt: null },
        select: { id: true, codigo: true, tipo: true, estado: true, personalMinimo: true },
        orderBy: { codigo: 'asc' },
      },
    },
  });

  if (!evento) return null;

  return {
    ...evento,
    fecha: evento.fecha.toISOString().split('T')[0],
    horaIncorporacionSspp: evento.horaIncorporacionSspp?.toISOString() ?? null,
    horaFinalizacionSspp: evento.horaFinalizacionSspp?.toISOString() ?? null,
    createdAt: evento.createdAt.toISOString(),
    updatedAt: evento.updatedAt.toISOString(),
    dotaciones: evento.dotaciones.map((d: (typeof evento.dotaciones)[number]) => ({
      ...d,
      tipo: d.tipo as string,
      estado: d.estado as string,
    })),
  } as EventoDetalle;
}

/**
 * Crea un nuevo Evento en la base de datos.
 *
 * @param input - Datos del evento a crear. nombre, ubicacionId y fecha son obligatorios.
 * @returns El EventoDetalle del evento recién creado.
 * @throws Error si ubicacionId no existe en la BD (FK constraint violation).
 */
export async function createEvento(input: CreateEventoInput): Promise<EventoDetalle> {
  const evento = await prisma.evento.create({
    data: {
      nombre: input.nombre,
      ubicacionId: input.ubicacionId,
      fecha: new Date(input.fecha),
      tipoEventoId: input.tipoEventoId ?? null,
      rival: input.rival ?? null,
      aforoPrevisto: input.aforoPrevisto ?? null,
      temporada: input.temporada ?? null,
      empresaPromotorId: input.empresaPromotorId ?? null,
      empresaContratadaId: input.empresaContratadaId ?? null,
      directorMedico: input.directorMedico ?? null,
      observaciones: input.observaciones ?? null,
    },
  });
  return (await getEventoById(evento.id))!;
}

/**
 * Actualiza los campos de un Evento existente.
 * Solo actualiza los campos presentes en el input (PATCH semántico).
 *
 * @param id    - ID del evento a actualizar.
 * @param input - Campos a actualizar (todos opcionales).
 * @returns El EventoDetalle actualizado.
 * @throws Error si el evento no existe o está eliminado.
 */
export async function updateEvento(id: number, input: UpdateEventoInput): Promise<EventoDetalle> {
  const existe = await prisma.evento.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existe) throw new Error(`Evento ${id} no encontrado o ha sido eliminado`);

  await prisma.evento.update({
    where: { id },
    data: {
      ...(input.nombre !== undefined && { nombre: input.nombre }),
      ...(input.ubicacionId !== undefined && { ubicacionId: input.ubicacionId }),
      ...(input.fecha !== undefined && { fecha: new Date(input.fecha) }),
      ...(input.tipoEventoId !== undefined && { tipoEventoId: input.tipoEventoId }),
      ...(input.rival !== undefined && { rival: input.rival }),
      ...(input.aforoPrevisto !== undefined && { aforoPrevisto: input.aforoPrevisto }),
      ...(input.aforoEstimado !== undefined && { aforoEstimado: input.aforoEstimado }),
      ...(input.temporada !== undefined && { temporada: input.temporada }),
      ...(input.empresaPromotorId !== undefined && { empresaPromotorId: input.empresaPromotorId }),
      ...(input.empresaContratadaId !== undefined && { empresaContratadaId: input.empresaContratadaId }),
      ...(input.directorMedico !== undefined && { directorMedico: input.directorMedico }),
      ...(input.observaciones !== undefined && { observaciones: input.observaciones }),
      ...(input.horaIncorporacionSspp !== undefined && { horaIncorporacionSspp: new Date(input.horaIncorporacionSspp) }),
      ...(input.horaFinalizacionSspp !== undefined && { horaFinalizacionSspp: new Date(input.horaFinalizacionSspp) }),
    },
  });
  return (await getEventoById(id))!;
}

/**
 * Elimina lógicamente un Evento estableciendo deletedAt al momento actual.
 * El registro permanece en BD para auditoría e historial.
 *
 * @param id - ID del evento a eliminar.
 * @throws Error si el evento no existe o ya ha sido eliminado previamente.
 */
export async function deleteEvento(id: number): Promise<void> {
  const existe = await prisma.evento.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existe) throw new Error(`Evento ${id} no encontrado o ya eliminado`);
  await prisma.evento.update({ where: { id }, data: { deletedAt: new Date() } });
}
