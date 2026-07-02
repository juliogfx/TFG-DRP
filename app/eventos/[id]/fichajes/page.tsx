/**
 * @file app/eventos/[id]/fichajes/page.tsx
 * @description Pantalla de fichajes / control entrada-salida (F1.5).
 *
 * Sustituye el bloque de asistencia individual de /dotaciones/[id]:
 * todo el personal del evento se ve y edita aquí en una sola tabla.
 *
 * Patrón de guardado: edición optimista por celda — al cambiar un
 * campo se actualiza el estado local inmediato y se envía PUT en
 * segundo plano. Si el PUT falla, se revierte y se muestra error.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { FichajeItem } from '@/types/fichaje';

interface EventoMini {
  id: number;
  nombre: string;
  fecha: string; // YYYY-MM-DD
}

function isoToHHmm(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convierte "HH:mm" a minutos-desde-medianoche. Devuelve null si la cadena
 * está vacía o no es un formato válido. Usado para comparar horas en la
 * misma unidad y calcular diferencias en tiempo real.
 */
function hhmmAMinutos(hhmm: string): number | null {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

/**
 * Compone un ISO 8601 a partir del fechaYYYYMMDD del evento y una hora
 * HH:mm. Si la hora es vacía devuelve null (interpretado como borrado).
 */
function hhmmAIso(fechaEvento: string, hhmm: string): string | null {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const d = new Date(`${fechaEvento}T00:00:00`);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

export default function FichajesEventoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = Number(params.id);

  const [evento, setEvento] = useState<EventoMini | null>(null);
  const [fichajes, setFichajes] = useState<FichajeItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroDotacion, setFiltroDotacion] = useState<number | 'TODAS'>('TODAS');
  const [guardandoIds, setGuardandoIds] = useState<Set<number>>(new Set());
  // Estado local de horas por plaza: qué muestra el input y sobre lo que se
  // recalculan LLEG. TARDÍA, SAL. TARDÍA y HORAS en tiempo real. La primera
  // carga inicializa cada plaza desde turnoInicioReal ?? turnoInicioPrev; a
  // partir de ahí solo se actualiza cuando el usuario tipea o cuando llega
  // una nueva fila del backend (no se sincroniza en cada save, para no pisar
  // ediciones en curso en otras filas).
  const [horasLocales, setHorasLocales] = useState<Record<number, { entrada: string; salida: string }>>({});

  const cargar = useCallback(async () => {
    if (!eventoId || Number.isNaN(eventoId)) return;
    setCargando(true);
    setError(null);
    try {
      const [resFich, resEv] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/fichajes`),
        fetch(`/api/eventos/${eventoId}`),
      ]);
      if (!resFich.ok) throw new Error(`Error ${resFich.status} cargando fichajes`);
      const jsonFich = await resFich.json();
      setFichajes(jsonFich.data ?? []);
      if (resEv.ok) {
        const jsonEv = await resEv.json();
        setEvento({ id: jsonEv.data.id, nombre: jsonEv.data.nombre, fecha: jsonEv.data.fecha });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [eventoId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Poblamos horasLocales solo con las filas nuevas — nunca sobrescribimos las
  // que ya están, para no pisar ediciones del usuario cuando fichajes cambia
  // por un save de otra fila.
  useEffect(() => {
    if (fichajes.length === 0) return;
    setHorasLocales((prev) => {
      let cambio = false;
      const next = { ...prev };
      for (const f of fichajes) {
        if (!(f.asignacionId in next)) {
          next[f.asignacionId] = {
            entrada: isoToHHmm(f.turnoInicioReal ?? f.turnoInicioPrev),
            salida: isoToHHmm(f.turnoFinReal ?? f.turnoFinPrev),
          };
          cambio = true;
        }
      }
      return cambio ? next : prev;
    });
  }, [fichajes]);

  /**
   * Persistencia optimista de un campo del fichaje. Actualiza local primero
   * y luego dispara el PUT. Si falla, revierte y muestra error.
   */
  const guardar = useCallback(async (
    asignacionId: number,
    cambios: Partial<{ asiste: boolean | null; turnoInicioReal: string | null; turnoFinReal: string | null; observaciones: string | null }>,
    anterior: FichajeItem,
  ) => {
    setGuardandoIds((s) => new Set(s).add(asignacionId));
    try {
      const res = await fetch(`/api/fichajes/${asignacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setFichajes((prev) => prev.map((f) => f.asignacionId === asignacionId ? json.data : f));
    } catch (e) {
      // Revertimos al estado anterior si el PUT falla.
      setFichajes((prev) => prev.map((f) => f.asignacionId === asignacionId ? anterior : f));
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardandoIds((s) => {
        const n = new Set(s);
        n.delete(asignacionId);
        return n;
      });
    }
  }, []);

  function setLocal(id: number, parcial: Partial<FichajeItem>) {
    setFichajes((prev) => prev.map((f) => f.asignacionId === id ? { ...f, ...parcial } : f));
  }

  const dotacionesDelEvento = useMemo(() => {
    const m = new Map<number, string>();
    fichajes.forEach((f) => m.set(f.dotacionId, f.dotacionCodigo));
    return Array.from(m.entries()).map(([id, codigo]) => ({ id, codigo })).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [fichajes]);

  const filtradas = filtroDotacion === 'TODAS'
    ? fichajes
    : fichajes.filter((f) => f.dotacionId === filtroDotacion);

  return (
    <div>
      <div className="mb-4">
        <Link href="/eventos" className="text-sm text-slate-500 hover:text-slate-700">← Volver a eventos</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fichajes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {evento ? `${evento.nombre} · ${new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-ES')}` : `Evento #${eventoId}`}
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-end gap-4">
        <div className="w-[260px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Dotación</label>
          <select
            value={filtroDotacion}
            onChange={(e) => setFiltroDotacion(e.target.value === 'TODAS' ? 'TODAS' : Number(e.target.value))}
            className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">TODAS LAS DOTACIONES</option>
            {dotacionesDelEvento.map((d) => (
              <option key={d.id} value={d.id}>{d.codigo}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-400 ml-auto">
          {filtradas.length} de {fichajes.length} personas
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 ml-3">×</button>
        </div>
      )}

      {cargando && <div className="text-center py-12 text-slate-500">Cargando...</div>}

      {!cargando && !error && filtradas.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
          Sin personal asignado a este evento.
        </p>
      )}

      {!cargando && filtradas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-center px-2 py-2 font-medium text-slate-600">LISTADO PLANTIO</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600">INCORP.</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600">DOTACIÓN</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600">NOMBRE Y APELLIDOS</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">ASISTE</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600">PUESTO</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600">OBSERV./ACREDIT.</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">ACRED.</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">FALTA PREVIA</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">H. ENTRADA</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">H. SALIDA</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">LLEG. TARDÍA</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">SAL. TARDÍA</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">HORAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map((f) => {
                const guardando = guardandoIds.has(f.asignacionId);
                const asisteNo = f.asiste === false;
                const fechaBase = evento?.fecha ?? new Date().toISOString().split('T')[0];
                const local = horasLocales[f.asignacionId] ?? { entrada: '', salida: '' };
                // Todos los cálculos derivados se hacen en minutos-de-día contra
                // el estado local (lo que se ve en el input), no contra el estado
                // del servidor. Así LLEG. TARDÍA, SAL. TARDÍA y HORAS se recalculan
                // en tiempo real mientras el usuario escribe.
                const entradaMin = hhmmAMinutos(local.entrada);
                const salidaMin = hhmmAMinutos(local.salida);
                const prevInicioMin = hhmmAMinutos(isoToHHmm(f.turnoInicioPrev));
                const prevFinMin = hhmmAMinutos(isoToHHmm(f.turnoFinPrev));
                // LLEG. TARDÍA: entrada > previsto + 10 min de gracia.
                const llegadaTardia = !asisteNo && entradaMin !== null && prevInicioMin !== null && entradaMin > prevInicioMin + 10;
                // SAL. TARDÍA: salida > previsto (sin gracia).
                const salidaTardia = !asisteNo && salidaMin !== null && prevFinMin !== null && salidaMin > prevFinMin;
                // HORAS = (salida - entrada) en horas, 2 decimales. Solo si el
                // rango es positivo (no cruzamos medianoche en el MVP).
                const horas = (() => {
                  if (asisteNo || entradaMin === null || salidaMin === null) return null;
                  const diff = salidaMin - entradaMin;
                  if (diff <= 0) return null;
                  return Math.round((diff / 60) * 100) / 100;
                })();

                return (
                  <tr key={f.asignacionId} className={`hover:bg-slate-50 transition-colors ${guardando ? 'opacity-70' : ''}`}>
                    <td className="px-2 py-1.5 text-center">
                      <input type="checkbox" checked={f.listadoPlantio} disabled />
                    </td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">{f.incorporacion}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">{f.dotacionCodigo}</td>
                    <td className="px-2 py-1.5 text-slate-900 truncate max-w-[200px]" title={f.nombreCompleto}>
                      {f.nombreCompleto}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={f.asiste === true}
                        onChange={(e) => {
                          const anterior = f;
                          const nuevo = e.target.checked ? true : false;
                          setLocal(f.asignacionId, { asiste: nuevo });
                          guardar(f.asignacionId, { asiste: nuevo }, anterior);
                        }}
                      />
                      {asisteNo && <span className="ml-1 text-red-600 font-semibold">FALTA</span>}
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">{f.puesto}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        defaultValue={f.observaciones ?? ''}
                        placeholder="ENTR.DD/M/AAAA AS.N"
                        onBlur={(e) => {
                          const nuevo = e.target.value || null;
                          if (nuevo === (f.observaciones ?? null)) return;
                          const anterior = f;
                          setLocal(f.asignacionId, { observaciones: nuevo });
                          guardar(f.asignacionId, { observaciones: nuevo }, anterior);
                        }}
                        className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">{f.acreditado ? '✅' : '❌'}</td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={f.faltaPrevia}
                        title="Persistido en observaciones — añadirá/quitará 'FALTA PREVIA' al texto."
                        onChange={(e) => {
                          const marcar = e.target.checked;
                          const existeObs = f.observaciones ?? '';
                          const yaTiene = /falta previa/i.test(existeObs);
                          let nuevoObs = existeObs;
                          if (marcar && !yaTiene) {
                            nuevoObs = existeObs ? `${existeObs} · FALTA PREVIA` : 'FALTA PREVIA';
                          } else if (!marcar && yaTiene) {
                            nuevoObs = existeObs.replace(/\s*·?\s*FALTA PREVIA/gi, '').trim();
                          } else {
                            return;
                          }
                          const anterior = f;
                          setLocal(f.asignacionId, { observaciones: nuevoObs, faltaPrevia: marcar });
                          guardar(f.asignacionId, { observaciones: nuevoObs }, anterior);
                        }}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {asisteNo ? (
                        <span className="text-red-600 text-[10px] font-semibold">FALTA</span>
                      ) : (
                        <input
                          type="time"
                          value={local.entrada}
                          onChange={(e) => {
                            const v = e.target.value;
                            setHorasLocales((prev) => ({
                              ...prev,
                              [f.asignacionId]: { ...(prev[f.asignacionId] ?? { entrada: '', salida: '' }), entrada: v },
                            }));
                          }}
                          onBlur={(e) => {
                            const nuevoHHmm = e.target.value;
                            const nuevoIso = nuevoHHmm ? hhmmAIso(fechaBase, nuevoHHmm) : null;
                            if (nuevoIso === (f.turnoInicioReal ?? null)) return;
                            const anterior = f;
                            setLocal(f.asignacionId, { turnoInicioReal: nuevoIso });
                            guardar(f.asignacionId, { turnoInicioReal: nuevoIso }, anterior);
                          }}
                          className="w-[90px] border border-slate-200 rounded px-1 py-0.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {asisteNo ? (
                        <span className="text-red-600 text-[10px] font-semibold">FALTA</span>
                      ) : (
                        <input
                          type="time"
                          value={local.salida}
                          onChange={(e) => {
                            const v = e.target.value;
                            setHorasLocales((prev) => ({
                              ...prev,
                              [f.asignacionId]: { ...(prev[f.asignacionId] ?? { entrada: '', salida: '' }), salida: v },
                            }));
                          }}
                          onBlur={(e) => {
                            const nuevoHHmm = e.target.value;
                            const nuevoIso = nuevoHHmm ? hhmmAIso(fechaBase, nuevoHHmm) : null;
                            if (nuevoIso === (f.turnoFinReal ?? null)) return;
                            const anterior = f;
                            setLocal(f.asignacionId, { turnoFinReal: nuevoIso });
                            guardar(f.asignacionId, { turnoFinReal: nuevoIso }, anterior);
                          }}
                          className="w-[90px] border border-slate-200 rounded px-1 py-0.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {llegadaTardia ? <span className="text-orange-600 font-bold">⚠</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {salidaTardia ? <span className="text-orange-600 font-bold">⚠</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center font-semibold text-slate-700">
                      {horas !== null ? horas.toFixed(2) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
