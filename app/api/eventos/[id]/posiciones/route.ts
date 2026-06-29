/**
 * @file app/api/eventos/[id]/posiciones/route.ts
 * @description Endpoints colección de Posiciones de un evento (F1.2).
 *
 *   GET  /api/eventos/:id/posiciones → Lista posiciones del evento
 *   POST /api/eventos/:id/posiciones → Crea una posición
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPosicionesByEvento, createPosicion } from '@/lib/db/posiciones';
import type { CreatePosicionInput } from '@/types/posicion';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(context.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const posiciones = await getPosicionesByEvento(eventoId);
    return NextResponse.json({ data: posiciones }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/eventos/${eventoId}/posiciones]`, error);
    return NextResponse.json(
      { error: 'Error al obtener posiciones', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(context.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const body = await request.json() as CreatePosicionInput;
    if (!body.nombre || !body.puestoId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: nombre, puestoId' }, { status: 400 });
    }
    const posicion = await createPosicion(eventoId, body);
    return NextResponse.json({ data: posicion, message: 'Posición creada' }, { status: 201 });
  } catch (error) {
    // Conflicto de codigoQr único (otro evento o el mismo nombre repetido).
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Ya existe una posición con ese nombre en este evento.' },
        { status: 409 }
      );
    }
    console.error(`[POST /api/eventos/${eventoId}/posiciones]`, error);
    return NextResponse.json(
      { error: 'Error al crear posición', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
