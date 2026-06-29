/**
 * @file app/api/intervenciones/[id]/llegada-apoyo/route.ts
 * @description Confirma la llegada de la dotación de apoyo al lugar (F2.4).
 *
 * Diferencias frente a /llegada (que es para la dotación principal):
 *   - No registra horaLlegada (el schema no tiene un campo dedicado al apoyo).
 *   - No modifica el estado de la intervención — el ciclo del apoyo es
 *     independiente del de la principal.
 *
 * Acción: dotación de apoyo → CL2_EN_INTERVENCION.
 */

import { NextRequest, NextResponse } from 'next/server';
import { marcarLlegadaApoyo } from '@/lib/db/intervenciones';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function PUT(
  _request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const intervencion = await marcarLlegadaApoyo(id);
    return NextResponse.json({ data: intervencion, message: 'Llegada de apoyo registrada' }, { status: 200 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: `No existe intervención con id ${context.params.id}` },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message.includes('apoyo asignada')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(`[PUT /api/intervenciones/${context.params.id}/llegada-apoyo]`, error);
    return NextResponse.json(
      { error: 'Error al registrar llegada de apoyo', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
