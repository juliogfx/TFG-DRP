/**
 * @file types/uco.ts
 * @description Tipos TypeScript compartidos para el Dashboard UCO.
 *
 * Define las interfaces de salida del endpoint GET /api/uco/estado
 * y los tipos usados por la página del dashboard.
 *
 * El dashboard UCO es la pantalla operativa principal durante el evento:
 * muestra el estado en tiempo real de todas las dotaciones, el personal
 * asignado y los contadores globales de intervenciones.
 */

import type { EstadoDotacion, TipoDotacion } from '@/types/dotacion';

export interface DotacionEstado {
  id: number;
  codigo: string;
  tipo: TipoDotacion;
  estado: EstadoDotacion;
  personalMinimo: number;
  numeroPersonasAsignadas: number;
  indicativo: string | null;
  posicion: { id: number; nombre: string; sector: string | null; } | null;
  personal: {
    id: number;
    nombreCompleto: string;
    rolEnDotacion: string;
    tipo: 'VOLUNTARIO' | 'FACULTATIVO';
    telefono: string | null;
  }[];
}

export interface ContadoresEvento {
  totalIntervenciones: number;
  trasladosClinica: number;
  trasladosHospital: number;
  altasEnLugar: number;
}

export interface EstadoUCO {
  eventoId: number;
  nombreEvento: string;
  fechaEvento: string;
  actualizadoEn: string;
  dotaciones: DotacionEstado[];
  contadores: ContadoresEvento;
  resumen: {
    disponibles: number;
    enIntervencion: number;
    noOperativas: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  detail?: string;
}
