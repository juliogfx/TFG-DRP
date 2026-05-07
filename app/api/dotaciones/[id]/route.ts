/**
 * @file app/api/dotaciones/[id]/route.ts
 * @description API Route de Next.js para una Dotación individual.
 *
 * Endpoints:
 *   GET    /api/dotaciones/:id → Detalle completo con personal asignado
 *   PUT    /api/dotaciones/:id → Actualiza campos de la dotación
 *   DELETE /api/dotaciones/:id → Soft-delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDotacionById, updateDotacion, deleteDotacion } from '@/lib/db/dotaciones';
import type { ApiResponse, ApiError, DotacionDetalle, UpdateDotacionInput } from '@/types/dotacion';

/**
 * Extrae y valida el parámetro :id de los params de la ruta dinámica.
 * @param params - Objeto params de Next.js App Router.
 * @returns El id como número, o null si no es un entero válido.
 */
function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

/**
 * GET /api/dotaciones/:id
 * @param _request - NextRequest (no usado).
 * @param context  - Contexto con params.id.
 * @returns 200 + ApiResponse<DotacionDetalle>
 * @returns 404 + ApiError si no existe o está eliminada
 */
export async function GET(_request: NextRequest, context: { params: { id: string } }): Promise<NextResponse<ApiResponse<DotacionDetalle> | ApiError>> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });
  try {
    const dotacion = await getDotacionById(id);
    if (!dotacion) return NextResponse.json({ error: `Dotación ${id} no encontrada` }, { status: 404 });
    return NextResponse.json({ data: dotacion }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/dotaciones/${id}]`, error);
    return NextResponse.json({ error: 'Error al obtener la dotación', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/dotaciones/:id
 * @param request - NextRequest con el body JSON de los campos a actualizar.
 * @param context - Contexto con params.id.
 * @returns 200 + ApiResponse<DotacionDetalle>
 * @returns 404 + ApiError si no existe o está eliminada
 */
export async function PUT(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse<ApiResponse<DotacionDetalle> | ApiError>> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });
  try {
    const body = await request.json() as UpdateDotacionInput;
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'El body no puede estar vacío' }, { status: 400 });
    }
    const dotacion = await updateDotacion(id, body);
    return NextResponse.json({ data: dotacion, message: 'Dotación actualizada correctamente' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`[PUT /api/dotaciones/${id}]`, error);
    return NextResponse.json({ error: 'Error al actualizar la dotación', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/dotaciones/:id
 * @param _request - NextRequest (no usado).
 * @param context  - Contexto con params.id.
 * @returns 204 sin body si el soft-delete se aplica correctamente
 * @returns 404 + ApiError si no existe o ya está eliminada
 */
export async function DELETE(_request: NextRequest, context: { params: { id: string } }): Promise<NextResponse<ApiError | null>> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });
  try {
    await deleteDotacion(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`[DELETE /api/dotaciones/${id}]`, error);
    return NextResponse.json({ error: 'Error al eliminar la dotación', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
