/**
 * GET   /api/dotaciones/:id/walkies
 * POST  /api/dotaciones/:id/walkies
 * PATCH /api/dotaciones/:id/walkies?asignacionId=X
 */
import { NextRequest, NextResponse } from 'next/server';
import { asignarWalkie, devolverWalkie } from '@/lib/db/dotaciones';
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
    const items = await prisma.asignacionWalkie.findMany({
      where: { dotacionId, devuelto: false },
      select: {
        id: true, devuelto: true,
        fechaAsignacion: true, fechaDevolucion: true,
        walkie: { select: { id: true, numero: true, estado: true } },
      },
      orderBy: { fechaAsignacion: 'asc' },
    });
    const serialized = items.map((i) => ({
      ...i,
      fechaAsignacion: i.fechaAsignacion.toISOString(),
      fechaDevolucion: i.fechaDevolucion?.toISOString() ?? null,
    }));
    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/dotaciones/[id]/walkies]', error);
    return NextResponse.json({ error: 'Error al obtener walkies' }, { status: 500 });
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
    if (!body.walkieId || !body.eventoId) {
      return NextResponse.json(
        { error: 'walkieId y eventoId son obligatorios' },
        { status: 400 }
      );
    }
    const item = await asignarWalkie(dotacionId, body.walkieId, body.eventoId);
    return NextResponse.json({ data: item, message: 'Walkie asignado' }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg.includes('ya asignado') ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
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
    await devolverWalkie(asignacionId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[PATCH /api/dotaciones/[id]/walkies]', error);
    return NextResponse.json({ error: 'Error al devolver walkie' }, { status: 500 });
  }
}
