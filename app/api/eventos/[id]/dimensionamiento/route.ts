/**
 * @file app/api/eventos/[id]/dimensionamiento/route.ts
 * @description Opción B — Dimensionamiento RRHH+RRMM por evento.
 *
 *   GET  /api/eventos/:id/dimensionamiento  → filas (una por dotación)
 *   POST /api/eventos/:id/dimensionamiento  → reemplaza el dimensionamiento
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getDimensionamientoByEvento,
  saveDimensionamientoEvento,
  type DimensionamientoInputFila,
} from '@/lib/db/plazas';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(ctx.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const data = await getDimensionamientoByEvento(eventoId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/eventos/${eventoId}/dimensionamiento]`, error);
    return NextResponse.json(
      { error: 'Error al obtener dimensionamiento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(ctx.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const body = await req.json() as { filas?: DimensionamientoInputFila[] } | DimensionamientoInputFila[];
    const filas = Array.isArray(body) ? body : body.filas ?? [];
    if (!Array.isArray(filas)) {
      return NextResponse.json({ error: 'El body debe ser un array de filas o { filas: [...] }' }, { status: 400 });
    }
    const data = await saveDimensionamientoEvento(eventoId, filas);
    return NextResponse.json({ data, message: 'Dimensionamiento guardado' }, { status: 200 });
  } catch (error) {
    console.error(`[POST /api/eventos/${eventoId}/dimensionamiento]`, error);
    return NextResponse.json(
      { error: 'Error al guardar dimensionamiento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
