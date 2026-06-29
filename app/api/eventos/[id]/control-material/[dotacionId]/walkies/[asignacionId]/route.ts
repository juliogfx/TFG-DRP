/**
 * @file app/api/eventos/[id]/control-material/[dotacionId]/walkies/[asignacionId]/route.ts
 * @description DELETE — quita la asignación de un walkie a una dotación (F1.7).
 *
 * Hard-delete pensado para correcciones en ENTREGA. El cierre normal en
 * DEVOLUCIÓN usa el flag `devuelto` del PUT global de la dotación.
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeWalkieAsignacion } from '@/lib/db/control-material';

export const dynamic = 'force-dynamic';

function parseId(p: string): number | null {
  const id = parseInt(p, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string; dotacionId: string; asignacionId: string } }
): Promise<NextResponse> {
  const eventoId = parseId(context.params.id);
  const dotacionId = parseId(context.params.dotacionId);
  const asignacionId = parseId(context.params.asignacionId);
  if (!eventoId || !dotacionId || !asignacionId) {
    return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
  }
  try {
    const data = await removeWalkieAsignacion(asignacionId, dotacionId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      const msg = error instanceof Error ? error.message : 'Asignación no encontrada';
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error(`[DELETE /api/eventos/${eventoId}/control-material/${dotacionId}/walkies/${asignacionId}]`, error);
    return NextResponse.json(
      { error: 'Error al quitar walkie', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
