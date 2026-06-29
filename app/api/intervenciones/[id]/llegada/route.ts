/**
 * @file app/api/intervenciones/[id]/llegada/route.ts
 * @description Endpoint que registra la llegada al lugar de la dotación
 * asignada a una intervención (F2.1).
 *
 * En una sola transacción:
 *   - Marca horaLlegada = now() en la intervención
 *   - Cambia la dotación activa a CL2_EN_INTERVENCION
 *
 * El UCO lo confirma con un click en el dashboard; no es automático.
 */

import { NextRequest, NextResponse } from 'next/server';
import { marcarLlegadaIntervencion } from '@/lib/db/intervenciones';

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
    const intervencion = await marcarLlegadaIntervencion(id);
    return NextResponse.json({ data: intervencion, message: 'Llegada registrada' }, { status: 200 });
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
    // Errores de precondición (sin dotación asignada / llegada ya registrada).
    if (error instanceof Error && (error.message.includes('dotación asignada') || error.message.includes('llegada ya'))) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(`[PUT /api/intervenciones/${context.params.id}/llegada]`, error);
    return NextResponse.json(
      { error: 'Error al registrar llegada', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
