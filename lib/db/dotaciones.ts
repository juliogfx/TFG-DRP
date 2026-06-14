/**
 * @file lib/db/dotaciones.ts
 * @description Funciones de acceso a base de datos para el módulo de Dotaciones y Personal.
 *
 * Encapsula todas las consultas Prisma relacionadas con los modelos Dotacion
 * y AsignacionPersonalDotacion. Es la única capa que importa @prisma/client
 * para este módulo — las API routes y componentes solo ven los tipos de types/dotacion.ts.
 *
 * Patrones obligatorios del proyecto:
 * - Soft-delete: filtrar siempre deletedAt: null en Dotacion.
 * - AsignacionPersonalDotacion no tiene deletedAt — desasignar usa DELETE físico.
 * - Snake_case en BD via @@map/@map — Prisma lo gestiona automáticamente.
 * - Singleton de Prisma importado desde lib/db/prisma.ts.
 */

import { prisma } from '@/lib/db/prisma';
import type {
  DotacionListItem,
  DotacionDetalle,
  PersonaListItem,
  CreateDotacionInput,
  UpdateDotacionInput,
  CreateAsignacionInput,
  AsignacionPersonalItem,
} from '@/types/dotacion';

const posicionSelect = { id: true, nombre: true, sector: true } as const;
const eventoSelect = { id: true, nombre: true } as const;
const personaSelect = { id: true, nombreCompleto: true, tipo: true, titulacion: true, telefono: true } as const;
const asignacionSelect = {
  id: true,
  rolEnDotacion: true,
  turnoInicioPrev: true,
  turnoFinPrev: true,
  asiste: true,
  persona: { select: personaSelect },
} as const;

/**
 * Serializa una asignación de personal convirtiendo fechas Date a strings ISO.
 * @param a - Objeto de asignación devuelto por Prisma.
 * @returns AsignacionPersonalItem listo para serializar como JSON.
 */
function serializarAsignacion(a: {
  id: number;
  rolEnDotacion: string;
  turnoInicioPrev: Date | null;
  turnoFinPrev: Date | null;
  asiste: boolean | null;
  persona: { id: number; nombreCompleto: string; tipo: string; titulacion: string; telefono: string | null; };
}): AsignacionPersonalItem {
  return {
    id: a.id,
    rolEnDotacion: a.rolEnDotacion,
    turnoInicioPrev: a.turnoInicioPrev?.toISOString() ?? null,
    turnoFinPrev: a.turnoFinPrev?.toISOString() ?? null,
    asiste: a.asiste,
    persona: { ...a.persona, tipo: a.persona.tipo as AsignacionPersonalItem['persona']['tipo'] },
  };
}

/**
 * Obtiene todas las dotaciones activas de un evento específico.
 * Incluye posición asignada y conteo de personal asignado.
 * Ordenadas por código ascendente (B01, B02, AMB01...).
 *
 * @param eventoId - ID del evento del que se quieren las dotaciones.
 * @returns Array de DotacionListItem listos para serializar como JSON.
 */
export async function getDotacionesByEvento(eventoId: number): Promise<DotacionListItem[]> {
  const dotaciones = await prisma.dotacion.findMany({
    where: { eventoId, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      estado: true,
      personalMinimo: true,
      posicion: { select: posicionSelect },
      evento: { select: eventoSelect },
      personal: { select: { id: true } },
    },
    orderBy: { codigo: 'asc' },
  });

  return dotaciones.map((d) => ({
    id: d.id,
    codigo: d.codigo,
    tipo: d.tipo as DotacionListItem['tipo'],
    estado: d.estado as DotacionListItem['estado'],
    personalMinimo: d.personalMinimo,
    posicion: d.posicion,
    evento: d.evento,
    numeroPersonasAsignadas: d.personal.length,
  }));
}

/**
 * Obtiene el detalle completo de una dotación por su ID.
 * Incluye posición, evento y lista completa de personal asignado.
 *
 * @param id - ID numérico de la dotación a buscar.
 * @returns DotacionDetalle si existe y no está eliminada, null en caso contrario.
 */
export async function getDotacionById(id: number): Promise<DotacionDetalle | null> {
  const dotacion = await prisma.dotacion.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      estado: true,
      personalMinimo: true,
      indicativo: true,
      numDues: true,
      posicion: { select: posicionSelect },
      evento: { select: eventoSelect },
      personal: { select: asignacionSelect, orderBy: { createdAt: 'asc' } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!dotacion) return null;

  return {
    id: dotacion.id,
    codigo: dotacion.codigo,
    tipo: dotacion.tipo as DotacionDetalle['tipo'],
    estado: dotacion.estado as DotacionDetalle['estado'],
    personalMinimo: dotacion.personalMinimo,
    indicativo: dotacion.indicativo,
    numDues: dotacion.numDues,
    posicion: dotacion.posicion,
    evento: dotacion.evento,
    numeroPersonasAsignadas: dotacion.personal.length,
    personal: dotacion.personal.map(serializarAsignacion),
    createdAt: dotacion.createdAt.toISOString(),
    updatedAt: dotacion.updatedAt.toISOString(),
  };
}

/**
 * Crea una nueva Dotación en la base de datos.
 *
 * @param input - Datos de la dotación. eventoId, codigo, tipo y personalMinimo son obligatorios.
 * @returns El DotacionDetalle de la dotación recién creada.
 * @throws Error si eventoId no existe o el código ya está en uso para ese evento.
 */
export async function createDotacion(input: CreateDotacionInput): Promise<DotacionDetalle> {
  const dotacion = await prisma.dotacion.create({
    data: {
      eventoId: input.eventoId,
      codigo: input.codigo,
      tipo: input.tipo,
      personalMinimo: input.personalMinimo,
      indicativo: input.indicativo ?? null,
      posicionId: input.posicionId ?? null,
    },
  });
  return (await getDotacionById(dotacion.id))!;
}

/**
 * Actualiza los campos de una Dotación existente (PATCH semántico).
 *
 * @param id    - ID de la dotación a actualizar.
 * @param input - Campos a actualizar (todos opcionales).
 * @returns El DotacionDetalle actualizado.
 * @throws Error si la dotación no existe o está eliminada.
 */
export async function updateDotacion(id: number, input: UpdateDotacionInput): Promise<DotacionDetalle> {
  const existe = await prisma.dotacion.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existe) throw new Error(`Dotación ${id} no encontrada o ha sido eliminada`);

  await prisma.dotacion.update({
    where: { id },
    data: {
      ...(input.codigo !== undefined && { codigo: input.codigo }),
      ...(input.tipo !== undefined && { tipo: input.tipo }),
      ...(input.estado !== undefined && { estado: input.estado }),
      ...(input.personalMinimo !== undefined && { personalMinimo: input.personalMinimo }),
      ...(input.indicativo !== undefined && { indicativo: input.indicativo }),
      ...(input.posicionId !== undefined && { posicionId: input.posicionId }),
    },
  });
  return (await getDotacionById(id))!;
}

/**
 * Elimina lógicamente una Dotación estableciendo deletedAt al momento actual.
 *
 * @param id - ID de la dotación a eliminar.
 * @throws Error si la dotación no existe o ya ha sido eliminada.
 */
export async function deleteDotacion(id: number): Promise<void> {
  const existe = await prisma.dotacion.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existe) throw new Error(`Dotación ${id} no encontrada o ya eliminada`);
  await prisma.dotacion.update({ where: { id }, data: { deletedAt: new Date() } });
}

/**
 * Asigna una persona a una dotación creando un registro AsignacionPersonalDotacion.
 *
 * @param dotacionId - ID de la dotación destino.
 * @param input      - Datos de la asignación (personaId, rol, turnos opcionales).
 * @returns El AsignacionPersonalItem de la asignación creada.
 * @throws Error si la dotación no existe, o la persona ya está asignada.
 */
export async function asignarPersona(dotacionId: number, input: CreateAsignacionInput): Promise<AsignacionPersonalItem> {
  const dotacion = await prisma.dotacion.findFirst({ where: { id: dotacionId, deletedAt: null }, select: { id: true } });
  if (!dotacion) throw new Error(`Dotación ${dotacionId} no encontrada`);

  const asignacion = await prisma.asignacionPersonalDotacion.create({
    data: {
      dotacionId,
      personaId: input.personaId,
      rolEnDotacion: input.rolEnDotacion,
      turnoInicioPrev: input.turnoInicioPrev ? new Date(input.turnoInicioPrev) : null,
      turnoFinPrev: input.turnoFinPrev ? new Date(input.turnoFinPrev) : null,
    },
    select: asignacionSelect,
  });
  return serializarAsignacion(asignacion);
}

/**
 * Elimina físicamente la asignación de una persona a una dotación.
 * DELETE físico — AsignacionPersonalDotacion no tiene campo deletedAt en el schema.
 *
 * @param dotacionId - ID de la dotación.
 * @param personaId  - ID de la persona a desasignar.
 * @throws Error si no existe asignación para ese par dotación/persona.
 */
export async function desasignarPersona(dotacionId: number, personaId: number): Promise<void> {
  // Buscar la asignación por la clave única compuesta [dotacionId, personaId]
  const asignacion = await prisma.asignacionPersonalDotacion.findUnique({
    where: { dotacionId_personaId: { dotacionId, personaId } },
    select: { id: true },
  });
  if (!asignacion) {
    throw new Error(`No existe asignación activa para persona ${personaId} en dotación ${dotacionId}`);
  }
  await prisma.asignacionPersonalDotacion.delete({ where: { id: asignacion.id } });
}

/**
 * Actualiza el campo `asiste` de una asignación de personal.
 * Usado por el endpoint PATCH /api/dotaciones/:id/asignaciones
 * para registrar la asistencia en tiempo real durante el evento.
 * Acepta null para permitir volver al estado "sin registrar".
 *
 * @param dotacionId - ID de la dotación.
 * @param personaId  - ID de la persona cuya asistencia se actualiza.
 * @param asiste     - true = asiste, false = ausente, null = sin registrar.
 * @returns La asignación actualizada serializada.
 * @throws Error si la asignación no existe.
 */
export async function updateAsistencia(
  dotacionId: number,
  personaId: number,
  asiste: boolean | null
): Promise<AsignacionPersonalItem> {
  const asignacion = await prisma.asignacionPersonalDotacion.update({
    where: { dotacionId_personaId: { dotacionId, personaId } },
    data: { asiste },
    select: asignacionSelect,
  });
  return serializarAsignacion(asignacion);
}

/**
 * Obtiene la lista de todo el personal activo disponible para asignar.
 * Incluye voluntarios y facultativos, ordenados alfabéticamente.
 *
 * @returns Array de PersonaListItem listos para serializar como JSON.
 */
export async function getPersonalDisponible(): Promise<PersonaListItem[]> {
  const personas = await prisma.persona.findMany({
    where: { activo: true },
    select: { id: true, nombreCompleto: true, tipo: true, titulacion: true, telefono: true, activo: true },
    orderBy: { nombreCompleto: 'asc' },
  });
  return personas.map((p) => ({ ...p, tipo: p.tipo as PersonaListItem['tipo'] }));
}
