/**
 * @file lib/db/control-material.ts
 * @description Acceso a BD para Control de Material por evento (F1.7).
 */

import { prisma } from '@/lib/db/prisma';
import type {
  ControlMaterialItem,
  ControlMaterialBlob,
  UpdateControlMaterialInput,
  WalkieEntrega,
} from '@/types/control-material';

/** Devuelve el blob persistido en Dotacion.controlMaterial. Acepta null
 *  o cualquier valor histórico no estructurado y lo convierte a {}. */
function leerBlob(raw: unknown): ControlMaterialBlob {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as ControlMaterialBlob;
}

export async function getControlMaterialByEvento(eventoId: number): Promise<ControlMaterialItem[]> {
  const dotaciones = await prisma.dotacion.findMany({
    where: { eventoId, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      indicativo: true,
      personalMinimo: true,
      controlMaterial: true,
      walkies: {
        where: { devuelto: false }, // walkies activos en este evento
        select: {
          id: true,
          devuelto: true,
          walkie: { select: { numero: true } },
        },
      },
    },
    orderBy: { codigo: 'asc' },
  });

  // También necesitamos los walkies ya devueltos para mostrarlos como
  // "entregados pero devueltos". Para MVP solo mostramos los no devueltos
  // (devuelto=false) — al pasar a modo DEVOLUCIÓN el UCO marca el flag
  // y el walkie desaparece de futuras cargas. Si quieres ver los devueltos
  // también, quitar el filtro arriba.

  return dotaciones.map((d): ControlMaterialItem => {
    const blob = leerBlob(d.controlMaterial);
    const walkies: WalkieEntrega[] = d.walkies.map((w) => ({
      asignacionId: w.id,
      numero: w.walkie.numero,
      devuelto: w.devuelto,
    }));
    return {
      dotacionId: d.id,
      codigo: d.codigo,
      tipo: d.tipo as string,
      indicativo: d.indicativo,
      plazas: d.personalMinimo,
      eqMedDue: blob.eqMedDue ?? null,
      botMed: blob.botMed ?? null,
      botDue: blob.botDue ?? null,
      monitor: blob.monitor ?? null,
      balaO2: blob.balaO2 ?? null,
      ampularios: blob.ampularios ?? null,
      morfico: blob.morfico ?? null,
      collarines: blob.collarines ?? null,
      walkies,
      carpetas: blob.carpetas ?? null,
      tarjetas: blob.tarjetas ?? null,
      partesRecibidos: blob.partesRecibidos ?? null,
      bat: blob.bat ?? null,
      tempMin: blob.tempMin ?? null,
      tempMax: blob.tempMax ?? null,
    };
  });
}

/**
 * Actualiza el control de material de una dotación.
 *   - Persiste el blob completo en `controlMaterial` (estrategia "replace":
 *     el cliente envía la representación íntegra deseada).
 *   - Aplica updates puntuales de `devuelto` sobre AsignacionWalkie según
 *     `walkies` venga en el input.
 */
export async function updateControlMaterialDotacion(
  dotacionId: number,
  input: UpdateControlMaterialInput,
): Promise<ControlMaterialItem> {
  const existe = await prisma.dotacion.findUnique({ where: { id: dotacionId }, select: { id: true } });
  if (!existe) {
    const err: Error & { code?: string } = new Error(`No existe dotación con id ${dotacionId}`);
    err.code = 'P2025';
    throw err;
  }

  const { walkies, ...blob } = input;

  await prisma.$transaction(async (tx) => {
    await tx.dotacion.update({
      where: { id: dotacionId },
      // El JSON se reemplaza completamente — Prisma lo serializa tal cual.
      data: { controlMaterial: blob as object },
    });
    if (walkies && walkies.length > 0) {
      for (const w of walkies) {
        await tx.asignacionWalkie.update({
          where: { id: w.asignacionId },
          data: {
            devuelto: w.devuelto,
            fechaDevolucion: w.devuelto ? new Date() : null,
          },
        });
      }
    }
  });

  // Re-lee usando la lectura de una sola dotación (más simple que filtrar
  // por evento). Si esto se vuelve hot path, optimizar.
  const dot = await prisma.dotacion.findUniqueOrThrow({
    where: { id: dotacionId },
    select: {
      id: true, codigo: true, tipo: true, indicativo: true, personalMinimo: true,
      controlMaterial: true,
      walkies: {
        where: { devuelto: false },
        select: { id: true, devuelto: true, walkie: { select: { numero: true } } },
      },
    },
  });

  const finalBlob = leerBlob(dot.controlMaterial);
  return {
    dotacionId: dot.id,
    codigo: dot.codigo,
    tipo: dot.tipo as string,
    indicativo: dot.indicativo,
    plazas: dot.personalMinimo,
    eqMedDue: finalBlob.eqMedDue ?? null,
    botMed: finalBlob.botMed ?? null,
    botDue: finalBlob.botDue ?? null,
    monitor: finalBlob.monitor ?? null,
    balaO2: finalBlob.balaO2 ?? null,
    ampularios: finalBlob.ampularios ?? null,
    morfico: finalBlob.morfico ?? null,
    collarines: finalBlob.collarines ?? null,
    walkies: dot.walkies.map((w): WalkieEntrega => ({
      asignacionId: w.id,
      numero: w.walkie.numero,
      devuelto: w.devuelto,
    })),
    carpetas: finalBlob.carpetas ?? null,
    tarjetas: finalBlob.tarjetas ?? null,
    partesRecibidos: finalBlob.partesRecibidos ?? null,
    bat: finalBlob.bat ?? null,
    tempMin: finalBlob.tempMin ?? null,
    tempMax: finalBlob.tempMax ?? null,
  };
}
