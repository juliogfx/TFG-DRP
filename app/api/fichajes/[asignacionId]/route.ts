/**
 * @file app/api/fichajes/[asignacionId]/route.ts
 * @description Endpoint de update de un fichaje (F1.5).
 *
 *   PUT /api/fichajes/:asignacionId
 *   Body: { asiste?, turnoInicioReal?, turnoFinReal?, observaciones? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateFichaje } from '@/lib/db/fichajes';
import type { UpdateFichajeInput } from '@/types/fichaje';

export const dynamic = 'force-dynamic';

function parseId(params: { asignacionId: string }): number | null {
  const id = parseInt(params.asignacionId, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function PUT(request: NextRequest, context: { params: { asignacionId: string } }): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const body = await request.json() as UpdateFichajeInput;
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'El body no puede estar vacío' }, { status: 400 });
    }
    const fichaje = await updateFichaje(id, body);
    return NextResponse.json({ data: fichaje }, { status: 200 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: `No existe fichaje con id ${context.params.asignacionId}` }, { status: 404 });
    }
    console.error(`[PUT /api/fichajes/${context.params.asignacionId}]`, error);
    return NextResponse.json(
      { error: 'Error al actualizar fichaje', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
