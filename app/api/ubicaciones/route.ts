/**
 * @file app/api/ubicaciones/route.ts
 * @description API Route de catálogo para Ubicaciones.
 *
 * Endpoint:
 *   GET /api/ubicaciones → Lista todas las ubicaciones (id, nombre, codigo)
 *
 * Usado por los formularios de Evento para cargar el select de ubicación.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/ubicaciones
 * Devuelve todas las ubicaciones ordenadas alfabéticamente.
 *
 * @returns 200 + array de { id, nombre, codigo }
 * @returns 500 + ApiError si falla la consulta
 */
export async function GET() {
  try {
    const ubicaciones = await prisma.ubicacion.findMany({
      select: { id: true, nombre: true, codigo: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ data: ubicaciones }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/ubicaciones]', error);
    return NextResponse.json(
      { error: 'Error al obtener ubicaciones', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
