/**
 * @file app/api/eventos/[id]/plazas/route.ts
 * @description Opción B — Todas las plazas del evento agrupadas por dotación.
 *
 *   GET /api/eventos/:id/plazas → [{ dotacion, plazas: [...] }, ...]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlazasByEvento } from '@/lib/db/plazas';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(ctx.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const data = await getPlazasByEvento(eventoId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/eventos/${eventoId}/plazas]`, error);
    return NextResponse.json(
      { error: 'Error al obtener plazas', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
