/**
 * @file app/api/intervenciones/[id]/route.ts
 * @description API Route para operaciones sobre una intervención concreta.
 *
 * Endpoints:
 *   PUT /api/intervenciones/:id → Actualiza campos de una intervención
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateIntervencion } from '@/lib/db/intervenciones';
import type { UpdateIntervencionInput } from '@/types/intervencion';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const body = await request.json() as UpdateIntervencionInput;
    const intervencion = await updateIntervencion(id, body);
    return NextResponse.json({ data: intervencion }, { status: 200 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: `No existe intervención con id ${context.params.id}` },
        { status: 404 }
      );
    }
    console.error(`[PUT /api/intervenciones/${context.params.id}]`, error);
    return NextResponse.json(
      { error: 'Error al actualizar intervención', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
