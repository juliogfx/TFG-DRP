/**
 * @file app/api/dotaciones/[id]/plazas/route.ts
 * @description Opción B — Plazas de una dotación concreta.
 *
 *   GET /api/dotaciones/:id/plazas → lista ordenada por numero
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlazasByDotacion } from '@/lib/db/plazas';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const dotacionId = parseId(ctx.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID de dotación inválido' }, { status: 400 });
  try {
    const data = await getPlazasByDotacion(dotacionId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/dotaciones/${dotacionId}/plazas]`, error);
    return NextResponse.json(
      { error: 'Error al obtener plazas', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
