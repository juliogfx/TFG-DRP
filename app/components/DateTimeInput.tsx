/**
 * @file app/components/DateTimeInput.tsx
 * @description Wrapper sobre `<input type="datetime-local">` con confirmación explícita.
 *
 * Motivación: el datepicker nativo del navegador no expone un botón
 * "Aceptar". Este componente añade botones "Confirmar" / "Cancelar"
 * visibles solo cuando hay cambio pendiente. El valor se propaga al
 * padre únicamente al pulsar "Confirmar"; abandonar el campo o
 * pulsar "Cancelar" descarta el borrador.
 *
 * El componente acepta y emite siempre ISO 8601 — la conversión
 * a/desde el formato `datetime-local` ocurre internamente.
 */

'use client';

import { useEffect, useState } from 'react';

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface DateTimeInputProps {
  /** Valor guardado como ISO 8601 (o `null` / undefined si está vacío). */
  value: string | null | undefined;
  /** Se invoca SOLO al pulsar "Confirmar". Recibe ISO o `null`. */
  onChange: (value: string | null) => void;
  label?: string;
  disabled?: boolean;
}

export default function DateTimeInput({ value, onChange, label, disabled }: DateTimeInputProps) {
  const guardado = isoToDatetimeLocal(value);
  const [pending, setPending] = useState(guardado);

  // Si el padre cambia el valor (por ejemplo al abrir el modal con otra
  // intervención), sincronizamos el borrador para no mantener cambios viejos.
  useEffect(() => {
    setPending(guardado);
  }, [guardado]);

  const hayCambio = pending !== guardado;

  function confirmar() {
    onChange(datetimeLocalToIso(pending));
  }

  function cancelar() {
    setPending(guardado);
  }

  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>}
      <input
        type="datetime-local"
        value={pending}
        disabled={disabled}
        onChange={(e) => setPending(e.target.value)}
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hayCambio && !disabled && (
        <div className="flex gap-2 mt-1.5">
          <button
            type="button"
            onClick={confirmar}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={cancelar}
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
