/**
 * @file app/api/puestos/route.ts
 * @description Lista de Puestos del catálogo. Solo lectura — el catálogo se
 * gestiona desde seed. Lo usa el modal de Posiciones (F1.2) para poblar el
 * select de puesto al crear/editar una posición.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const puestos = await prisma.puesto.findMany({
      select: { id: true, nombre: true, requiereVehiculo: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ data: puestos }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/puestos]', error);
    return NextResponse.json(
      { error: 'Error al obtener puestos', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
