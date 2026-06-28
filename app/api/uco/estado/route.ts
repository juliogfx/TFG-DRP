/**
 * @file app/api/uco/estado/route.ts
 * @description API Route del Dashboard UCO — estado en tiempo real de un evento.
 *
 * Endpoint:
 *   GET /api/uco/estado?eventoId=X
 *
 * Devuelve en una sola consulta el estado completo del evento para el
 * dashboard UCO: todas las dotaciones activas con su personal asignado,
 * contadores de intervenciones y resumen por estado operativo.
 *
 * Diseñado para polling cada 30 segundos — respuesta optimizada con
 * una sola query a Prisma usando includes anidados.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { ApiResponse, ApiError, EstadoUCO, DotacionEstado, ContadoresEvento } from '@/types/uco';

/**
 * GET /api/uco/estado?eventoId=X
 *
 * Obtiene el estado completo del evento para el dashboard UCO:
 * - Datos del evento (nombre, fecha)
 * - Todas las dotaciones activas con personal asignado
 * - Contadores de intervenciones (total, traslados clínica/hospital, altas)
 * - Resumen numérico por estado operativo
 * - Timestamp de generación para mostrar "última actualización"
 *
 * @param request - NextRequest con query param eventoId obligatorio.
 * @returns 200 + ApiResponse<EstadoUCO> con el estado completo del evento.
 * @returns 400 + ApiError si falta o es inválido el eventoId.
 * @returns 404 + ApiError si el evento no existe o está eliminado.
 * @returns 500 + ApiError si falla la consulta a BD.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<EstadoUCO> | ApiError>> {
  const { searchParams } = new URL(request.url);
  const eventoIdParam = searchParams.get('eventoId');

  if (!eventoIdParam) {
    return NextResponse.json({ error: 'El parámetro eventoId es obligatorio' }, { status: 400 });
  }

  const eventoId = parseInt(eventoIdParam, 10);
  if (isNaN(eventoId) || eventoId <= 0) {
    return NextResponse.json({ error: 'eventoId debe ser un número entero positivo' }, { status: 400 });
  }

  try {
    const evento = await prisma.evento.findFirst({
      where: { id: eventoId, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        fecha: true,
        dotaciones: {
          where: { deletedAt: null },
          select: {
            id: true,
            codigo: true,
            tipo: true,
            estado: true,
            personalMinimo: true,
            indicativo: true,
            posicion: { select: { id: true, nombre: true, sector: true } },
            personal: {
              select: {
                rolEnDotacion: true,
                persona: { select: { id: true, nombreCompleto: true, tipo: true, telefono: true } },
              },
            },
          },
          orderBy: { codigo: 'asc' },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: `Evento ${eventoId} no encontrado` }, { status: 404 });
    }

    const [totalIntervenciones, trasladosClinica, trasladosHospital, altasEnLugar] = await Promise.all([
      prisma.intervencion.count({ where: { eventoId } }),
      prisma.intervencion.count({ where: { eventoId, trasladoClinica: true } }),
      prisma.intervencion.count({ where: { eventoId, trasladoHospital: true } }),
      prisma.intervencion.count({ where: { eventoId, altaEnLugar: true } }),
    ]);

    const dotaciones: DotacionEstado[] = evento.dotaciones.map((d) => ({
      id: d.id,
      codigo: d.codigo,
      tipo: d.tipo as DotacionEstado['tipo'],
      estado: d.estado as DotacionEstado['estado'],
      personalMinimo: d.personalMinimo,
      numeroPersonasAsignadas: d.personal.length,
      indicativo: d.indicativo,
      posicion: d.posicion ?? null,
      personal: d.personal.map((a) => ({
        id: a.persona.id,
        nombreCompleto: a.persona.nombreCompleto,
        rolEnDotacion: a.rolEnDotacion,
        tipo: a.persona.tipo as 'VOLUNTARIO' | 'FACULTATIVO',
        telefono: a.persona.telefono,
      })),
    }));

    const resumen = {
      disponibles: dotaciones.filter((d) => d.estado === 'DISPONIBLE').length,
      enIntervencion: dotaciones.filter((d) => d.estado === 'EN_INTERVENCION').length,
      noOperativas: dotaciones.filter((d) => d.estado === 'NO_OPERATIVA').length,
      total: dotaciones.length,
    };

    const contadores: ContadoresEvento = { totalIntervenciones, trasladosClinica, trasladosHospital, altasEnLugar };

    const estadoUCO: EstadoUCO = {
      eventoId: evento.id,
      nombreEvento: evento.nombre,
      fechaEvento: evento.fecha.toISOString().split('T')[0],
      actualizadoEn: new Date().toISOString(),
      dotaciones,
      contadores,
      resumen,
    };

    return NextResponse.json({ data: estadoUCO }, { status: 200 });

  } catch (error) {
    console.error('[GET /api/uco/estado]', error);
    return NextResponse.json(
      { error: 'Error al obtener el estado del evento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
