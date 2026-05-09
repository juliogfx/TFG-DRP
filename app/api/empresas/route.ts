/**
 * @file app/api/empresas/route.ts
 * @description API Route de catálogo para Empresas.
 *
 * Endpoint:
 *   GET /api/empresas → Lista todas las empresas activas
 *
 * Usado por los formularios de Evento para cargar los selects
 * de empresa promotora y empresa contratada.
 */

// Forzar renderizado dinámico — estos catálogos pueden cambiar sin redeploy
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/empresas
 * Devuelve todas las empresas activas con su tipo para poder
 * filtrarlas en el formulario (PROMOTOR vs CONTRATADA).
 *
 * @returns 200 + array de { id, nombre, codigo, tipo }
 * @returns 500 + ApiError si falla la consulta
 */
export async function GET() {
  try {
    const empresas = await prisma.empresa.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, codigo: true, tipo: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ data: empresas }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/empresas]', error);
    return NextResponse.json(
      { error: 'Error al obtener empresas', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
