/**
 * @file app/api/plantillas/[id]/dimensionamiento/route.ts
 * @description Opción B — Dimensionamiento persistido en una plantilla.
 *
 *   GET  /api/plantillas/:id/dimensionamiento → filas guardadas
 *   POST /api/plantillas/:id/dimensionamiento → reemplaza el conjunto
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getDimensionamientoDePlantilla,
  saveDimensionamientoDePlantilla,
  type PlantillaDimFila,
} from '@/lib/db/plantillas';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const plantillaId = parseId(ctx.params);
  if (!plantillaId) return NextResponse.json({ error: 'ID de plantilla inválido' }, { status: 400 });
  try {
    const data = await getDimensionamientoDePlantilla(plantillaId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/plantillas/${plantillaId}/dimensionamiento]`, error);
    return NextResponse.json(
      { error: 'Error al obtener dimensionamiento de plantilla', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const plantillaId = parseId(ctx.params);
  if (!plantillaId) return NextResponse.json({ error: 'ID de plantilla inválido' }, { status: 400 });
  try {
    const body = await req.json() as { filas?: PlantillaDimFila[] } | PlantillaDimFila[];
    const filas = Array.isArray(body) ? body : body.filas ?? [];
    if (!Array.isArray(filas)) {
      return NextResponse.json({ error: 'El body debe ser un array de filas o { filas: [...] }' }, { status: 400 });
    }
    const total = await saveDimensionamientoDePlantilla(plantillaId, filas);
    return NextResponse.json({ data: { filasGuardadas: total }, message: 'Dimensionamiento de plantilla guardado' }, { status: 200 });
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      const msg = error instanceof Error ? error.message : 'Plantilla no encontrada';
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error(`[POST /api/plantillas/${plantillaId}/dimensionamiento]`, error);
    return NextResponse.json(
      { error: 'Error al guardar dimensionamiento de plantilla', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
