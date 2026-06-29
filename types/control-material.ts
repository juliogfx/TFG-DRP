/**
 * @file types/control-material.ts
 * @description Tipos del módulo Control de Material por evento (F1.7).
 *
 * Sustituye la asignación pieza-a-pieza por dotación. Persiste en
 * `Dotacion.controlMaterial` como JSON; los walkies siguen en la tabla
 * AsignacionWalkie. El modo ENTREGA/DEVOLUCIÓN solo afecta a la UI
 * (qué celdas son editables) — el backend no distingue.
 */

export interface ItemConNumero {
  numero: string;
  devuelto: boolean;
}

export interface ItemSoloDevuelto {
  devuelto: boolean;
}

export interface ItemCantidad {
  cantidad: number;
  devuelto: boolean;
}

/**
 * Estructura persistida en Dotacion.controlMaterial. Todos los campos
 * son opcionales — solo se guarda lo que el UCO haya rellenado.
 */
export interface ControlMaterialBlob {
  eqMedDue?: string | null;
  botMed?: ItemConNumero | null;
  botDue?: ItemConNumero | null;
  monitor?: ItemSoloDevuelto | null;
  balaO2?: ItemSoloDevuelto | null;
  ampularios?: ItemSoloDevuelto | null;
  morfico?: ItemSoloDevuelto | null;
  collarines?: number | null;
  carpetas?: ItemCantidad | null;
  tarjetas?: number | null;
  partesRecibidos?: number | null;
  bat?: number | null;
  tempMin?: number | null;
  tempMax?: number | null;
}

export interface WalkieEntrega {
  asignacionId: number;
  numero: string;
  devuelto: boolean;
}

/**
 * Forma de respuesta de GET /api/eventos/[id]/control-material:
 * una fila por dotación con todos los campos del control + walkies.
 */
export interface ControlMaterialItem {
  dotacionId: number;
  codigo: string;
  tipo: string;
  indicativo: string | null;
  plazas: number;
  eqMedDue: string | null;
  botMed: ItemConNumero | null;
  botDue: ItemConNumero | null;
  monitor: ItemSoloDevuelto | null;
  balaO2: ItemSoloDevuelto | null;
  ampularios: ItemSoloDevuelto | null;
  morfico: ItemSoloDevuelto | null;
  collarines: number | null;
  walkies: WalkieEntrega[];
  carpetas: ItemCantidad | null;
  tarjetas: number | null;
  partesRecibidos: number | null;
  bat: number | null;
  tempMin: number | null;
  tempMax: number | null;
}

/**
 * Body del PUT — espejo del blob persistido más el array de walkies
 * (cuyos `devuelto` se actualizan en AsignacionWalkie).
 */
export interface UpdateControlMaterialInput extends ControlMaterialBlob {
  walkies?: { asignacionId: number; devuelto: boolean }[];
}
