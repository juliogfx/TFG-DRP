/**
 * @file lib/db/plazas.ts
 * @description Opción B — Acceso a datos para PlazaDotacion y DimensionamientoEvento.
 *
 * Convive con lib/db/dotaciones.ts (asignación de personal "vieja"). Las plazas
 * son un modelo más cercano al parte operativo: una dotación tiene N huecos
 * numerados, cada uno con rol requerido, persona asignada e incorporación.
 */

import { prisma } from '@/lib/db/prisma';
import type { TipoDotacion } from '@prisma/client';
import { tipoDotacionDeNombre, plantillaPlazasPorTipo } from '@/lib/db/plantillas';
import { getMaterialEstandarParaTipo, esDotacionDelta } from '@/lib/db/plantilla-material';

export interface PlazaItem {
  id: number;
  numero: number;
  nombre: string;
  rolRequerido: string | null;
  incorporacion: string | null;
  observaciones: string | null;
  persona: {
    id: number;
    nombreCompleto: string;
    tipo: string;
    titulacion: string | null;
  } | null;
}

export interface PlazasDeDotacion {
  dotacion: {
    id: number;
    codigo: string;
    tipo: TipoDotacion;
    indicativo: string | null;
    posicion: { id: number; nombre: string; zona: string | null } | null;
  };
  plazas: PlazaItem[];
}

export interface DimensionamientoFila {
  id: number | null;
  dotacionId: number | null;
  nombre: string;
  zona: string | null;
  incluida: boolean;
  med: number;
  due: number;
  cond: number;
  tec: number;
  socTec: number;
  otr: number;
  vehiculo: boolean;
  camillas: number;
  silla: boolean;
  bBasico: number;
  bDue: number;
  bOxMed: number;
  oxig: number;
  ampul: number;
  morfico: number;
  monitor: boolean;
  pPantalla: number;
  portatil: number;
  observ: string | null;
}

const plazaSelect = {
  id: true,
  numero: true,
  nombre: true,
  rolRequerido: true,
  incorporacion: true,
  observaciones: true,
  persona: {
    select: {
      id: true,
      nombreCompleto: true,
      tipo: true,
      titulacion: { select: { nombre: true } },
    },
  },
} as const;

function serializarPlaza(p: {
  id: number;
  numero: number;
  nombre: string;
  rolRequerido: string | null;
  incorporacion: string | null;
  observaciones: string | null;
  persona: { id: number; nombreCompleto: string; tipo: string; titulacion: { nombre: string } | null } | null;
}): PlazaItem {
  return {
    id: p.id,
    numero: p.numero,
    nombre: p.nombre,
    rolRequerido: p.rolRequerido,
    incorporacion: p.incorporacion,
    observaciones: p.observaciones,
    persona: p.persona ? {
      id: p.persona.id,
      nombreCompleto: p.persona.nombreCompleto,
      tipo: p.persona.tipo,
      titulacion: p.persona.titulacion?.nombre ?? null,
    } : null,
  };
}

/**
 * Devuelve las plazas de una dotación, ordenadas por número.
 */
export async function getPlazasByDotacion(dotacionId: number): Promise<PlazaItem[]> {
  const plazas = await prisma.plazaDotacion.findMany({
    where: { dotacionId },
    select: plazaSelect,
    orderBy: { numero: 'asc' },
  });
  return plazas.map(serializarPlaza);
}

/**
 * Devuelve todas las plazas del evento agrupadas por dotación.
 */
export async function getPlazasByEvento(eventoId: number): Promise<PlazasDeDotacion[]> {
  const dotaciones = await prisma.dotacion.findMany({
    where: { eventoId, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      indicativo: true,
      posicion: { select: { id: true, nombre: true, zona: true } },
      plazas: { select: plazaSelect, orderBy: { numero: 'asc' } },
    },
    orderBy: { codigo: 'asc' },
  });

  return dotaciones.map((d) => ({
    dotacion: {
      id: d.id,
      codigo: d.codigo,
      tipo: d.tipo,
      indicativo: d.indicativo,
      posicion: d.posicion,
    },
    plazas: d.plazas.map(serializarPlaza),
  }));
}

/**
 * Actualiza una plaza concreta (persona asignada, rol o incorporación).
 * Pasar personaId=null para desasignar.
 */
export async function updatePlaza(
  plazaId: number,
  input: { personaId?: number | null; rolRequerido?: string | null; incorporacion?: string | null; observaciones?: string | null }
): Promise<PlazaItem> {
  const data: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(input, 'personaId')) data.personaId = input.personaId;
  if (Object.prototype.hasOwnProperty.call(input, 'rolRequerido')) data.rolRequerido = input.rolRequerido;
  if (Object.prototype.hasOwnProperty.call(input, 'incorporacion')) data.incorporacion = input.incorporacion;
  if (Object.prototype.hasOwnProperty.call(input, 'observaciones')) data.observaciones = input.observaciones;

  const plaza = await prisma.plazaDotacion.update({
    where: { id: plazaId },
    data,
    select: plazaSelect,
  });
  return serializarPlaza(plaza);
}

/**
 * Devuelve el dimensionamiento del evento. Si todavía no se ha guardado,
 * devuelve una fila a 0 por cada dotación existente.
 */
export async function getDimensionamientoByEvento(eventoId: number): Promise<DimensionamientoFila[]> {
  const filas = await prisma.dimensionamientoEvento.findMany({
    where: { eventoId },
    orderBy: { id: 'asc' },
  });

  // Mezclamos con la lista completa de dotaciones del evento para que cualquier
  // dotación creada después de la primera grabación aparezca con valores a 0.
  const dotaciones = await prisma.dotacion.findMany({
    where: { eventoId, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      posicion: { select: { zona: true } },
    },
    orderBy: { codigo: 'asc' },
  });

  const guardadasPorDotacion = new Map<number, typeof filas[number]>();
  for (const f of filas) {
    if (f.dotacionId !== null) guardadasPorDotacion.set(f.dotacionId, f);
  }

  const resultado: DimensionamientoFila[] = dotaciones.map((d) => {
    const guardada = guardadasPorDotacion.get(d.id);
    if (guardada) {
      return {
        id: guardada.id,
        dotacionId: guardada.dotacionId,
        nombre: guardada.nombre,
        zona: d.posicion?.zona ?? null,
        incluida: guardada.incluida,
        med: guardada.med,
        due: guardada.due,
        cond: guardada.cond,
        tec: guardada.tec,
        socTec: guardada.socTec,
        otr: guardada.otr,
        vehiculo: guardada.vehiculo,
        camillas: guardada.camillas,
        silla: guardada.silla,
        bBasico: guardada.bBasico,
        bDue: guardada.bDue,
        bOxMed: guardada.bOxMed,
        oxig: guardada.oxig,
        ampul: guardada.ampul,
        morfico: guardada.morfico,
        monitor: guardada.monitor,
        pPantalla: guardada.pPantalla,
        portatil: guardada.portatil,
        observ: guardada.observ,
      };
    }
    return {
      id: null,
      dotacionId: d.id,
      nombre: d.codigo,
      zona: d.posicion?.zona ?? null,
      incluida: true,
      med: 0, due: 0, cond: 0, tec: 0, socTec: 0, otr: 0,
      vehiculo: false, camillas: 0, silla: false,
      bBasico: 0, bDue: 0, bOxMed: 0, oxig: 0, ampul: 0, morfico: 0,
      monitor: false, pPantalla: 0, portatil: 0,
      observ: null,
    };
  });

  // Filas guardadas que ya no tienen dotación (dotación borrada): mantenerlas.
  for (const f of filas) {
    if (f.dotacionId === null || !dotaciones.some((d) => d.id === f.dotacionId)) {
      resultado.push({
        id: f.id,
        dotacionId: f.dotacionId,
        nombre: f.nombre,
        zona: null,
        incluida: f.incluida,
        med: f.med, due: f.due, cond: f.cond, tec: f.tec, socTec: f.socTec, otr: f.otr,
        vehiculo: f.vehiculo, camillas: f.camillas, silla: f.silla,
        bBasico: f.bBasico, bDue: f.bDue, bOxMed: f.bOxMed,
        oxig: f.oxig, ampul: f.ampul, morfico: f.morfico,
        monitor: f.monitor, pPantalla: f.pPantalla, portatil: f.portatil,
        observ: f.observ,
      });
    }
  }

  return resultado;
}

export interface DimensionamientoInputFila {
  dotacionId?: number | null;
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
 * Reemplaza el dimensionamiento del evento por el conjunto enviado.
 * Operación atómica: borra todo lo previo y crea los nuevos registros.
 */
export async function saveDimensionamientoEvento(
  eventoId: number,
  filas: DimensionamientoInputFila[]
): Promise<DimensionamientoFila[]> {
  await prisma.$transaction(async (tx) => {
    await tx.dimensionamientoEvento.deleteMany({ where: { eventoId } });
    if (filas.length === 0) return;
    await tx.dimensionamientoEvento.createMany({
      data: filas.map((f) => ({
        eventoId,
        dotacionId: f.dotacionId ?? null,
        nombre: f.nombre,
        incluida: f.incluida ?? true,
        med: f.med ?? 0,
        due: f.due ?? 0,
        cond: f.cond ?? 0,
        tec: f.tec ?? 0,
        socTec: f.socTec ?? 0,
        otr: f.otr ?? 0,
        vehiculo: f.vehiculo ?? false,
        camillas: f.camillas ?? 0,
        silla: f.silla ?? false,
        bBasico: f.bBasico ?? 0,
        bDue: f.bDue ?? 0,
        bOxMed: f.bOxMed ?? 0,
        oxig: f.oxig ?? 0,
        ampul: f.ampul ?? 0,
        morfico: f.morfico ?? 0,
        monitor: f.monitor ?? false,
        pPantalla: f.pPantalla ?? 0,
        portatil: f.portatil ?? 0,
        observ: f.observ ?? null,
      })),
    });
  });
  return getDimensionamientoByEvento(eventoId);
}

/**
 * Confirma el dimensionamiento del evento: para cada fila marcada como
 * incluida=true crea (si no existe ya) una Dotacion + sus PlazaDotacion.
 * Si la dotación ya existe, actualiza `personalMinimo` con el total RRHH
 * calculado. Devuelve el nº de dotaciones y plazas creadas.
 *
 * No borra dotaciones existentes aunque estén marcadas como incluida=false
 * en el dimensionamiento — la eliminación es una acción explícita del
 * coordinador desde la pantalla de dotaciones.
 */
export async function confirmarDimensionamientoEvento(
  eventoId: number,
): Promise<{ dotacionesCreadas: number; plazasCreadas: number }> {
  const filas = await prisma.dimensionamientoEvento.findMany({
    where: { eventoId, incluida: true },
    orderBy: { id: 'asc' },
  });

  const dotacionesExistentes = await prisma.dotacion.findMany({
    where: { eventoId, deletedAt: null },
    select: { id: true, codigo: true },
  });
  const idPorCodigo = new Map(dotacionesExistentes.map((d) => [d.codigo, d.id]));

  let dotacionesCreadas = 0;
  let plazasCreadas = 0;

  await prisma.$transaction(async (tx) => {
    for (const f of filas) {
      const personalMinimo = f.med + f.due + f.cond + f.tec + f.socTec + f.otr;
      const idExistente = idPorCodigo.get(f.nombre);

      if (idExistente !== undefined) {
        await tx.dotacion.update({
          where: { id: idExistente },
          data: { personalMinimo },
        });
        await tx.dimensionamientoEvento.update({
          where: { id: f.id },
          data: { dotacionId: idExistente },
        });
        continue;
      }

      const tipo: TipoDotacion = tipoDotacionDeNombre(f.nombre);
      const propuestaMaterial = esDotacionDelta(f.nombre)
        ? null
        : getMaterialEstandarParaTipo(tipo);
      const nuevaDot = await tx.dotacion.create({
        data: {
          eventoId,
          codigo: f.nombre,
          tipo,
          personalMinimo,
          estado: 'CL0_DISPONIBLE',
          ...(propuestaMaterial !== null && { controlMaterial: propuestaMaterial as object }),
        },
        select: { id: true },
      });
      dotacionesCreadas++;

      const { numPlazas, roles } = plantillaPlazasPorTipo(tipo);
      for (let numero = 1; numero <= numPlazas; numero++) {
        await tx.plazaDotacion.create({
          data: {
            dotacionId: nuevaDot.id,
            numero,
            nombre: `${f.nombre}-${numero}`,
            rolRequerido: roles[numero] ?? null,
          },
        });
        plazasCreadas++;
      }

      await tx.dimensionamientoEvento.update({
        where: { id: f.id },
        data: { dotacionId: nuevaDot.id },
      });
    }
  });

  return { dotacionesCreadas, plazasCreadas };
}
