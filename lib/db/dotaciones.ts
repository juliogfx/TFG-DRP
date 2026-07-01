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
import { getMaterialEstandarParaTipo, esDotacionDelta } from '@/lib/db/plantilla-material';

const posicionSelect = { id: true, nombre: true, sector: true } as const;
const eventoListSelect = { id: true, nombre: true, fecha: true } as const;
const eventoDetalleSelect = {
  id: true,
  nombre: true,
  fecha: true,
  horaIncorporacionSspp: true,
  horaFinalizacionSspp: true,
  horaInicioEvento: true,
  horaFinEvento: true,
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

// Personal derivado de PlazaDotacion. La tabla vieja AsignacionPersonalDotacion
// quedó desalineada cuando la pantalla de Asignación pasó a escribir en plazas;
// la lectura por getDotacionById debe partir de las plazas para mantener
// coherencia con el resto de la app (fichajes, dashboard UCO...).
const plazaPersonalSelect = {
  id: true,
  numero: true,
  rolRequerido: true,
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
      plazas: {
        where: { personaId: { not: null } },
        select: plazaPersonalSelect,
        orderBy: { numero: 'asc' },
      },
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

  // El where personaId:not-null ya elimina plazas vacías, pero Prisma tipa la
  // relación como opcional. Type guard local para no recurrir a `as`.
  type PlazaConPersona = (typeof dotacion.plazas)[number] & {
    persona: NonNullable<(typeof dotacion.plazas)[number]['persona']>;
  };
  const plazasConPersona = dotacion.plazas.filter(
    (p): p is PlazaConPersona => p.persona !== null,
  );

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
      horaInicioEvento: dotacion.evento.horaInicioEvento ?? null,
      horaFinEvento: dotacion.evento.horaFinEvento ?? null,
    },
    numeroPersonasAsignadas: plazasConPersona.length,
    personal: plazasConPersona.map((p) => ({
      id: p.id,
      rolEnDotacion: p.rolRequerido ?? '',
      turnoInicioPrev: null,
      turnoFinPrev: null,
      asiste: null,
      persona: {
        id: p.persona.id,
        nombreCompleto: p.persona.nombreCompleto,
        tipo: p.persona.tipo as AsignacionPersonalItem['persona']['tipo'],
        titulacion: p.persona.titulacion?.nombre ?? null,
        telefono: p.persona.telefono,
      },
    })),
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
  // F1.4 — pre-rellenar controlMaterial con la plantilla estándar del
  // tipo, salvo para DELTA (material variable, queda en null). El UCO
  // ajusta luego desde la pantalla de control de material.
  const propuesta = esDotacionDelta(input.codigo)
    ? null
    : getMaterialEstandarParaTipo(input.tipo);
  const dotacion = await prisma.dotacion.create({
    data: {
      eventoId: input.eventoId,
      codigo: input.codigo,
      tipo: input.tipo,
      personalMinimo: input.personalMinimo,
      indicativo: input.indicativo ?? null,
      posicionId: input.posicionId ?? null,
      ...(propuesta !== null && { controlMaterial: propuesta as object }),
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
 * Asigna una persona a una dotación ocupando una PlazaDotacion.
 *
 * Estrategia: usa la primera plaza vacía (ordenada por numero). Si la plaza
 * ya trae un rolRequerido definido por la plantilla se respeta; si no, se
 * rellena con el rol pedido. Si no queda ninguna plaza libre, crea una nueva
 * al final con `numero = max(existentes) + 1`.
 */
export async function asignarPersona(dotacionId: number, input: CreateAsignacionInput): Promise<AsignacionPersonalItem> {
  const dotacion = await prisma.dotacion.findFirst({
    where: { id: dotacionId, deletedAt: null },
    select: { id: true, codigo: true },
  });
  if (!dotacion) throw new Error(`Dotación ${dotacionId} no encontrada`);

  const yaEnPlaza = await prisma.plazaDotacion.findFirst({
    where: { dotacionId, personaId: input.personaId },
    select: { id: true },
  });
  if (yaEnPlaza) {
    throw new Error(`La persona ${input.personaId} ya está asignada a una plaza de esta dotación`);
  }

  const plazaVacia = await prisma.plazaDotacion.findFirst({
    where: { dotacionId, personaId: null },
    orderBy: { numero: 'asc' },
    select: { id: true, rolRequerido: true },
  });

  let plazaId: number;
  if (plazaVacia) {
    const rolFinal = plazaVacia.rolRequerido ?? input.rolEnDotacion;
    await prisma.plazaDotacion.update({
      where: { id: plazaVacia.id },
      data: { personaId: input.personaId, rolRequerido: rolFinal },
    });
    plazaId = plazaVacia.id;
  } else {
    const ultima = await prisma.plazaDotacion.findFirst({
      where: { dotacionId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (ultima?.numero ?? 0) + 1;
    const nueva = await prisma.plazaDotacion.create({
      data: {
        dotacionId,
        numero,
        nombre: `${dotacion.codigo}-${numero}`,
        rolRequerido: input.rolEnDotacion,
        personaId: input.personaId,
      },
      select: { id: true },
    });
    plazaId = nueva.id;
  }

  const plaza = await prisma.plazaDotacion.findUniqueOrThrow({
    where: { id: plazaId },
    select: plazaPersonalSelect,
  });
  if (!plaza.persona) {
    throw new Error(`Estado inconsistente: plaza ${plazaId} sin persona tras asignar`);
  }
  return {
    id: plaza.id,
    rolEnDotacion: plaza.rolRequerido ?? '',
    turnoInicioPrev: null,
    turnoFinPrev: null,
    asiste: null,
    persona: {
      id: plaza.persona.id,
      nombreCompleto: plaza.persona.nombreCompleto,
      tipo: plaza.persona.tipo as AsignacionPersonalItem['persona']['tipo'],
      titulacion: plaza.persona.titulacion?.nombre ?? null,
      telefono: plaza.persona.telefono,
    },
  };
}

/**
 * Libera la plaza que ocupa una persona dentro de una dotación (personaId=null).
 * No elimina la plaza — queda disponible para reasignar.
 */
export async function desasignarPersona(dotacionId: number, personaId: number): Promise<void> {
  const plaza = await prisma.plazaDotacion.findFirst({
    where: { dotacionId, personaId },
    orderBy: { numero: 'asc' },
    select: { id: true },
  });
  if (!plaza) {
    throw new Error(`No existe asignación activa para persona ${personaId} en dotación ${dotacionId}`);
  }
  await prisma.plazaDotacion.update({
    where: { id: plaza.id },
    data: { personaId: null },
  });
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

    const existente = await tx.asignacionWalkie.findUnique({
      where: { walkieId_eventoId: { walkieId, eventoId } },
      select: { id: true, devuelto: true },
    });

    let asignacionId: number;

    if (existente && existente.devuelto) {
      await tx.asignacionWalkie.update({
        where: { id: existente.id },
        data: {
          devuelto: false,
          fechaDevolucion: null,
          dotacionId,
          fechaAsignacion: new Date(),
        },
      });
      asignacionId = existente.id;
    } else {
      const creada = await tx.asignacionWalkie.create({
        data: { walkieId, dotacionId, eventoId },
        select: { id: true },
      });
      asignacionId = creada.id;
    }

    await tx.walkie.update({ where: { id: walkieId }, data: { estado: 'ASIGNADO' } });

    return tx.asignacionWalkie.findUniqueOrThrow({ where: { id: asignacionId }, select: walkieSelect });
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

    const otrasActivas = await tx.asignacionWalkie.count({
      where: { walkieId: asignacion.walkieId, devuelto: false },
    });
    if (otrasActivas === 0) {
      await tx.walkie.update({ where: { id: asignacion.walkieId }, data: { estado: 'DISPONIBLE' } });
    }
  });
}
