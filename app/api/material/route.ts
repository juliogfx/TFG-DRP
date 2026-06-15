/**
 * GET /api/material
 * Devuelve todos los materiales activos para selects.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const materiales = await prisma.material.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        stockActual: true,
        esCritico: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ data: materiales }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/material]', error);
    return NextResponse.json(
      { error: 'Error al obtener materiales' },
      { status: 500 }
    );
  }
}
