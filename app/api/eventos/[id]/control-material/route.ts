/**
 * @file app/api/eventos/[id]/control-material/route.ts
 * @description GET — control de material por evento (F1.7).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getControlMaterialByEvento } from '@/lib/db/control-material';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(context.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const data = await getControlMaterialByEvento(eventoId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/eventos/${eventoId}/control-material]`, error);
    return NextResponse.json(
      { error: 'Error al obtener control de material', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
