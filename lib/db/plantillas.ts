/**
 * @file lib/db/plantillas.ts
 * @description Acceso a BD para el módulo de Plantillas de evento (F1.3).
 */

import { prisma } from '@/lib/db/prisma';
import type { TipoDotacion } from '@prisma/client';
import type {
  PlantillaListItem,
  CreatePlantillaInput,
  AplicarPlantillaResult,
} from '@/types/plantilla';

const plantillaSelect = {
  id: true,
  nombre: true,
  codigoLoc: true,
  codigoEvt: true,
  codigoCtr: true,
  textoLibre: true,
  descripcion: true,
  activa: true,
  ubicacion: { select: { id: true, nombre: true, codigo: true } },
  tipoEvento: { select: { id: true, nombre: true, codigo: true } },
  empresa: { select: { id: true, nombre: true, codigo: true } },
  posiciones: { select: { id: true } },
} as const;

function serializar(p: {
  id: number;
  nombre: string;
  codigoLoc: string;
  codigoEvt: string;
  codigoCtr: string;
  textoLibre: string;
  descripcion: string | null;
  activa: boolean;
  ubicacion: { id: number; nombre: string; codigo: string } | null;
  tipoEvento: { id: number; nombre: string; codigo: string } | null;
  empresa: { id: number; nombre: string; codigo: string };
  posiciones: { id: number }[];
}): PlantillaListItem {
  return {
    id: p.id,
    nombre: p.nombre,
    codigoLoc: p.codigoLoc,
    codigoEvt: p.codigoEvt,
    codigoCtr: p.codigoCtr,
    textoLibre: p.textoLibre,
    descripcion: p.descripcion,
    activa: p.activa,
    ubicacion: p.ubicacion,
    tipoEvento: p.tipoEvento,
    empresa: p.empresa,
    numeroPosiciones: p.posiciones.length,
  };
}

export async function getPlantillas(): Promise<PlantillaListItem[]> {
  const filas = await prisma.plantillaEvento.findMany({
    where: { activa: true },
    select: plantillaSelect,
    orderBy: { nombre: 'asc' },
  });
  return filas.map(serializar);
}

export async function createPlantilla(input: CreatePlantillaInput): Promise<PlantillaListItem> {
  const fila = await prisma.plantillaEvento.create({
    data: {
      nombre: input.nombre,
      codigoLoc: input.codigoLoc,
      codigoEvt: input.codigoEvt,
      codigoCtr: input.codigoCtr,
      textoLibre: input.textoLibre,
      empresaId: input.empresaId,
      tipoEventoId: input.tipoEventoId ?? null,
      ubicacionId: input.ubicacionId ?? null,
      descripcion: input.descripcion ?? null,
    },
    select: plantillaSelect,
  });
  return serializar(fila);
}

/**
 * Mapea un puesto a una TipoDotacion del enum. Para puestos que no
 * tienen mapeo 1:1 (DELTA, MIKE, PAPA, Z95, ZULU, Camilla, etc.) cae
 * a BOTIQUIN — la unidad asistencial genérica. CL.AV. se reconoce
 * mediante el nombre de la posición (no el puesto) para diferenciar
 * AVANZADA de CLINICA estándar.
 */
function tipoDotacionDePuesto(nombrePuesto: string, nombrePosicion: string | null): TipoDotacion {
  if (nombrePuesto === 'UVI Móvil' || nombrePuesto === 'MIKE') return 'UVI';
  if (nombrePuesto === 'Ambulancia')                           return 'AMBULANCIA';
  if (nombrePuesto === 'UCO')                                  return 'UCO_UNIT';
  if (nombrePuesto === 'Clínica de campaña') {
    return nombrePosicion === 'CL.AV.' ? 'AVANZADA' : 'CLINICA';
  }
  if (nombrePuesto === 'Banquillo') return 'BANQUILLO';
  if (nombrePuesto === 'SVB')       return 'SVB';
  if (nombrePuesto === 'LIMA')      return 'LIMA';
  return 'BOTIQUIN';
}

/**
 * Aplica una plantilla a un evento (F1.3). En una sola transacción:
 *   - Para cada PlantillaPosicion crea una Posicion en el evento
 *     (codigoQr = `${eventoId}-${nombreSugerido}`).
 *   - Para cada Posicion crea una Dotacion con el mismo nombre y tipo
 *     derivado del puesto. Estado inicial CL0_DISPONIBLE.
 *
 * Idempotencia: el codigoQr de Posicion es UNIQUE — si ya existe una
 * posición con ese codigoQr el create fallará. Por eso primero verifica
 * que el evento no tenga ya posiciones aplicadas.
 */
export async function aplicarPlantillaAEvento(
  plantillaId: number,
  eventoId: number,
): Promise<AplicarPlantillaResult> {
  const plantilla = await prisma.plantillaEvento.findUnique({
    where: { id: plantillaId },
    select: {
      id: true,
      posiciones: {
        select: {
          id: true,
          nombreSugerido: true,
          puestoId: true,
          personalMinimo: true,
          sector: true,
          puesto: { select: { nombre: true } },
        },
      },
    },
  });
  if (!plantilla) {
    const err: Error & { code?: string } = new Error(`No existe plantilla con id ${plantillaId}`);
    err.code = 'P2025';
    throw err;
  }

  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, deletedAt: null },
    select: { id: true, _count: { select: { posiciones: true, dotaciones: true } } },
  });
  if (!evento) {
    const err: Error & { code?: string } = new Error(`No existe evento con id ${eventoId}`);
    err.code = 'P2025';
    throw err;
  }
  if (evento._count.posiciones > 0 || evento._count.dotaciones > 0) {
    throw new Error(
      `El evento ${eventoId} ya tiene ${evento._count.posiciones} posiciones y ${evento._count.dotaciones} dotaciones. Aplicar plantilla a un evento vacío.`
    );
  }

  let posicionesCreadas = 0;
  let dotacionesCreadas = 0;

  await prisma.$transaction(async (tx) => {
    for (const pp of plantilla.posiciones) {
      const nombre = pp.nombreSugerido ?? `POS-${pp.id}`;
      const codigoQr = `${eventoId}-${nombre}`;

      // Determinar zona desde el sector (Pista/Grada) si está presente.
      let zona: string | null = null;
      if (pp.sector) {
        const s = pp.sector.toUpperCase();
        if (s.includes('PISTA')) zona = 'PISTA';
        else if (s.includes('GRADA')) zona = 'GRADA';
        else zona = 'OTRO';
      }

      const posicion = await tx.posicion.create({
        data: {
          eventoId,
          nombre,
          codigoQr,
          puestoId: pp.puestoId,
          sector: pp.sector,
          zona,
          componentesMinimo: pp.personalMinimo,
          componentesMaximo: 4,
        },
        select: { id: true },
      });
      posicionesCreadas++;

      const tipo = tipoDotacionDePuesto(pp.puesto.nombre, nombre);
      await tx.dotacion.create({
        data: {
          eventoId,
          codigo: nombre,
          tipo,
          personalMinimo: pp.personalMinimo,
          posicionId: posicion.id,
          estado: 'CL0_DISPONIBLE',
        },
      });
      dotacionesCreadas++;
    }
  });

  return { eventoId, posicionesCreadas, dotacionesCreadas };
}
