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
import { getMaterialEstandarParaTipo, esDotacionDelta } from '@/lib/db/plantilla-material';

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
 * Opción B — Dimensionamiento persistido dentro de una plantilla.
 * Una fila por dotación; la unión con el dimensionamiento de evento se hace
 * por `nombre` (= código de dotación).
 */
export interface PlantillaDimFila {
  nombre: string;
  incluida?: boolean;
  med?: number; due?: number; cond?: number; tec?: number; socTec?: number; otr?: number;
  vehiculo?: boolean; camillas?: number; silla?: boolean;
  bBasico?: number; bDue?: number; bOxMed?: number;
  oxig?: number; ampul?: number; morfico?: number;
  monitor?: boolean; pPantalla?: number; portatil?: number;
  observ?: string | null;
}

/**
 * Devuelve las filas de dimensionamiento guardadas para una plantilla.
 */
export async function getDimensionamientoDePlantilla(plantillaId: number): Promise<PlantillaDimFila[]> {
  const filas = await prisma.plantillaDimensionamiento.findMany({
    where: { plantillaId },
    orderBy: { id: 'asc' },
  });
  return filas.map((f) => ({
    nombre: f.nombre,
    incluida: f.incluida,
    med: f.med, due: f.due, cond: f.cond, tec: f.tec, socTec: f.socTec, otr: f.otr,
    vehiculo: f.vehiculo, camillas: f.camillas, silla: f.silla,
    bBasico: f.bBasico, bDue: f.bDue, bOxMed: f.bOxMed,
    oxig: f.oxig, ampul: f.ampul, morfico: f.morfico,
    monitor: f.monitor, pPantalla: f.pPantalla, portatil: f.portatil,
    observ: f.observ,
  }));
}

/**
 * Reemplaza el dimensionamiento de una plantilla por el array recibido.
 * Operación atómica: borra todo lo previo y crea las filas nuevas.
 */
export async function saveDimensionamientoDePlantilla(
  plantillaId: number,
  filas: PlantillaDimFila[],
): Promise<number> {
  const plantilla = await prisma.plantillaEvento.findUnique({
    where: { id: plantillaId },
    select: { id: true },
  });
  if (!plantilla) {
    const err: Error & { code?: string } = new Error(`No existe plantilla con id ${plantillaId}`);
    err.code = 'P2025';
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.plantillaDimensionamiento.deleteMany({ where: { plantillaId } });
    if (filas.length === 0) return;
    await tx.plantillaDimensionamiento.createMany({
      data: filas.map((f) => ({
        plantillaId,
        nombre: f.nombre,
        incluida: f.incluida ?? true,
        med: f.med ?? 0, due: f.due ?? 0, cond: f.cond ?? 0, tec: f.tec ?? 0,
        socTec: f.socTec ?? 0, otr: f.otr ?? 0,
        vehiculo: f.vehiculo ?? false, camillas: f.camillas ?? 0, silla: f.silla ?? false,
        bBasico: f.bBasico ?? 0, bDue: f.bDue ?? 0, bOxMed: f.bOxMed ?? 0,
        oxig: f.oxig ?? 0, ampul: f.ampul ?? 0, morfico: f.morfico ?? 0,
        monitor: f.monitor ?? false, pPantalla: f.pPantalla ?? 0, portatil: f.portatil ?? 0,
        observ: f.observ ?? null,
      })),
    });
  });
  return filas.length;
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
      dimensionamiento: true,
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
      // F1.4 — pre-rellenar controlMaterial con la plantilla del tipo,
      // salvo DELTA (material variable según enfermero).
      const propuestaMaterial = esDotacionDelta(nombre)
        ? null
        : getMaterialEstandarParaTipo(tipo);
      await tx.dotacion.create({
        data: {
          eventoId,
          codigo: nombre,
          tipo,
          personalMinimo: pp.personalMinimo,
          posicionId: posicion.id,
          estado: 'CL0_DISPONIBLE',
          ...(propuestaMaterial !== null && { controlMaterial: propuestaMaterial as object }),
        },
      });
      dotacionesCreadas++;
    }

    // Opción B — si la plantilla tiene dimensionamiento guardado, copiarlo al evento.
    // Casamos por código de dotación (nombre de la fila == codigo de la dotación).
    if (plantilla.dimensionamiento.length > 0) {
      const dotacionesEvento = await tx.dotacion.findMany({
        where: { eventoId, deletedAt: null },
        select: { id: true, codigo: true },
      });
      const idPorCodigo = new Map(dotacionesEvento.map((d) => [d.codigo, d.id]));

      await tx.dimensionamientoEvento.createMany({
        data: plantilla.dimensionamiento.map((f) => ({
          eventoId,
          dotacionId: idPorCodigo.get(f.nombre) ?? null,
          nombre: f.nombre,
          incluida: f.incluida,
          med: f.med, due: f.due, cond: f.cond, tec: f.tec, socTec: f.socTec, otr: f.otr,
          vehiculo: f.vehiculo, camillas: f.camillas, silla: f.silla,
          bBasico: f.bBasico, bDue: f.bDue, bOxMed: f.bOxMed,
          oxig: f.oxig, ampul: f.ampul, morfico: f.morfico,
          monitor: f.monitor, pPantalla: f.pPantalla, portatil: f.portatil,
          observ: f.observ,
        })),
      });
    }
  });

  return { eventoId, posicionesCreadas, dotacionesCreadas };
}
