/**
 * @file app/api/posiciones/[id]/route.ts
 * @description Endpoints sobre una Posición individual (F1.2).
 *
 *   PUT    /api/posiciones/:id → Actualiza campos
 *   DELETE /api/posiciones/:id → Elimina (rechaza si tiene dotación asignada)
 */

import { NextRequest, NextResponse } from 'next/server';
import { updatePosicion, deletePosicion } from '@/lib/db/posiciones';
import type { UpdatePosicionInput } from '@/types/posicion';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function PUT(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const body = await request.json() as UpdatePosicionInput;
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'El body no puede estar vacío' }, { status: 400 });
    }
    const posicion = await updatePosicion(id, body);
    return NextResponse.json({ data: posicion }, { status: 200 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: `No existe posición con id ${context.params.id}` }, { status: 404 });
    }
    console.error(`[PUT /api/posiciones/${context.params.id}]`, error);
    return NextResponse.json(
      { error: 'Error al actualizar posición', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    await deletePosicion(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error
    ) {
      const code = (error as { code: string }).code;
      if (code === 'P2025') {
        return NextResponse.json({ error: `No existe posición con id ${context.params.id}` }, { status: 404 });
      }
      if (code === 'P2003') {
        const msg = error instanceof Error ? error.message : 'No se puede eliminar la posición.';
        return NextResponse.json({ error: msg }, { status: 409 });
      }
    }
    console.error(`[DELETE /api/posiciones/${context.params.id}]`, error);
    return NextResponse.json(
      { error: 'Error al eliminar posición', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
