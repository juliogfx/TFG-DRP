/**
 * @file app/api/plantillas/route.ts
 * @description Endpoints colección de plantillas (F1.3).
 *
 *   GET  /api/plantillas → Lista plantillas activas
 *   POST /api/plantillas → Crea plantilla básica (sin posiciones; las
 *                          posiciones se gestionan después por la UI o
 *                          re-ejecutando el seed para la canónica).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlantillas, createPlantilla } from '@/lib/db/plantillas';
import type { CreatePlantillaInput } from '@/types/plantilla';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const data = await getPlantillas();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/plantillas]', error);
    return NextResponse.json(
      { error: 'Error al obtener plantillas', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as CreatePlantillaInput;
    if (!body.nombre || !body.empresaId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: nombre, empresaId' }, { status: 400 });
    }
    const plantilla = await createPlantilla(body);
    return NextResponse.json({ data: plantilla }, { status: 201 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Ya existe una plantilla con ese nombre.' }, { status: 409 });
    }
    console.error('[POST /api/plantillas]', error);
    return NextResponse.json(
      { error: 'Error al crear plantilla', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
