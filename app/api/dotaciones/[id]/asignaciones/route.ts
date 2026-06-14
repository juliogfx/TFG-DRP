/**
 * @file app/api/dotaciones/[id]/asignaciones/route.ts
 * @description API Route para gestionar el personal asignado a una dotación.
 *
 * Endpoints:
 *   POST   /api/dotaciones/:id/asignaciones              → Asigna una persona
 *   DELETE /api/dotaciones/:id/asignaciones?personaId=X  → Desasigna una persona
 *   PATCH  /api/dotaciones/:id/asignaciones              → Actualiza asistencia
 */

import { NextRequest, NextResponse } from 'next/server';
import { asignarPersona, desasignarPersona, updateAsistencia } from '@/lib/db/dotaciones';
import type { ApiResponse, ApiError, AsignacionPersonalItem, CreateAsignacionInput } from '@/types/dotacion';

/**
 * Parsea y valida el parámetro de ruta :id.
 * @param params - Objeto de parámetros de ruta de Next.js.
 * @returns El ID como número positivo, o null si es inválido.
 */
function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

/**
 * POST /api/dotaciones/:id/asignaciones
 * Asigna una persona a la dotación con el rol especificado.
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiResponse<AsignacionPersonalItem> | ApiError>> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });
  try {
    const body = await request.json() as CreateAsignacionInput;
    if (!body.personaId || !body.rolEnDotacion) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: personaId, rolEnDotacion' },
        { status: 400 }
      );
    }
    const asignacion = await asignarPersona(dotacionId, body);
    return NextResponse.json(
      { data: asignacion, message: 'Persona asignada correctamente' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('ya está asignada')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(`[POST /api/dotaciones/${context.params.id}/asignaciones]`, error);
    return NextResponse.json(
      { error: 'Error al asignar la persona', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dotaciones/:id/asignaciones?personaId=X
 * Desasigna una persona de la dotación.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiError | null>> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const personaIdParam = searchParams.get('personaId');
  if (!personaIdParam) return NextResponse.json(
    { error: 'El parámetro personaId es obligatorio' },
    { status: 400 }
  );

  const personaId = parseInt(personaIdParam, 10);
  if (isNaN(personaId) || personaId <= 0) {
    return NextResponse.json(
      { error: 'personaId debe ser un número entero positivo' },
      { status: 400 }
    );
  }

  try {
    await desasignarPersona(dotacionId, personaId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('No existe asignación')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`[DELETE /api/dotaciones/${context.params.id}/asignaciones]`, error);
    return NextResponse.json(
      { error: 'Error al desasignar la persona', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dotaciones/:id/asignaciones
 * Actualiza el campo `asiste` de una asignación de personal.
 * Acepta null para permitir volver a "sin registrar".
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiResponse<AsignacionPersonalItem> | ApiError>> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json(
    { error: 'ID de dotación inválido' },
    { status: 400 }
  );

  let body: { personaId: number; asiste: boolean | null };
  try {
    body = await request.json() as { personaId: number; asiste: boolean | null };
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  if (
    typeof body.personaId !== 'number' ||
    (body.asiste !== null && typeof body.asiste !== 'boolean')
  ) {
    return NextResponse.json(
      { error: 'Faltan campos: personaId (number), asiste (boolean | null)' },
      { status: 400 }
    );
  }

  try {
    const asignacion = await updateAsistencia(dotacionId, body.personaId, body.asiste);
    return NextResponse.json({ data: asignacion }, { status: 200 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: `No existe asignación para persona ${body.personaId} en dotación ${dotacionId}` },
        { status: 404 }
      );
    }
    console.error(`[PATCH /api/dotaciones/${context.params.id}/asignaciones]`, error);
    return NextResponse.json(
      {
        error: 'Error al actualizar asistencia',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
