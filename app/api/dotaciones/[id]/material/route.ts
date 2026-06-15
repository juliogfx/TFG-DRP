/**
 * GET    /api/dotaciones/:id/material
 * POST   /api/dotaciones/:id/material
 * DELETE /api/dotaciones/:id/material?asignacionId=X
 */
import { NextRequest, NextResponse } from 'next/server';
import { asignarMaterial, desasignarMaterial } from '@/lib/db/dotaciones';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const items = await prisma.asignacionMaterialDotacion.findMany({
      where: { dotacionId },
      select: {
        id: true,
        cantidad: true,
        observaciones: true,
        material: {
          select: {
            id: true, codigo: true, nombre: true,
            tipo: true, stockActual: true, esCritico: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/dotaciones/[id]/material]', error);
    return NextResponse.json({ error: 'Error al obtener material' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const body = await request.json();
    if (!body.materialId || !body.cantidad || body.cantidad < 1) {
      return NextResponse.json(
        { error: 'materialId y cantidad (≥1) son obligatorios' },
        { status: 400 }
      );
    }
    const item = await asignarMaterial(dotacionId, body.materialId, body.cantidad, body.observaciones);
    return NextResponse.json({ data: item, message: 'Material asignado' }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg.includes('ya asignado') ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const dotacionId = parseId(context.params);
  if (!dotacionId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const asignacionId = parseInt(searchParams.get('asignacionId') ?? '', 10);
  if (!asignacionId) {
    return NextResponse.json({ error: 'asignacionId es obligatorio' }, { status: 400 });
  }
  try {
    await desasignarMaterial(asignacionId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/dotaciones/[id]/material]', error);
    return NextResponse.json({ error: 'Error al quitar material' }, { status: 500 });
  }
}
