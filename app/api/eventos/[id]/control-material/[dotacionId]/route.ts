/**
 * @file app/api/eventos/[id]/control-material/[dotacionId]/route.ts
 * @description PUT — actualiza control de material de una dotación (F1.7).
 *
 * El body es la representación completa del blob `ControlMaterialBlob`
 * más un array opcional `walkies` con los `devuelto` a aplicar sobre
 * AsignacionWalkie. Lo que no venga en el body queda null/sin cambiar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateControlMaterialDotacion } from '@/lib/db/control-material';
import type { UpdateControlMaterialInput } from '@/types/control-material';

export const dynamic = 'force-dynamic';

function parseId(p: string): number | null {
  const id = parseInt(p, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string; dotacionId: string } }
): Promise<NextResponse> {
  const eventoId = parseId(context.params.id);
  const dotacionId = parseId(context.params.dotacionId);
  if (!eventoId || !dotacionId) {
    return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
  }

  try {
    const body = await request.json() as UpdateControlMaterialInput;
    const data = await updateControlMaterialDotacion(dotacionId, body ?? {});
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: `No existe dotación con id ${dotacionId}` }, { status: 404 });
    }
    console.error(`[PUT /api/eventos/${eventoId}/control-material/${dotacionId}]`, error);
    return NextResponse.json(
      { error: 'Error al actualizar control de material', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
