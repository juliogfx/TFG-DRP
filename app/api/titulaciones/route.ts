/**
 * @file app/api/titulaciones/route.ts
 * @description API Route para el catálogo de titulaciones sanitarias.
 *
 * Endpoints:
 *   GET  /api/titulaciones  → Lista titulaciones activas ordenadas por orden asc
 *   POST /api/titulaciones  → Crea una titulación nueva
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const titulaciones = await prisma.titulacionCatalogo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, descripcion: true, orden: true, activo: true },
      orderBy: { orden: 'asc' },
    });
    return NextResponse.json({ data: titulaciones }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/titulaciones]', error);
    return NextResponse.json({ error: 'Error al obtener titulaciones' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    const titulacion = await prisma.titulacionCatalogo.create({
      data: {
        nombre: body.nombre.trim(),
        descripcion: body.descripcion?.trim() || null,
        orden: typeof body.orden === 'number' ? body.orden : 0,
        activo: true,
      },
      select: { id: true, nombre: true, descripcion: true, orden: true, activo: true },
    });
    return NextResponse.json({ data: titulacion, message: 'Titulación creada' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/titulaciones]', error);
    return NextResponse.json(
      { error: 'Error al crear titulación', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
