/**
 * @file app/api/plantillas/[id]/route.ts
 * @description Endpoints individuales de una plantilla.
 *
 *   GET    /api/plantillas/:id → detalle
 *   DELETE /api/plantillas/:id → borra plantilla + posiciones + dimensionamiento
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlantilla, deletePlantilla } from '@/lib/db/plantillas';

export const dynamic = 'force-dynamic';

function parseId(p: string): number | null {
  const id = parseInt(p, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const id = parseId(ctx.params.id);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const data = await getPlantilla(id);
    if (!data) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/plantillas/${id}]`, error);
    return NextResponse.json(
      { error: 'Error al obtener plantilla', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const id = parseId(ctx.params.id);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const nombre = await deletePlantilla(id);
    return NextResponse.json({ data: { nombre }, message: 'Plantilla eliminada' }, { status: 200 });
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }
    console.error(`[DELETE /api/plantillas/${id}]`, error);
    return NextResponse.json(
      { error: 'Error al eliminar plantilla', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
