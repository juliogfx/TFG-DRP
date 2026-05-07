/**
 * @file app/api/dotaciones/[id]/asignaciones/route.ts
 * @description API Route para gestionar el personal asignado a una dotación.
 *
 * Endpoints:
 *   POST   /api/dotaciones/:id/asignaciones              → Asigna una persona
 *   DELETE /api/dotaciones/:id/asignaciones?personaId=X  → Desasigna una persona
 */

import { NextRequest, NextResponse } from 'next/server';
import { asignarPersona, desasignarPersona } from '@/lib/db/dotaciones';
import type { ApiResponse, ApiError, AsignacionPersonalItem, CreateAsignacionInput } from '@/types/dotacion';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

/**
 * POST /api/dotaciones/:id/asignaciones
 * @param request - Body: { personaId, rolEnDotacion, turnoInicioPrev?, turnoFinPrev? }
 * @param context - Contexto con params.id (dotacionId).
 * @returns 201 + ApiResponse<AsignacionPersonalItem>
 * @returns 409 + ApiError si la persona ya está asignada
 */
export async function POST(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse<ApiResponse<AsignacionPersonalItem> | ApiError>> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });
  try {
    const body = await request.json() as CreateAsignacionInput;
    if (!body.personaId || !body.rolEnDotacion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: personaId, rolEnDotacion' }, { status: 400 });
    }
    const asignacion = await asignarPersona(dotacionId, body);
    return NextResponse.json({ data: asignacion, message: 'Persona asignada correctamente' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('ya está asignada')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(`[POST /api/dotaciones/${context.params.id}/asignaciones]`, error);
    return NextResponse.json({ error: 'Error al asignar la persona', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/dotaciones/:id/asignaciones?personaId=X
 * DELETE físico — AsignacionPersonalDotacion no tiene soft-delete en el schema.
 * @param request - Query param personaId obligatorio.
 * @param context - Contexto con params.id (dotacionId).
 * @returns 204 sin body si se elimina correctamente
 * @returns 404 + ApiError si no existe la asignación
 */
export async function DELETE(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse<ApiError | null>> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const personaIdParam = searchParams.get('personaId');
  if (!personaIdParam) return NextResponse.json({ error: 'El parámetro personaId es obligatorio' }, { status: 400 });

  const personaId = parseInt(personaIdParam, 10);
  if (isNaN(personaId) || personaId <= 0) {
    return NextResponse.json({ error: 'personaId debe ser un número entero positivo' }, { status: 400 });
  }

  try {
    await desasignarPersona(dotacionId, personaId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('No existe asignación')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`[DELETE /api/dotaciones/${context.params.id}/asignaciones]`, error);
    return NextResponse.json({ error: 'Error al desasignar la persona', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
