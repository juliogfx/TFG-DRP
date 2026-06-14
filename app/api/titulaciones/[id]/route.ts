/**
 * @file app/api/titulaciones/[id]/route.ts
 * @description API Route para operaciones sobre una titulación concreta.
 *
 * Endpoints:
 *   PUT    /api/titulaciones/:id → Actualiza nombre/descripcion/orden/activo
 *   DELETE /api/titulaciones/:id → Desactiva (soft-delete: activo=false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const body = await request.json();
    const titulacion = await prisma.titulacionCatalogo.update({
      where: { id },
      data: {
        ...(body.nombre?.trim() && { nombre: body.nombre.trim() }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion?.trim() || null }),
        ...(typeof body.orden === 'number' && { orden: body.orden }),
        ...(typeof body.activo === 'boolean' && { activo: body.activo }),
      },
      select: { id: true, nombre: true, descripcion: true, orden: true, activo: true },
    });
    return NextResponse.json({ data: titulacion }, { status: 200 });
  } catch (error) {
    console.error(`[PUT /api/titulaciones/${context.params.id}]`, error);
    return NextResponse.json({ error: 'Error al actualizar titulación' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    await prisma.titulacionCatalogo.update({
      where: { id },
      data: { activo: false },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[DELETE /api/titulaciones/${context.params.id}]`, error);
    return NextResponse.json({ error: 'Error al desactivar titulación' }, { status: 500 });
  }
}
