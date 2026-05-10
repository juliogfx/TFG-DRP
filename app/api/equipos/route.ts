/**
 * @file app/api/equipos/route.ts
 * @description API Route de catálogo para EquipoCatalogo.
 *
 * Endpoint:
 *   GET /api/equipos → Lista todos los equipos activos ordenados por deporte y nombre
 *
 * Usado por los formularios de Evento para cargar los selects de
 * equipo local y equipo visitante en eventos deportivos.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Forzar renderizado dinámico — el catálogo puede cambiar sin redeploy
export const dynamic = 'force-dynamic';

/**
 * GET /api/equipos
 * Devuelve todos los equipos activos ordenados por deporte y nombre.
 *
 * @returns 200 + { data: { id, nombre, codigo, deporte }[] }
 * @returns 500 + ApiError si falla la consulta
 */
export async function GET() {
  try {
    const equipos = await prisma.equipoCatalogo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, codigo: true, deporte: true },
      orderBy: [{ deporte: 'asc' }, { nombre: 'asc' }],
    });
    return NextResponse.json({ data: equipos }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/equipos]', error);
    return NextResponse.json(
      { error: 'Error al obtener equipos', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
