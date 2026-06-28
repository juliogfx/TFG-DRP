/**
 * @file types/intervencion.ts
 * @description Tipos TypeScript para el módulo de Intervenciones.
 */

export type GravedadIntervencion = 'LEVE' | 'MODERADA' | 'GRAVE' | 'CRITICA';

export interface IntervencionListItem {
  id: number;
  numeroIntervencion: number;
  horaAviso: string | null;
  horaLlegada: string | null;
  horaFinal: string | null;
  gravedad: GravedadIntervencion;
  sintomatologia: { id: number; tipo: string } | null;
  dotacionActiva: { id: number; codigo: string; tipo: string };
  dotacionApoyo: { id: number; codigo: string } | null;
  dotacionTraslado: { id: number; codigo: string } | null;
  altaEnLugar: boolean;
  trasladoClinica: boolean;
  trasladoHospital: boolean;
  hospitalDestino: string | null;
  abierta: boolean;
}

export interface CreateIntervencionInput {
  eventoId: number;
  dotacionActivaId: number;
  sintomatologiaId: number;
  gravedad: GravedadIntervencion;
  horaAviso?: string;
  horaLlegada?: string;
  horaFinal?: string;
  dotacionApoyoId?: number;
  altaEnLugar?: boolean;
  trasladoClinica?: boolean;
  trasladoHospital?: boolean;
  hospitalDestino?: string;
  dotacionTrasladoId?: number;
  observaciones?: string;
}

export interface SintomatologiaItem {
  id: number;
  tipo: string;
  descripcion: string | null;
}

export interface UpdateIntervencionInput {
  dotacionActivaId?: number;
  sintomatologiaId?: number;
  gravedad?: GravedadIntervencion;
  horaAviso?: string | null;
  horaLlegada?: string | null;
  horaFinal?: string | null;
  dotacionApoyoId?: number | null;
  altaEnLugar?: boolean;
  trasladoClinica?: boolean;
  trasladoHospital?: boolean;
  hospitalDestino?: string | null;
  dotacionTrasladoId?: number | null;
  observaciones?: string | null;
}
