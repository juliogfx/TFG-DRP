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
import type { EstadoEvento } from '@prisma/client';
import type { EventoListItem, EventoDetalle, CreateEventoInput, UpdateEventoInput, EstadoEventoLiteral } from '@/types/evento';

/**
 * Combina una fecha (Date a medianoche local) con una hora HH:mm en un
 * Date que representa el instante exacto en la zona horaria del servidor.
 * Devuelve null si la hora no es un string HH:mm válido.
 *
 * NOTA: trabaja en TZ local del servidor. En desarrollo coincide con la TZ
 * del usuario; en producción asume que el servidor está alineado con la TZ
 * del evento (UTC en Vercel por defecto — para España hay un desfase de
 * 1–2h que ya se aceptaba en el resto del proyecto).
 */
function combinarFechaHora(fecha: Date, horaHHmm: string | null): Date | null {
  if (!horaHHmm) return null;
  const partes = horaHHmm.split(':');
  if (partes.length < 2) return null;
  const hh = parseInt(partes[0], 10);
  const mm = parseInt(partes[1], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const d = new Date(fecha);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * F3.1 — Decide si un evento debe transicionar automáticamente de estado
 * en función de su fecha + horaInicioEvento / horaFinEvento.
 *
 *   PENDIENTE  + now ≥ inicio → ACTIVO
 *   ACTIVO     + now ≥ fin    → FINALIZADO
 *   FINALIZADO                → no-op (estado terminal)
 *
 * Si faltan los datos (sin horaInicio o sin horaFin) no se hace nada.
 * Devuelve el estado nuevo si hay transición, o null si no aplica.
 */
function decidirNuevoEstado(
  estadoActual: EstadoEventoLiteral,
  fecha: Date,
  horaInicio: string | null,
  horaFin: string | null,
): EstadoEventoLiteral | null {
  if (estadoActual === 'FINALIZADO') return null;
  const ahora = new Date();
  if (estadoActual === 'ACTIVO') {
    const inst = combinarFechaHora(fecha, horaFin);
    if (inst && ahora >= inst) return 'FINALIZADO';
    return null;
  }
  // PENDIENTE
  // Si ya estamos pasados la hora fin, saltamos directo a FINALIZADO.
  const instFin = combinarFechaHora(fecha, horaFin);
  if (instFin && ahora >= instFin) return 'FINALIZADO';
  const instInicio = combinarFechaHora(fecha, horaInicio);
  if (instInicio && ahora >= instInicio) return 'ACTIVO';
  return null;
}

/**
 * F3.1 — Aplica decidirNuevoEstado a un evento y persiste si hay cambio.
 * Devuelve el estado vigente (nuevo si hubo transición, actual si no).
 *
 * Esta función está pensada para llamarse desde GET /api/eventos[/id]
 * antes de devolver el evento. No hay cron en MVP: el check se ejecuta
 * cada vez que alguien consulta el recurso.
 */
export async function checkYActualizarEstadoEvento(evento: {
  id: number;
  estado: EstadoEventoLiteral;
  fecha: Date;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
}): Promise<EstadoEventoLiteral> {
  const nuevo = decidirNuevoEstado(evento.estado, evento.fecha, evento.horaInicioEvento, evento.horaFinEvento);
  if (!nuevo) return evento.estado;
  await prisma.evento.update({ where: { id: evento.id }, data: { estado: nuevo } });
  return nuevo;
}

const ubicacionSelect = { id: true, nombre: true, codigo: true } as const;
const ubicacionDetalleSelect = { id: true, nombre: true, codigo: true, direccion: true, aforoMaximo: true } as const;
const tipoEventoSelect = { id: true, nombre: true, codigo: true } as const;
const empresaSelect = { id: true, nombre: true, codigo: true } as const;
const equipoSelect = { id: true, nombre: true, codigo: true, deporte: true } as const;

/**
 * Obtiene la lista de eventos activos (no eliminados).
 * Incluye ubicación, tipo de evento y conteo de dotaciones activas.
 * Ordenados por fecha descendente (más reciente primero).
 *
 * @param estado - Si se indica, filtra por ese estado (PENDIENTE | ACTIVO | FINALIZADO).
 * @returns Array de EventoListItem listos para serializar como JSON.
 */
export async function getEventos(estado?: EstadoEvento): Promise<EventoListItem[]> {
  const eventos = await prisma.evento.findMany({
    where: {
      deletedAt: null,
      // Si llega ?estado=X aplicamos el filtro tras la posible transición
      // automática — ver lógica más abajo. Aquí leemos sin filtrar para
      // poder reevaluar el estado de los que estuvieran al borde.
    },
    select: {
      id: true,
      nombre: true,
      fecha: true,
      estado: true,
      rival: true,
      aforoPrevisto: true,
      temporada: true,
      horaInicioEvento: true,
      horaFinEvento: true,
      ubicacion: { select: ubicacionSelect },
      tipoEvento: { select: tipoEventoSelect },
      dotaciones: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { fecha: 'desc' },
  });

  // F3.1 — transición automática PENDIENTE→ACTIVO→FINALIZADO según hora.
  // Persistimos los cambios secuencialmente (típicamente 0–3 en una sola
  // petición; la lista no es enorme y evitamos complicar con $transaction).
  const eventosActualizados = await Promise.all(
    eventos.map(async (e: (typeof eventos)[number]) => {
      const estadoVigente = await checkYActualizarEstadoEvento({
        id: e.id,
        estado: e.estado as EstadoEventoLiteral,
        fecha: e.fecha,
        horaInicioEvento: e.horaInicioEvento ?? null,
        horaFinEvento: e.horaFinEvento ?? null,
      });
      return { ...e, estado: estadoVigente };
    })
  );

  // Aplicamos el filtro ?estado= sobre el estado vigente (post-transición).
  const filtrados = estado ? eventosActualizados.filter((e) => e.estado === estado) : eventosActualizados;

  return filtrados.map((e) => ({
    ...e,
    fecha: e.fecha.toISOString().split('T')[0],
    numeroDotaciones: e.dotaciones.length,
    dotaciones: undefined,
    horaInicioEvento: undefined,
    horaFinEvento: undefined,
  })) as unknown as EventoListItem[];
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
      id: true, nombre: true, fecha: true, estado: true, rival: true,
      aforoPrevisto: true, aforoEstimado: true, temporada: true,
      directorMedico: true, observaciones: true,
      horaIncorporacionSspp: true, horaFinalizacionSspp: true, horaInicioEvento: true, horaFinEvento: true,
      createdAt: true, updatedAt: true,
      ubicacion: { select: ubicacionDetalleSelect },
      tipoEvento: { select: tipoEventoSelect },
      empresaPromotor: { select: empresaSelect },
      empresaContratada: { select: empresaSelect },
      equipoLocal: { select: equipoSelect },
      equipoVisitante: { select: equipoSelect },
      dotaciones: {
        where: { deletedAt: null },
        select: { id: true, codigo: true, tipo: true, estado: true, personalMinimo: true },
        orderBy: { codigo: 'asc' },
      },
    },
  });

  if (!evento) return null;

  // F3.1 — check de transición automática antes de devolver.
  const estadoVigente = await checkYActualizarEstadoEvento({
    id: evento.id,
    estado: evento.estado as EstadoEventoLiteral,
    fecha: evento.fecha,
    horaInicioEvento: evento.horaInicioEvento ?? null,
    horaFinEvento: evento.horaFinEvento ?? null,
  });

  return {
    ...evento,
    estado: estadoVigente,
    fecha: evento.fecha.toISOString().split('T')[0],
    horaIncorporacionSspp: evento.horaIncorporacionSspp?.toISOString() ?? null,
    horaFinalizacionSspp: evento.horaFinalizacionSspp?.toISOString() ?? null,
    horaInicioEvento: evento.horaInicioEvento ?? null,
    horaFinEvento: evento.horaFinEvento ?? null,
    createdAt: evento.createdAt.toISOString(),
    updatedAt: evento.updatedAt.toISOString(),
    equipoLocal: evento.equipoLocal ?? null,
    equipoVisitante: evento.equipoVisitante ?? null,
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
      equipoLocalId: input.equipoLocalId ?? null,
      equipoVisitanteId: input.equipoVisitanteId ?? null,
      directorMedico: input.directorMedico ?? null,
      observaciones: input.observaciones ?? null,
      horaInicioEvento: input.horaInicioEvento ?? null,
      horaFinEvento: input.horaFinEvento ?? null,
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
      ...(input.estado !== undefined && { estado: input.estado }),
      ...(input.tipoEventoId !== undefined && { tipoEventoId: input.tipoEventoId }),
      ...(input.rival !== undefined && { rival: input.rival }),
      ...(input.aforoPrevisto !== undefined && { aforoPrevisto: input.aforoPrevisto }),
      ...(input.aforoEstimado !== undefined && { aforoEstimado: input.aforoEstimado }),
      ...(input.temporada !== undefined && { temporada: input.temporada }),
      ...(input.empresaPromotorId !== undefined && { empresaPromotorId: input.empresaPromotorId }),
      ...(input.empresaContratadaId !== undefined && { empresaContratadaId: input.empresaContratadaId }),
      ...(input.equipoLocalId !== undefined && { equipoLocalId: input.equipoLocalId }),
      ...(input.equipoVisitanteId !== undefined && { equipoVisitanteId: input.equipoVisitanteId }),
      ...(input.directorMedico !== undefined && { directorMedico: input.directorMedico }),
      ...(input.observaciones !== undefined && { observaciones: input.observaciones }),
      ...(input.horaIncorporacionSspp !== undefined && { horaIncorporacionSspp: new Date(input.horaIncorporacionSspp) }),
      ...(input.horaFinalizacionSspp !== undefined && { horaFinalizacionSspp: new Date(input.horaFinalizacionSspp) }),
      ...(input.horaInicioEvento !== undefined && { horaInicioEvento: input.horaInicioEvento || null }),
      ...(input.horaFinEvento !== undefined && { horaFinEvento: input.horaFinEvento || null }),
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
