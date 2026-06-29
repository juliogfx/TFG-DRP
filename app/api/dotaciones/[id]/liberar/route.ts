/**
 * @file app/api/dotaciones/[id]/liberar/route.ts
 * @description Libera una dotación a CL0_DISPONIBLE (F2.1).
 *
 * No cierra ninguna intervención asociada — el estado de la dotación y
 * el estado de la intervención son independientes. La UCO puede liberar
 * la dotación (regresa a posición) y dejar la intervención abierta para
 * trasladarla a otra dotación más adelante.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDotacionById } from '@/lib/db/dotaciones';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function PUT(
  _request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const id = parseId(context.params);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const actual = await prisma.dotacion.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, estado: true },
    });
    if (!actual) {
      return NextResponse.json({ error: `Dotación ${id} no encontrada` }, { status: 404 });
    }

    await prisma.dotacion.update({
      where: { id },
      data: { estado: 'CL0_DISPONIBLE' },
    });

    const detalle = await getDotacionById(id);
    return NextResponse.json({ data: detalle, message: 'Dotación liberada (CL0)' }, { status: 200 });
  } catch (error) {
    console.error(`[PUT /api/dotaciones/${context.params.id}/liberar]`, error);
    return NextResponse.json(
      { error: 'Error al liberar dotación', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
