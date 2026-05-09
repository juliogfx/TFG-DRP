/**
 * @file app/api/tipos-evento/route.ts
 * @description API Route de catálogo para TipoEventoCatalogo.
 *
 * Endpoint:
 *   GET /api/tipos-evento → Lista todos los tipos de evento activos
 *
 * Usado por los formularios de Evento para cargar el select de tipo.
 */

// Forzar renderizado dinámico — estos catálogos pueden cambiar sin redeploy
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/tipos-evento
 * Devuelve los tipos de evento activos ordenados por nombre.
 *
 * @returns 200 + array de { id, nombre, codigo }
 * @returns 500 + ApiError si falla la consulta
 */
export async function GET() {
  try {
    const tipos = await prisma.tipoEventoCatalogo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, codigo: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ data: tipos }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/tipos-evento]', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de evento', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
