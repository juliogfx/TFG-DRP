/**
 * @file types/fichaje.ts
 * @description Tipos para el módulo de Fichajes (F1.5).
 *
 * Un "fichaje" es la fila visible en la pantalla de control de
 * entrada/salida del personal de un evento. Está respaldado por
 * la tabla AsignacionPersonalDotacion — el "fichaje" añade campos
 * derivados (acreditado, llegadaTardia, etc.) que la UI necesita
 * pero que no se persisten.
 */

export type TipoIncorporacion = 'PLANTIO' | 'SERVICIO';

export interface FichajeItem {
  asignacionId: number;
  personaId: number;
  nombreCompleto: string;
  telefono: string | null;
  puesto: string;
  dotacionId: number;
  dotacionCodigo: string;
  listadoPlantio: boolean;
  incorporacion: TipoIncorporacion;
  asiste: boolean | null;
  turnoInicioPrev: string | null;
  turnoFinPrev: string | null;
  turnoInicioReal: string | null;
  turnoFinReal: string | null;
  observaciones: string | null;
  acreditado: boolean;
  faltaPrevia: boolean;
  llegadaTardia: boolean;
  salidaTardia: boolean;
  horas: number | null;
}

export interface UpdateFichajeInput {
  asiste?: boolean | null;
  turnoInicioReal?: string | null;
  turnoFinReal?: string | null;
  observaciones?: string | null;
}
