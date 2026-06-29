/**
 * @file app/api/eventos/[id]/control-material/[dotacionId]/walkies/route.ts
 * @description POST — añade un walkie por número a la dotación (F1.7).
 *
 * Body: { numero: string }
 *
 * El walkie se upserta en el catálogo (auto-creación si no existe — el UCO
 * introduce el número físico de la pegatina) y se crea AsignacionWalkie
 * para este evento. Si el walkie ya estaba activo en otra dotación del
 * mismo evento se devuelve 409.
 */

import { NextRequest, NextResponse } from 'next/server';
import { addWalkieToDotacion } from '@/lib/db/control-material';

export const dynamic = 'force-dynamic';

function parseId(p: string): number | null {
  const id = parseInt(p, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string; dotacionId: string } }
): Promise<NextResponse> {
  const eventoId = parseId(context.params.id);
  const dotacionId = parseId(context.params.dotacionId);
  if (!eventoId || !dotacionId) {
    return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
  }

  try {
    const body = await request.json() as { numero?: string };
    if (!body?.numero || typeof body.numero !== 'string') {
      return NextResponse.json({ error: 'Falta el campo `numero` (string).' }, { status: 400 });
    }
    const data = await addWalkieToDotacion(eventoId, dotacionId, body.numero);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'P2025') {
        const msg = error instanceof Error ? error.message : 'No encontrado';
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      if (code === 'P2002') {
        const msg = error instanceof Error ? error.message : 'Walkie ya asignado en este evento';
        return NextResponse.json({ error: msg }, { status: 409 });
      }
    }
    console.error(`[POST /api/eventos/${eventoId}/control-material/${dotacionId}/walkies]`, error);
    return NextResponse.json(
      { error: 'Error al añadir walkie', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
