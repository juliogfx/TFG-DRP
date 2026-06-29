/**
 * @file app/api/eventos/[id]/fichajes/route.ts
 * @description Endpoint colección de fichajes de un evento (F1.5).
 *
 *   GET /api/eventos/:id/fichajes → Lista FichajeItem[] de todo el
 *   personal asignado al evento, ordenado por dotación → nombre.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFichajesByEvento } from '@/lib/db/fichajes';

export const dynamic = 'force-dynamic';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  const eventoId = parseId(context.params);
  if (!eventoId) return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
  try {
    const fichajes = await getFichajesByEvento(eventoId);
    return NextResponse.json({ data: fichajes }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/eventos/${eventoId}/fichajes]`, error);
    return NextResponse.json(
      { error: 'Error al obtener fichajes', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
