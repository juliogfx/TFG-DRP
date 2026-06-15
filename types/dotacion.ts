/**
 * @file types/dotacion.ts
 * @description Tipos TypeScript compartidos para el módulo de Dotaciones y Personal.
 *
 * Define las interfaces de entrada y salida para las operaciones CRUD sobre
 * Dotacion y AsignacionPersonalDotacion. Estas interfaces son el contrato
 * entre las API routes y las funciones de acceso a BD en lib/db/dotaciones.ts.
 *
 * No importar desde @prisma/client aquí — los tipos de Prisma solo se usan
 * en lib/db/. Este fichero es importable desde cualquier capa.
 */

export type EstadoDotacion = 'DISPONIBLE' | 'EN_INTERVENCION' | 'NO_OPERATIVA';
export type TipoDotacion = 'AMBULANCIA' | 'BOTIQUIN' | 'UVI' | 'SVB' | 'CLINICA' | 'AVANZADA' | 'BANQUILLO' | 'LIMA' | 'UCO_UNIT';
export type TipoPersona = 'VOLUNTARIO' | 'FACULTATIVO';

export interface DotacionListItem {
  id: number;
  codigo: string;
  tipo: TipoDotacion;
  estado: EstadoDotacion;
  personalMinimo: number;
  indicativo: string | null;
  numeroPersonasAsignadas: number;
  posicion: { id: number; nombre: string; sector: string | null; } | null;
  evento: { id: number; nombre: string; fecha: string; };
}

export interface AsignacionPersonalItem {
  id: number;
  rolEnDotacion: string;
  turnoInicioPrev: string | null;
  turnoFinPrev: string | null;
  asiste: boolean | null;
  persona: {
    id: number;
    nombreCompleto: string;
    tipo: TipoPersona;
    titulacion: string | null;
    telefono: string | null;
  };
}

export interface DotacionDetalle extends DotacionListItem {
  indicativo: string | null;
  numDues: number;
  personal: AsignacionPersonalItem[];
  evento: {
    id: number;
    nombre: string;
    fecha: string;
    horaIncorporacionSspp: string | null;
    horaFinalizacionSspp: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PersonaListItem {
  id: number;
  nombreCompleto: string;
  tipo: TipoPersona;
  titulacion: string | null;
  telefono: string | null;
  activo: boolean;
}

export interface CreateDotacionInput {
  eventoId: number;
  codigo: string;
  tipo: TipoDotacion;
  personalMinimo: number;
  indicativo?: string;
  posicionId?: number;
}

export interface UpdateDotacionInput {
  codigo?: string;
  tipo?: TipoDotacion;
  estado?: EstadoDotacion;
  personalMinimo?: number;
  indicativo?: string;
  posicionId?: number;
}

export interface CreateAsignacionInput {
  personaId: number;
  rolEnDotacion: string;
  turnoInicioPrev?: string;
  turnoFinPrev?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  detail?: string;
}
