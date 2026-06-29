/**
 * @file lib/db/posiciones.ts
 * @description Funciones de acceso a BD para el módulo de Posiciones (F1.2).
 *
 * Posiciones = puntos físicos del recinto (banquillos, accesos, gradas,
 * clínicas) donde se ubican las dotaciones durante un evento. Se crean
 * por evento; pueden o no tener una Dotación asignada.
 */

import { prisma } from '@/lib/db/prisma';
import type {
  PosicionListItem,
  CreatePosicionInput,
  UpdatePosicionInput,
  ZonaPosicion,
} from '@/types/posicion';

const posicionSelect = {
  id: true,
  eventoId: true,
  nombre: true,
  codigoQr: true,
  sector: true,
  zona: true,
  componentesMinimo: true,
  componentesMaximo: true,
  puesto: { select: { id: true, nombre: true } },
  dotacion: { select: { id: true } },
} as const;

function serializar(p: {
  id: number;
  eventoId: number;
  nombre: string;
  codigoQr: string;
  sector: string | null;
  zona: string | null;
  componentesMinimo: number | null;
  componentesMaximo: number | null;
  puesto: { id: number; nombre: string };
  dotacion: { id: number } | null;
}): PosicionListItem {
  return {
    id: p.id,
    eventoId: p.eventoId,
    nombre: p.nombre,
    codigoQr: p.codigoQr,
    sector: p.sector,
    zona: (p.zona as ZonaPosicion | null) ?? null,
    componentesMinimo: p.componentesMinimo,
    componentesMaximo: p.componentesMaximo,
    puesto: p.puesto,
    tieneDotacion: p.dotacion !== null,
  };
}

export async function getPosicionesByEvento(eventoId: number): Promise<PosicionListItem[]> {
  const posiciones = await prisma.posicion.findMany({
    where: { eventoId },
    select: posicionSelect,
    orderBy: [{ zona: 'asc' }, { nombre: 'asc' }],
  });
  return posiciones.map(serializar);
}

export async function createPosicion(eventoId: number, input: CreatePosicionInput): Promise<PosicionListItem> {
  // codigoQr: convención eventoId-nombre (único en BD). Si el front quiere
  // cambiarlo después, /api/posiciones/[id] no lo expone (es identificador
  // físico — pegatina en la posición — no se edita en el MVP).
  const codigoQr = `${eventoId}-${input.nombre}`;
  const posicion = await prisma.posicion.create({
    data: {
      eventoId,
      nombre: input.nombre,
      codigoQr,
      puestoId: input.puestoId,
      sector: input.sector ?? null,
      zona: input.zona ?? null,
      componentesMinimo: input.componentesMinimo ?? null,
      componentesMaximo: input.componentesMaximo ?? null,
    },
    select: posicionSelect,
  });
  return serializar(posicion);
}

export async function updatePosicion(id: number, input: UpdatePosicionInput): Promise<PosicionListItem> {
  const existe = await prisma.posicion.findUnique({ where: { id }, select: { id: true } });
  if (!existe) {
    const err: Error & { code?: string } = new Error(`No existe posición con id ${id}`);
    err.code = 'P2025';
    throw err;
  }
  const posicion = await prisma.posicion.update({
    where: { id },
    data: {
      ...(input.nombre !== undefined && { nombre: input.nombre }),
      ...(input.puestoId !== undefined && { puestoId: input.puestoId }),
      ...(input.sector !== undefined && { sector: input.sector }),
      ...(input.zona !== undefined && { zona: input.zona }),
      ...(input.componentesMinimo !== undefined && { componentesMinimo: input.componentesMinimo }),
      ...(input.componentesMaximo !== undefined && { componentesMaximo: input.componentesMaximo }),
    },
    select: posicionSelect,
  });
  return serializar(posicion);
}

/**
 * Borra una posición. Si tiene Dotación asignada se rechaza con error
 * 409 (resuelto en la API). En el MVP no hay soft-delete de Posicion:
 * el patrón soft-delete está en otros modelos pero no en este. Si en
 * el futuro se requiere, basta con añadir `deletedAt DateTime?` al
 * schema y filtrar en getPosicionesByEvento.
 */
export async function deletePosicion(id: number): Promise<void> {
  const p = await prisma.posicion.findUnique({
    where: { id },
    select: { id: true, dotacion: { select: { id: true } } },
  });
  if (!p) {
    const err: Error & { code?: string } = new Error(`No existe posición con id ${id}`);
    err.code = 'P2025';
    throw err;
  }
  if (p.dotacion) {
    const err: Error & { code?: string } = new Error('La posición tiene una dotación asignada y no puede eliminarse.');
    err.code = 'P2003';
    throw err;
  }
  await prisma.posicion.delete({ where: { id } });
}
