/**
 * @file app/api/eventos/[id]/route.ts
 * @description API Route de Next.js para un Evento individual.
 *
 * Endpoints:
 *   GET    /api/eventos/:id → Detalle completo de un evento
 *   PUT    /api/eventos/:id → Actualiza campos de un evento
 *   DELETE /api/eventos/:id → Soft-delete (marca deletedAt, no borra)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEventoById, updateEvento, deleteEvento } from '@/lib/db/eventos';
import type { ApiResponse, ApiError, EventoDetalle, UpdateEventoInput } from '@/types/evento';

/**
 * Extrae y valida el parámetro :id de los params de la ruta dinámica.
 * @param params - Objeto params de Next.js App Router
 * @returns El id como número, o null si no es un entero válido
 */
function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

/**
 * GET /api/eventos/:id
 * Devuelve el detalle completo de un evento incluyendo dotaciones y empresas.
 *
 * @param _request - NextRequest (no usado, requerido por la firma de Next.js)
 * @param context  - Contexto de la ruta con params.id
 * @returns 200 + ApiResponse<EventoDetalle> si existe
 * @returns 400 + ApiError si el id no es un número válido
 * @returns 404 + ApiError si el evento no existe o está eliminado
 * @returns 500 + ApiError si falla la consulta a BD
 */
export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiResponse<EventoDetalle> | ApiError>> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });

  try {
    const evento = await getEventoById(id);
    if (!evento) return NextResponse.json({ error: `Evento ${id} no encontrado` }, { status: 404 });
    return NextResponse.json({ data: evento }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/eventos/${id}]`, error);
    return NextResponse.json(
      { error: 'Error al obtener el evento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/eventos/:id
 * Actualiza los campos enviados en el body (PATCH semántico).
 *
 * @param request - NextRequest con el body JSON de los campos a actualizar
 * @param context - Contexto de la ruta con params.id
 * @returns 200 + ApiResponse<EventoDetalle> con el evento actualizado
 * @returns 400 + ApiError si el id no es válido o el body está vacío
 * @returns 404 + ApiError si el evento no existe o está eliminado
 * @returns 500 + ApiError si falla la actualización en BD
 */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiResponse<EventoDetalle> | ApiError>> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });

  try {
    const body = await request.json() as UpdateEventoInput;
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'El body no puede estar vacío' }, { status: 400 });
    }
    const evento = await updateEvento(id, body);
    return NextResponse.json({ data: evento, message: 'Evento actualizado correctamente' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`[PUT /api/eventos/${id}]`, error);
    return NextResponse.json(
      { error: 'Error al actualizar el evento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/eventos/:id
 * Soft-delete: establece deletedAt = now(). El registro permanece en BD.
 *
 * @param _request - NextRequest (no usado)
 * @param context  - Contexto de la ruta con params.id
 * @returns 204 sin body si el soft-delete se aplica correctamente
 * @returns 400 + ApiError si el id no es válido
 * @returns 404 + ApiError si el evento no existe o ya está eliminado
 * @returns 500 + ApiError si falla la operación en BD
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiError | null>> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });

  try {
    await deleteEvento(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`[DELETE /api/eventos/${id}]`, error);
    return NextResponse.json(
      { error: 'Error al eliminar el evento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
