/**
 * @file app/api/sintomatologias/route.ts
 * @description API Route para el catálogo de sintomatologías.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const items = await prisma.sintomatologia.findMany({
      select: { id: true, tipo: true, descripcion: true },
      orderBy: { tipo: 'asc' },
    });
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/sintomatologias]', error);
    return NextResponse.json(
      { error: 'Error al obtener sintomatologías' },
      { status: 500 }
    );
  }
}
