/**
 * @file types/intervencion.ts
 * @description Tipos TypeScript para el módulo de Intervenciones.
 */

export type GravedadIntervencion = 'LEVE' | 'MODERADA' | 'GRAVE' | 'CRITICA';

export type EstadoIntervencion = 'PENDIENTE_DOTACION' | 'EN_CURSO' | 'CERRADA';

export type ResolucionIntervencion =
  | 'ALTA_EN_LUGAR'
  | 'TRASLADO_CLINICA'
  | 'ALTA_EN_CLINICA'
  | 'TRASLADO_HOSPITALARIO';

export interface IntervencionListItem {
  id: number;
  numeroIntervencion: number;
  horaAviso: string | null;
  horaLlegada: string | null;
  horaFinal: string | null;
  gravedad: GravedadIntervencion;
  estado: EstadoIntervencion;
  uco: string;
  sector: string | null;
  lugar: string | null;
  resolucion: ResolucionIntervencion | null;
  parte: string | null;
  sintomatologia: { id: number; tipo: string } | null;
  dotacionActiva: { id: number; codigo: string; tipo: string } | null;
  dotacionApoyo: { id: number; codigo: string } | null;
  dotacionTraslado: { id: number; codigo: string } | null;
  altaEnLugar: boolean;
  trasladoClinica: boolean;
  altaEnClinica: boolean;
  trasladoHospital: boolean;
  hospitalDestino: string | null;
  abierta: boolean;
}

export interface CreateIntervencionInput {
  eventoId: number;
  dotacionActivaId?: number | null;
  sintomatologiaId: number;
  gravedad: GravedadIntervencion;
  uco?: string;
  sector?: string | null;
  lugar?: string | null;
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
  dotacionActivaId?: number | null;
  sintomatologiaId?: number;
  gravedad?: GravedadIntervencion;
  uco?: string;
  sector?: string | null;
  lugar?: string | null;
  resolucion?: ResolucionIntervencion | null;
  parte?: string | null;
  horaAviso?: string | null;
  horaLlegada?: string | null;
  horaFinal?: string | null;
  dotacionApoyoId?: number | null;
  altaEnLugar?: boolean;
  trasladoClinica?: boolean;
  altaEnClinica?: boolean;
  trasladoHospital?: boolean;
  hospitalDestino?: string | null;
  dotacionTrasladoId?: number | null;
  observaciones?: string | null;
}
