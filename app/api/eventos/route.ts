/**
 * @file app/api/eventos/route.ts
 * @description API Route de Next.js para la colección de Eventos.
 *
 * Endpoints:
 *   GET  /api/eventos → Lista todos los eventos activos
 *   POST /api/eventos → Crea un nuevo evento
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEventos, createEvento } from '@/lib/db/eventos';
import type { ApiResponse, ApiError, EventoListItem, EventoDetalle, CreateEventoInput } from '@/types/evento';

/**
 * GET /api/eventos
 * Devuelve la lista de todos los eventos activos ordenados por fecha descendente.
 *
 * @returns 200 + ApiResponse<EventoListItem[]>
 * @returns 500 + ApiError si falla la consulta a BD
 */
export async function GET(): Promise<NextResponse<ApiResponse<EventoListItem[]> | ApiError>> {
  try {
    const eventos = await getEventos();
    return NextResponse.json({ data: eventos }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/eventos]', error);
    return NextResponse.json(
      { error: 'Error al obtener los eventos', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/eventos
 * Crea un nuevo evento con los datos del body.
 * Campos obligatorios: nombre, ubicacionId, fecha.
 *
 * @param request - NextRequest con el body JSON del nuevo evento
 * @returns 201 + ApiResponse<EventoDetalle> si se crea correctamente
 * @returns 400 + ApiError si faltan campos obligatorios o tienen formato incorrecto
 * @returns 500 + ApiError si falla la inserción en BD
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<EventoDetalle> | ApiError>> {
  try {
    const body = await request.json() as CreateEventoInput;

    if (!body.nombre || !body.ubicacionId || !body.fecha) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: nombre, ubicacionId, fecha' },
        { status: 400 }
      );
    }
    if (typeof body.ubicacionId !== 'number' || body.ubicacionId <= 0) {
      return NextResponse.json({ error: 'ubicacionId debe ser un número entero positivo' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) {
      return NextResponse.json({ error: 'fecha debe tener formato YYYY-MM-DD' }, { status: 400 });
    }

    const evento = await createEvento(body);
    return NextResponse.json({ data: evento, message: 'Evento creado correctamente' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/eventos]', error);
    return NextResponse.json(
      { error: 'Error al crear el evento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
