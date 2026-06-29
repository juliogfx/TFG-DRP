/**
 * @file app/api/plantillas/[id]/aplicar/route.ts
 * @description POST — clona la plantilla en un evento existente (F1.3).
 *
 * Body: { eventoId: number }
 *
 * El evento debe existir y no tener posiciones/dotaciones aún. Crea las
 * posiciones de la plantilla en el evento y una dotación por posición.
 */

import { NextRequest, NextResponse } from 'next/server';
import { aplicarPlantillaAEvento } from '@/lib/db/plantillas';

export const dynamic = 'force-dynamic';

function parseId(p: string): number | null {
  const id = parseInt(p, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const plantillaId = parseId(context.params.id);
  if (!plantillaId) return NextResponse.json({ error: 'ID de plantilla inválido' }, { status: 400 });
  try {
    const body = await request.json() as { eventoId?: number };
    if (!body?.eventoId || typeof body.eventoId !== 'number') {
      return NextResponse.json({ error: 'Falta el campo `eventoId` (number).' }, { status: 400 });
    }
    const data = await aplicarPlantillaAEvento(plantillaId, body.eventoId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'P2025') {
        const msg = error instanceof Error ? error.message : 'No encontrado';
        return NextResponse.json({ error: msg }, { status: 404 });
      }
    }
    if (error instanceof Error && error.message.includes('ya tiene')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(`[POST /api/plantillas/${plantillaId}/aplicar]`, error);
    return NextResponse.json(
      { error: 'Error al aplicar plantilla', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
