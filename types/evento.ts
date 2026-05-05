/**
 * @file types/evento.ts
 * @description Tipos TypeScript compartidos para el módulo de Eventos.
 *
 * Define las interfaces de entrada (inputs de API) y salida (respuestas JSON)
 * para las operaciones CRUD sobre Evento. Estas interfaces son el contrato
 * entre las API routes y las funciones de acceso a BD en lib/db/eventos.ts.
 *
 * No importar desde @prisma/client aquí — los tipos de Prisma solo se usan
 * en lib/db/. Este fichero es importable desde cualquier capa (cliente o servidor).
 */

export interface EventoListItem {
  id: number;
  nombre: string;
  fecha: string;
  ubicacion: { id: number; nombre: string; codigo: string; };
  tipoEvento: { id: number; nombre: string; codigo: string; } | null;
  rival: string | null;
  aforoPrevisto: number | null;
  temporada: string | null;
  numeroDotaciones: number;
}

export interface EventoDetalle {
  id: number;
  nombre: string;
  fecha: string;
  ubicacion: { id: number; nombre: string; codigo: string; direccion: string; aforoMaximo: number | null; };
  tipoEvento: { id: number; nombre: string; codigo: string; } | null;
  rival: string | null;
  aforoPrevisto: number | null;
  aforoEstimado: number | null;
  temporada: string | null;
  empresaPromotor: { id: number; nombre: string; codigo: string; } | null;
  empresaContratada: { id: number; nombre: string; codigo: string; } | null;
  directorMedico: string | null;
  observaciones: string | null;
  horaIncorporacionSspp: string | null;
  horaFinalizacionSspp: string | null;
  dotaciones: { id: number; codigo: string; tipo: string; estado: string; personalMinimo: number; }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventoInput {
  nombre: string;
  ubicacionId: number;
  fecha: string;
  tipoEventoId?: number;
  rival?: string;
  aforoPrevisto?: number;
  temporada?: string;
  empresaPromotorId?: number;
  empresaContratadaId?: number;
  directorMedico?: string;
  observaciones?: string;
}

export interface UpdateEventoInput {
  nombre?: string;
  ubicacionId?: number;
  fecha?: string;
  tipoEventoId?: number;
  rival?: string;
  aforoPrevisto?: number;
  aforoEstimado?: number;
  temporada?: string;
  empresaPromotorId?: number;
  empresaContratadaId?: number;
  directorMedico?: string;
  observaciones?: string;
  horaIncorporacionSspp?: string;
  horaFinalizacionSspp?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  detail?: string;
}
