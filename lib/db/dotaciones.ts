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
  AsignacionMaterialItem,
  AsignacionWalkieItem,
  TipoMaterial,
  EstadoWalkie,
} from '@/types/dotacion';

const posicionSelect = { id: true, nombre: true, sector: true } as const;
const eventoListSelect = { id: true, nombre: true, fecha: true } as const;
const eventoDetalleSelect = {
  id: true,
  nombre: true,
  fecha: true,
  horaIncorporacionSspp: true,
  horaFinalizacionSspp: true,
} as const;
const personaSelect = { id: true, nombreCompleto: true, tipo: true, titulacion: { select: { nombre: true } }, telefono: true } as const;
const asignacionSelect = {
  id: true,
  rolEnDotacion: true,
  turnoInicioPrev: true,
  turnoFinPrev: true,
  asiste: true,
  persona: { select: personaSelect },
} as const;

const materialSelect = {
  id: true,
  cantidad: true,
  observaciones: true,
  material: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      tipo: true,
      stockActual: true,
      esCritico: true,
    },
  },
} as const;

const walkieSelect = {
  id: true,
  fechaAsignacion: true,
  fechaDevolucion: true,
  devuelto: true,
  walkie: {
    select: { id: true, numero: true, estado: true },
  },
} as const;

/**
 * Serializa una asignación de personal convirtiendo fechas Date a strings ISO.
 */
function serializarAsignacion(a: {
  id: number;
  rolEnDotacion: string;
  turnoInicioPrev: Date | null;
  turnoFinPrev: Date | null;
  asiste: boolean | null;
  persona: { id: number; nombreCompleto: string; tipo: string; titulacion: { nombre: string } | null; telefono: string | null; };
}): AsignacionPersonalItem {
  return {
    id: a.id,
    rolEnDotacion: a.rolEnDotacion,
    turnoInicioPrev: a.turnoInicioPrev?.toISOString() ?? null,
    turnoFinPrev: a.turnoFinPrev?.toISOString() ?? null,
    asiste: a.asiste,
    persona: {
      id: a.persona.id,
      nombreCompleto: a.persona.nombreCompleto,
      tipo: a.persona.tipo as AsignacionPersonalItem['persona']['tipo'],
      titulacion: a.persona.titulacion?.nombre ?? null,
      telefono: a.persona.telefono,
    },
  };
}

/**
 * Serializa un evento del listado convirtiendo fecha Date a ISO.
 */
function serializarEventoLista(e: { id: number; nombre: string; fecha: Date }): { id: number; nombre: string; fecha: string } {
  return { id: e.id, nombre: e.nombre, fecha: e.fecha.toISOString().substring(0, 10) };
}

/**
 * Obtiene todas las dotaciones activas de un evento específico.
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
      indicativo: true,
      posicion: { select: posicionSelect },
      evento: { select: eventoListSelect },
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
    indicativo: d.indicativo,
    posicion: d.posicion,
    evento: serializarEventoLista(d.evento),
    numeroPersonasAsignadas: d.personal.length,
  }));
}

/**
 * Obtiene todas las dotaciones activas de todos los eventos (sin filtro).
 * Ordenadas por fecha de evento descendente, luego por código.
 */
export async function getDotacionesSinFiltro(): Promise<DotacionListItem[]> {
  const dotaciones = await prisma.dotacion.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      estado: true,
      personalMinimo: true,
      indicativo: true,
      posicion: { select: posicionSelect },
      evento: { select: eventoListSelect },
      personal: { select: { id: true } },
    },
    orderBy: [
      { evento: { fecha: 'desc' } },
      { codigo: 'asc' },
    ],
  });

  return dotaciones.map((d) => ({
    id: d.id,
    codigo: d.codigo,
    tipo: d.tipo as DotacionListItem['tipo'],
    estado: d.estado as DotacionListItem['estado'],
    personalMinimo: d.personalMinimo,
    indicativo: d.indicativo,
    posicion: d.posicion,
    evento: serializarEventoLista(d.evento),
    numeroPersonasAsignadas: d.personal.length,
  }));
}

/**
 * Obtiene el detalle completo de una dotación por su ID.
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
      evento: { select: eventoDetalleSelect },
      personal: { select: asignacionSelect, orderBy: { createdAt: 'asc' } },
      asignacionesMaterial: { select: materialSelect, orderBy: { createdAt: 'asc' } },
      walkies: {
        select: walkieSelect,
        where: { devuelto: false },
        orderBy: { fechaAsignacion: 'asc' },
      },
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
    evento: {
      id: dotacion.evento.id,
      nombre: dotacion.evento.nombre,
      fecha: dotacion.evento.fecha.toISOString().substring(0, 10),
      horaIncorporacionSspp: dotacion.evento.horaIncorporacionSspp?.toISOString() ?? null,
      horaFinalizacionSspp: dotacion.evento.horaFinalizacionSspp?.toISOString() ?? null,
    },
    numeroPersonasAsignadas: dotacion.personal.length,
    personal: dotacion.personal.map(serializarAsignacion),
    material: dotacion.asignacionesMaterial.map((m) => ({
      id: m.id,
      cantidad: m.cantidad,
      observaciones: m.observaciones,
      material: {
        id: m.material.id,
        codigo: m.material.codigo,
        nombre: m.material.nombre,
        tipo: m.material.tipo as TipoMaterial,
        stockActual: m.material.stockActual,
        esCritico: m.material.esCritico,
      },
    })),
    walkies: dotacion.walkies.map((w) => ({
      id: w.id,
      fechaAsignacion: w.fechaAsignacion.toISOString(),
      fechaDevolucion: w.fechaDevolucion?.toISOString() ?? null,
      devuelto: w.devuelto,
      walkie: {
        id: w.walkie.id,
        numero: w.walkie.numero,
        estado: w.walkie.estado as EstadoWalkie,
      },
    })),
    createdAt: dotacion.createdAt.toISOString(),
    updatedAt: dotacion.updatedAt.toISOString(),
  };
}

/**
 * Crea una nueva Dotación en la base de datos.
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
 */
export async function deleteDotacion(id: number): Promise<void> {
  const existe = await prisma.dotacion.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existe) throw new Error(`Dotación ${id} no encontrada o ya eliminada`);
  await prisma.dotacion.update({ where: { id }, data: { deletedAt: new Date() } });
}

/**
 * Asigna una persona a una dotación creando un registro AsignacionPersonalDotacion.
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
 */
export async function desasignarPersona(dotacionId: number, personaId: number): Promise<void> {
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
 */
export async function getPersonalDisponible(): Promise<PersonaListItem[]> {
  const personas = await prisma.persona.findMany({
    where: { activo: true },
    select: { id: true, nombreCompleto: true, tipo: true, titulacion: { select: { nombre: true } }, telefono: true, activo: true },
    orderBy: { nombreCompleto: 'asc' },
  });
  return personas.map((p) => ({
    ...p,
    tipo: p.tipo as PersonaListItem['tipo'],
    titulacion: p.titulacion?.nombre ?? null,
  }));
}

/**
 * Asigna material a una dotación. La pareja (dotacionId, materialId)
 * debe ser única — si ya existe, lanza un error de duplicado.
 */
export async function asignarMaterial(
  dotacionId: number,
  materialId: number,
  cantidad: number,
  observaciones?: string
): Promise<AsignacionMaterialItem> {
  const dotacion = await prisma.dotacion.findFirst({ where: { id: dotacionId, deletedAt: null }, select: { id: true } });
  if (!dotacion) throw new Error(`Dotación ${dotacionId} no encontrada`);

  const asignacion = await prisma.asignacionMaterialDotacion.create({
    data: {
      dotacionId,
      materialId,
      cantidad,
      observaciones: observaciones ?? null,
    },
    select: materialSelect,
  });

  return {
    id: asignacion.id,
    cantidad: asignacion.cantidad,
    observaciones: asignacion.observaciones,
    material: {
      id: asignacion.material.id,
      codigo: asignacion.material.codigo,
      nombre: asignacion.material.nombre,
      tipo: asignacion.material.tipo as TipoMaterial,
      stockActual: asignacion.material.stockActual,
      esCritico: asignacion.material.esCritico,
    },
  };
}

/**
 * Elimina físicamente una asignación de material a una dotación.
 */
export async function desasignarMaterial(asignacionId: number): Promise<void> {
  const asignacion = await prisma.asignacionMaterialDotacion.findUnique({
    where: { id: asignacionId },
    select: { id: true },
  });
  if (!asignacion) throw new Error(`Asignación de material ${asignacionId} no encontrada`);
  await prisma.asignacionMaterialDotacion.delete({ where: { id: asignacionId } });
}

/**
 * Asigna un walkie a una dotación dentro de un evento.
 * Actualiza el estado del walkie a ASIGNADO en una transacción.
 * El constraint @@unique([walkieId, eventoId]) impide reasignar el mismo
 * walkie dentro del mismo evento si no se ha devuelto la asignación previa.
 */
export async function asignarWalkie(
  dotacionId: number,
  walkieId: number,
  eventoId: number
): Promise<AsignacionWalkieItem> {
  const asignacion = await prisma.$transaction(async (tx) => {
    const dot = await tx.dotacion.findFirst({ where: { id: dotacionId, deletedAt: null }, select: { id: true } });
    if (!dot) throw new Error(`Dotación ${dotacionId} no encontrada`);

    const walkie = await tx.walkie.findUnique({ where: { id: walkieId }, select: { estado: true } });
    if (!walkie) throw new Error(`Walkie ${walkieId} no encontrado`);
    if (walkie.estado === 'AVERIADO' || walkie.estado === 'BAJA') {
      throw new Error(`Walkie no disponible (estado: ${walkie.estado})`);
    }

    const creada = await tx.asignacionWalkie.create({
      data: { walkieId, dotacionId, eventoId },
      select: walkieSelect,
    });

    await tx.walkie.update({ where: { id: walkieId }, data: { estado: 'ASIGNADO' } });

    // Releer para reflejar el estado actualizado
    return tx.asignacionWalkie.findUniqueOrThrow({ where: { id: creada.id }, select: walkieSelect });
  });

  return {
    id: asignacion.id,
    fechaAsignacion: asignacion.fechaAsignacion.toISOString(),
    fechaDevolucion: asignacion.fechaDevolucion?.toISOString() ?? null,
    devuelto: asignacion.devuelto,
    walkie: {
      id: asignacion.walkie.id,
      numero: asignacion.walkie.numero,
      estado: asignacion.walkie.estado as EstadoWalkie,
    },
  };
}

/**
 * Marca una asignación de walkie como devuelta y libera el walkie.
 * Si no quedan asignaciones activas para ese walkie en ningún evento,
 * el estado del walkie vuelve a DISPONIBLE.
 */
export async function devolverWalkie(asignacionId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const asignacion = await tx.asignacionWalkie.findUnique({
      where: { id: asignacionId },
      select: { id: true, walkieId: true, devuelto: true },
    });
    if (!asignacion) throw new Error(`Asignación ${asignacionId} no encontrada`);
    if (asignacion.devuelto) return;

    await tx.asignacionWalkie.update({
      where: { id: asignacionId },
      data: { devuelto: true, fechaDevolucion: new Date() },
    });

    // Si no quedan asignaciones activas en ningún evento para este walkie, marcarlo DISPONIBLE
    const otrasActivas = await tx.asignacionWalkie.count({
      where: { walkieId: asignacion.walkieId, devuelto: false },
    });
    if (otrasActivas === 0) {
      const w = await tx.walkie.findUnique({ where: { id: asignacion.walkieId }, select: { estado: true } });
      if (w && w.estado === 'ASIGNADO') {
        await tx.walkie.update({ where: { id: asignacion.walkieId }, data: { estado: 'DISPONIBLE' } });
      }
    }
  });
}
