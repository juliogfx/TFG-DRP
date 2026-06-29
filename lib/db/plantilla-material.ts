/**
 * @file lib/db/plantilla-material.ts
 * @description F1.4 — Plantillas de material estándar por TipoDotacion.
 *
 * Cada tipo de dotación lleva un material estándar confirmado por los
 * usuarios DRP. Al crear una dotación o al aplicar una plantilla de
 * evento, se pre-rellena el campo `controlMaterial` (JSONB en Dotacion,
 * ver F1.7) con la propuesta correspondiente al tipo.
 *
 * El pre-relleno es una PROPUESTA — el coordinador puede modificar los
 * valores después desde /eventos/[id]/control-material.
 *
 * DELTA es la única excepción: su material varía según el enfermero
 * asignado, así que devolvemos `null` para que el llamador no toque
 * `controlMaterial`.
 */

import type { TipoDotacion } from '@prisma/client';
import type { ControlMaterialBlob } from '@/types/control-material';

/**
 * Devuelve el blob parcial de `controlMaterial` propuesto para el tipo
 * dado. Devuelve `null` para DELTA (sin plantilla).
 *
 * Los campos vacíos (botMed.numero="", botDue.numero="") los rellena el
 * UCO en modo ENTREGA. El flag `devuelto=false` indica "entregado pero
 * aún no devuelto" — es lo que la UI necesita para mostrar el item.
 *
 * `carpetas.cantidad` por defecto: 2 para AMBULANCIA/UVI (el spec dice
 * "2 con ambulancia, 1 resto"), 1 para BANQUILLO/AVANZADA, 0 para los
 * demás (no llevan).
 */
export function getMaterialEstandarParaTipo(tipo: TipoDotacion): Partial<ControlMaterialBlob> | null {
  switch (tipo) {
    case 'UVI':
      return {
        botDue:     { numero: '', devuelto: false },
        // B.OX.MED ≈ Botiquín de oxígeno/medicación → reutiliza botMed
        botMed:     { numero: '', devuelto: false },
        balaO2:     { devuelto: false },
        ampularios: { devuelto: false },
        morfico:    { devuelto: false },
        monitor:    { devuelto: false },
        carpetas:   { cantidad: 2, devuelto: false },
      };

    case 'AMBULANCIA':
    case 'SVB':
      return {
        // B.Básico ≈ Botiquín de medicación básica → botMed
        botMed:   { numero: '', devuelto: false },
        botDue:   { numero: '', devuelto: false },
        carpetas: { cantidad: 2, devuelto: false },
      };

    case 'AVANZADA':
      return {
        botDue:     { numero: '', devuelto: false },
        botMed:     { numero: '', devuelto: false },
        balaO2:     { devuelto: false },
        ampularios: { devuelto: false },
        morfico:    { devuelto: false },
        monitor:    { devuelto: false },
        carpetas:   { cantidad: 1, devuelto: false },
        // Control de temperatura: la UI permite editarlos, los inicializamos
        // a null para que aparezcan en modo edición.
        tempMin:    null,
        tempMax:    null,
      };

    case 'CLINICA':
      return {
        botDue:     { numero: '', devuelto: false },
        ampularios: { devuelto: false },
        carpetas:   { cantidad: 1, devuelto: false },
      };

    case 'BANQUILLO':
      return {
        botDue:     { numero: '', devuelto: false },
        botMed:     { numero: '', devuelto: false },
        balaO2:     { devuelto: false },
        ampularios: { devuelto: false },
        morfico:    { devuelto: false },
        monitor:    { devuelto: false },
        carpetas:   { cantidad: 1, devuelto: false },
      };

    case 'BOTIQUIN':
      return {
        botMed:   { numero: '', devuelto: false },
        carpetas: { cantidad: 1, devuelto: false },
      };

    case 'UCO_UNIT':
      // UCO no lleva material médico, solo walkies (que se gestionan
      // aparte vía AsignacionWalkie). Devolvemos blob vacío para que la
      // dotación tenga JSON inicializado y la UI sepa diferenciarla de
      // "sin propuesta" (null = DELTA).
      return {};

    case 'LIMA':
      // Logística: sin material médico estándar — blob vacío.
      return {};

    // DELTA no está en el enum TipoDotacion (no existe como tipo de
    // dotación independiente), pero por completitud lo dejamos aquí.
    // Si en el futuro se añade al enum, devolver null para indicar
    // "sin plantilla — material variable según enfermero".
    default:
      return {};
  }
}

/**
 * Detector de dotaciones DELTA. En el catálogo actual DELTA no es un
 * TipoDotacion sino un Puesto. Para identificar una dotación DELTA hay
 * que mirar el código (las posiciones DELTA1/DELTA2 generan dotaciones
 * con esos códigos), o bien el puesto asociado.
 */
export function esDotacionDelta(codigo: string): boolean {
  return codigo.toUpperCase().startsWith('DELTA');
}
