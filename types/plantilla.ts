/**
 * @file types/plantilla.ts
 * @description Tipos del módulo de Plantillas de evento (F1.3).
 *
 * Una PlantillaEvento es una receta reutilizable: contiene un conjunto
 * de PlantillaPosicion que, al aplicarse a un evento concreto, se clonan
 * como Posicion + Dotacion.
 */

export interface PlantillaListItem {
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
  numeroPosiciones: number;
}

export interface CreatePlantillaInput {
  nombre: string;
  codigoLoc: string;
  codigoEvt: string;
  codigoCtr: string;
  textoLibre: string;
  empresaId: number;
  tipoEventoId?: number | null;
  ubicacionId?: number | null;
  descripcion?: string | null;
}

export interface AplicarPlantillaInput {
  eventoId: number;
}

export interface AplicarPlantillaResult {
  eventoId: number;
  posicionesCreadas: number;
  dotacionesCreadas: number;
}
