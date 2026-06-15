/**
 * GET /api/walkies?eventoId=X
 * Devuelve los walkies disponibles para asignar en un evento.
 * Un walkie está disponible si su estado es DISPONIBLE
 * o si fue asignado en este evento pero ya fue devuelto.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const eventoIdParam = searchParams.get('eventoId');
  if (!eventoIdParam) {
    return NextResponse.json({ error: 'eventoId es obligatorio' }, { status: 400 });
  }
  const eventoId = parseInt(eventoIdParam, 10);
  try {
    const walkies = await prisma.walkie.findMany({
      where: {
        OR: [
          { estado: 'DISPONIBLE' },
          { asignaciones: { some: { eventoId, devuelto: true } } },
        ],
      },
      select: { id: true, numero: true, estado: true },
      orderBy: { numero: 'asc' },
    });
    return NextResponse.json({ data: walkies }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/walkies]', error);
    return NextResponse.json({ error: 'Error al obtener walkies' }, { status: 500 });
  }
}
