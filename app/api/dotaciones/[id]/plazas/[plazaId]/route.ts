/**
 * @file app/api/dotaciones/[id]/plazas/[plazaId]/route.ts
 * @description Opción B — Actualiza una plaza individual.
 *
 *   PUT /api/dotaciones/:id/plazas/:plazaId
 *   body: { personaId?: number | null, rolRequerido?: string, incorporacion?: string, observaciones?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updatePlaza } from '@/lib/db/plazas';

export const dynamic = 'force-dynamic';

function parseId(value: string): number | null {
  const id = parseInt(value, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

interface Ctx { params: { id: string; plazaId: string } }

export async function PUT(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const dotacionId = parseId(ctx.params.id);
  const plazaId    = parseId(ctx.params.plazaId);
  if (!dotacionId || !plazaId) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  try {
    const body = await req.json() as {
      personaId?: number | null;
      rolRequerido?: string | null;
      incorporacion?: string | null;
      contar?: boolean;
      acron?: string | null;
      observaciones?: string | null;
    };
    const data = await updatePlaza(plazaId, body);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(`[PUT /api/dotaciones/${dotacionId}/plazas/${plazaId}]`, error);
    return NextResponse.json(
      { error: 'Error al actualizar la plaza', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
