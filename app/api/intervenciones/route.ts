/**
 * @file app/api/intervenciones/route.ts
 * @description API Route para gestionar intervenciones médicas.
 *
 * Endpoints:
 *   GET  /api/intervenciones?eventoId=X → Lista intervenciones del evento
 *   POST /api/intervenciones            → Registra nueva intervención
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIntervencionesByEvento, createIntervencion } from '@/lib/db/intervenciones';
import type { CreateIntervencionInput } from '@/types/intervencion';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const eventoIdParam = searchParams.get('eventoId');
  if (!eventoIdParam) {
    return NextResponse.json(
      { error: 'El parámetro eventoId es obligatorio' },
      { status: 400 }
    );
  }
  const eventoId = parseInt(eventoIdParam, 10);
  if (isNaN(eventoId) || eventoId <= 0) {
    return NextResponse.json(
      { error: 'eventoId debe ser un número entero positivo' },
      { status: 400 }
    );
  }
  // ?abierta=true → solo intervenciones con horaFinal null. Sin param,
  // mantiene comportamiento histórico (todas).
  const soloAbiertas = searchParams.get('abierta') === 'true';
  try {
    const intervenciones = await getIntervencionesByEvento(eventoId, soloAbiertas);
    return NextResponse.json({ data: intervenciones }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/intervenciones]', error);
    return NextResponse.json(
      { error: 'Error al obtener intervenciones', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as CreateIntervencionInput;
    if (!body.eventoId || !body.dotacionActivaId || !body.sintomatologiaId || !body.gravedad) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: eventoId, dotacionActivaId, sintomatologiaId, gravedad' },
        { status: 400 }
      );
    }
    const intervencion = await createIntervencion(body);
    return NextResponse.json(
      { data: intervencion, message: 'Intervención registrada' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/intervenciones]', error);
    return NextResponse.json(
      { error: 'Error al registrar intervención', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
