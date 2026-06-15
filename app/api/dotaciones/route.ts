/**
 * @file app/api/dotaciones/route.ts
 * @description API Route de Next.js para la colección de Dotaciones.
 *
 * Endpoints:
 *   GET  /api/dotaciones           → Lista TODAS las dotaciones (sin filtro)
 *   GET  /api/dotaciones?eventoId=X → Lista dotaciones de un evento concreto
 *   POST /api/dotaciones            → Crea una nueva dotación
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDotacionesByEvento, getDotacionesSinFiltro, createDotacion } from '@/lib/db/dotaciones';
import type { ApiResponse, ApiError, DotacionListItem, DotacionDetalle, CreateDotacionInput } from '@/types/dotacion';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dotaciones?eventoId=X
 * Si se proporciona eventoId, devuelve las dotaciones de ese evento.
 * Si no se proporciona, devuelve todas las dotaciones activas (todos los eventos).
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<DotacionListItem[]> | ApiError>> {
  const { searchParams } = new URL(request.url);
  const eventoIdParam = searchParams.get('eventoId');

  try {
    if (eventoIdParam) {
      const eventoId = parseInt(eventoIdParam, 10);
      if (isNaN(eventoId) || eventoId <= 0) {
        return NextResponse.json({ error: 'eventoId debe ser un número entero positivo' }, { status: 400 });
      }
      const dotaciones = await getDotacionesByEvento(eventoId);
      return NextResponse.json({ data: dotaciones }, { status: 200 });
    }
    const dotaciones = await getDotacionesSinFiltro();
    return NextResponse.json({ data: dotaciones }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/dotaciones]', error);
    return NextResponse.json(
      { error: 'Error al obtener las dotaciones', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dotaciones
 * Crea una nueva dotación para un evento.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<DotacionDetalle> | ApiError>> {
  try {
    const body = await request.json() as CreateDotacionInput;
    if (!body.eventoId || !body.codigo || !body.tipo || body.personalMinimo === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: eventoId, codigo, tipo, personalMinimo' }, { status: 400 });
    }
    if (typeof body.eventoId !== 'number' || body.eventoId <= 0) {
      return NextResponse.json({ error: 'eventoId debe ser un número entero positivo' }, { status: 400 });
    }
    const dotacion = await createDotacion(body);
    return NextResponse.json({ data: dotacion, message: 'Dotación creada correctamente' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/dotaciones]', error);
    return NextResponse.json(
      { error: 'Error al crear la dotación', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
