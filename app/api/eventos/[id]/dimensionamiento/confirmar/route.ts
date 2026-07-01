/**
 * @file app/api/eventos/[id]/dimensionamiento/confirmar/route.ts
 * @description Confirma el dimensionamiento del evento — materializa las
 * dotaciones marcadas como incluida=true (crea Dotacion + PlazaDotacion).
 *
 *   POST /api/eventos/:id/dimensionamiento/confirmar
 *      → { dotacionesCreadas: number, plazasCreadas: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { confirmarDimensionamientoEvento } from '@/lib/db/plazas';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function POST(_req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(ctx.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const data = await confirmarDimensionamientoEvento(eventoId);
    return NextResponse.json({ data, message: 'Dimensionamiento confirmado' }, { status: 200 });
  } catch (error) {
    console.error(`[POST /api/eventos/${eventoId}/dimensionamiento/confirmar]`, error);
    return NextResponse.json(
      { error: 'Error al confirmar dimensionamiento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
