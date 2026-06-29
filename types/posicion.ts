/**
 * @file types/posicion.ts
 * @description Tipos TypeScript para el módulo de Posiciones (puntos físicos
 * dentro del recinto donde se ubican las dotaciones durante un evento).
 */

export type ZonaPosicion = 'PISTA' | 'GRADA' | 'OTRO';

export interface PosicionListItem {
  id: number;
  eventoId: number;
  nombre: string;
  codigoQr: string;
  puesto: { id: number; nombre: string };
  sector: string | null;
  zona: ZonaPosicion | null;
  componentesMinimo: number | null;
  componentesMaximo: number | null;
  tieneDotacion: boolean;
}

export interface CreatePosicionInput {
  nombre: string;
  puestoId: number;
  sector?: string | null;
  zona?: ZonaPosicion | null;
  componentesMinimo?: number | null;
  componentesMaximo?: number | null;
}

export interface UpdatePosicionInput {
  nombre?: string;
  puestoId?: number;
  sector?: string | null;
  zona?: ZonaPosicion | null;
  componentesMinimo?: number | null;
  componentesMaximo?: number | null;
}
