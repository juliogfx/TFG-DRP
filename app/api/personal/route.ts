/**
 * @file app/api/personal/route.ts
 * @description API Route de catálogo para Personal sanitario.
 *
 * Endpoint:
 *   GET /api/personal → Lista todo el personal activo disponible
 */

import { NextResponse } from 'next/server';
import { getPersonalDisponible } from '@/lib/db/dotaciones';
import type { ApiResponse, ApiError, PersonaListItem } from '@/types/dotacion';

/**
 * GET /api/personal
 * Devuelve todo el personal activo ordenado alfabéticamente.
 *
 * @returns 200 + ApiResponse<PersonaListItem[]>
 * @returns 500 + ApiError si falla la consulta
 */
export async function GET(): Promise<NextResponse<ApiResponse<PersonaListItem[]> | ApiError>> {
  try {
    const personal = await getPersonalDisponible();
    return NextResponse.json({ data: personal }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/personal]', error);
    return NextResponse.json(
      { error: 'Error al obtener el personal', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
