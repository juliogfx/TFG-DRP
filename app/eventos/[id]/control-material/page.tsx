/**
 * @file app/eventos/[id]/control-material/page.tsx
 * @description Pantalla de control de material por evento (F1.7).
 *
 * Sustituye las secciones de "asignar material" y "asignar walkies" de
 * /dotaciones/[id]. Una sola tabla por evento con todos los items
 * normalizados; persiste en Dotacion.controlMaterial (JSON).
 *
 * Modos:
 *   ENTREGA     → editables los números de identificación y cantidades.
 *   DEVOLUCIÓN  → editables los flags `devuelto`; lecturas el resto.
 *
 * Reglas:
 *   - Las dotaciones cuyo código empieza por "TANGO" (vehículos del
 *     promotor) solo muestran RECURSOS y PLAZAS, el resto vacío.
 *   - TºMin / TºMax solo se editan en la fila cuyo código sea "CL.AV.".
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type {
  ControlMaterialItem,
  UpdateControlMaterialInput,
  ItemConNumero,
  ItemSoloDevuelto,
  ItemCantidad,
} from '@/types/control-material';

type Modo = 'ENTREGA' | 'DEVOLUCION';

interface EventoMini { id: number; nombre: string; fecha: string }

function esTango(codigo: string): boolean {
  return codigo.toUpperCase().startsWith('TANGO');
}

export default function ControlMaterialPage() {
  const params = useParams<{ id: string }>();
  const eventoId = Number(params.id);

  const [evento, setEvento] = useState<EventoMini | null>(null);
  const [filas, setFilas] = useState<ControlMaterialItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>('ENTREGA');
  const [guardandoIds, setGuardandoIds] = useState<Set<number>>(new Set());

  const cargar = useCallback(async () => {
    if (!eventoId || Number.isNaN(eventoId)) return;
    setCargando(true);
    setError(null);
    try {
      const [resData, resEv] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/control-material`),
        fetch(`/api/eventos/${eventoId}`),
      ]);
      if (!resData.ok) throw new Error(`Error ${resData.status}`);
      const json = await resData.json();
      setFilas(json.data ?? []);
      if (resEv.ok) {
        const ev = await resEv.json();
        setEvento({ id: ev.data.id, nombre: ev.data.nombre, fecha: ev.data.fecha });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [eventoId]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Guardado optimista para una dotación. Construye el body con los
   *  campos actuales de la fila (manteniendo lo que no haya cambiado). */
  const guardar = useCallback(async (
    dotacionId: number,
    cambios: Partial<ControlMaterialItem>,
    anterior: ControlMaterialItem,
  ) => {
    setGuardandoIds((s) => new Set(s).add(dotacionId));
    const fusionado: ControlMaterialItem = { ...anterior, ...cambios };
    const body: UpdateControlMaterialInput = {
      eqMedDue:        fusionado.eqMedDue,
      botMed:          fusionado.botMed,
      botDue:          fusionado.botDue,
      monitor:         fusionado.monitor,
      balaO2:          fusionado.balaO2,
      ampularios:      fusionado.ampularios,
      morfico:         fusionado.morfico,
      collarines:      fusionado.collarines,
      carpetas:        fusionado.carpetas,
      tarjetas:        fusionado.tarjetas,
      partesRecibidos: fusionado.partesRecibidos,
      bat:             fusionado.bat,
      tempMin:         fusionado.tempMin,
      tempMax:         fusionado.tempMax,
      walkies:         fusionado.walkies.map((w) => ({ asignacionId: w.asignacionId, devuelto: w.devuelto })),
    };
    try {
      const res = await fetch(`/api/eventos/${eventoId}/control-material/${dotacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setFilas((prev) => prev.map((f) => f.dotacionId === dotacionId ? json.data : f));
    } catch (e) {
      setFilas((prev) => prev.map((f) => f.dotacionId === dotacionId ? anterior : f));
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardandoIds((s) => {
        const n = new Set(s);
        n.delete(dotacionId);
        return n;
      });
    }
  }, [eventoId]);

  function setLocal(dotacionId: number, parcial: Partial<ControlMaterialItem>) {
    setFilas((prev) => prev.map((f) => f.dotacionId === dotacionId ? { ...f, ...parcial } : f));
  }

  /** Cambia un campo numérico que estará en ENTREGA: número de id, cantidad, etc. */
  const enEntrega = modo === 'ENTREGA';
  const enDevolucion = modo === 'DEVOLUCION';

  return (
    <div>
      <div className="mb-4">
        <Link href="/eventos" className="text-sm text-slate-500 hover:text-slate-700">← Volver a eventos</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Control de material</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {evento ? `${evento.nombre} · ${new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-ES')}` : `Evento #${eventoId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Modo:</span>
          <button
            onClick={() => setModo('ENTREGA')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${enEntrega ? 'bg-blue-100 border-blue-300 text-blue-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            ENTREGA
          </button>
          <button
            onClick={() => setModo('DEVOLUCION')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${enDevolucion ? 'bg-green-100 border-green-300 text-green-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            DEVOLUCIÓN
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 ml-3">×</button>
        </div>
      )}

      {cargando && <div className="text-center py-12 text-slate-500">Cargando...</div>}

      {!cargando && filas.length === 0 && !error && (
        <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
          Sin dotaciones registradas en este evento.
        </p>
      )}

      {!cargando && filas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-2 py-2 font-medium text-slate-600 whitespace-nowrap">RECURSOS</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 whitespace-nowrap">INDIC.RADIO</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">PLAZAS</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 whitespace-nowrap">EQ.MED+DUE</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 whitespace-nowrap">BOT.MED</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 whitespace-nowrap">BOT.DUE</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">MONITOR</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">BALA O₂</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">AMPUL.</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">MORFICO</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">COLLAR.</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 whitespace-nowrap">WALKIES</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 whitespace-nowrap">CARPETAS</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">TARJETAS</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">PARTES REC.</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">BAT.</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">TºMIN</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 whitespace-nowrap">TºMAX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <FilaControlMaterial
                  key={f.dotacionId}
                  fila={f}
                  modo={modo}
                  guardando={guardandoIds.has(f.dotacionId)}
                  setLocal={setLocal}
                  guardar={guardar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3">
        TANGO = vehículos del Promotor (solo RECURSOS y PLAZAS). TºMin/TºMax solo aplican a CL.AV.
      </p>
    </div>
  );
}

interface FilaProps {
  fila: ControlMaterialItem;
  modo: Modo;
  guardando: boolean;
  setLocal: (id: number, parcial: Partial<ControlMaterialItem>) => void;
  guardar: (id: number, cambios: Partial<ControlMaterialItem>, anterior: ControlMaterialItem) => Promise<void>;
}

function FilaControlMaterial({ fila, modo, guardando, setLocal, guardar }: FilaProps) {
  const tango = esTango(fila.codigo);
  const enEntrega = modo === 'ENTREGA';
  const enDevolucion = modo === 'DEVOLUCION';
  // CL.AV. = Clínica Avanzada. En el enum TipoDotacion es 'AVANZADA';
  // 'CL.AV.' es nombre de posición (F1.2), no de dotación, por eso antes
  // la condición nunca era true y los inputs TºMin/TºMax no se renderizaban.
  const esClinicaAvanzada = fila.tipo === 'AVANZADA';

  function commit(cambios: Partial<ControlMaterialItem>) {
    const anterior = fila;
    setLocal(fila.dotacionId, cambios);
    guardar(fila.dotacionId, cambios, anterior);
  }

  // Helpers para tres tipos de items: con numero, solo devuelto, cantidad+devuelto.
  function CeldaConNumero({ valor, onChange }: { valor: ItemConNumero | null; onChange: (v: ItemConNumero | null) => void }) {
    if (tango) return <td className="px-2 py-1.5"></td>;
    return (
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <input
            type="text"
            defaultValue={valor?.numero ?? ''}
            disabled={!enEntrega}
            placeholder="—"
            onBlur={(e) => {
              const numero = e.target.value.trim();
              if (numero === (valor?.numero ?? '')) return;
              if (!numero) onChange(null);
              else onChange({ numero, devuelto: valor?.devuelto ?? false });
            }}
            className="w-[70px] border border-slate-200 rounded px-1 py-0.5 text-xs disabled:bg-slate-50 disabled:text-slate-500"
          />
          <input
            type="checkbox"
            checked={valor?.devuelto ?? false}
            disabled={!enDevolucion || !valor}
            title="DEV"
            onChange={(e) => valor && onChange({ ...valor, devuelto: e.target.checked })}
          />
        </div>
      </td>
    );
  }

  function CeldaSoloDev({ valor, onChange }: { valor: ItemSoloDevuelto | null; onChange: (v: ItemSoloDevuelto | null) => void }) {
    if (tango) return <td className="px-2 py-1.5 text-center"></td>;
    // En ENTREGA: muestra checkbox de "entregado" (toggle existencia).
    // En DEVOLUCIÓN: muestra checkbox de devuelto.
    const entregado = valor !== null;
    return (
      <td className="px-2 py-1.5 text-center">
        {enEntrega ? (
          <input
            type="checkbox"
            checked={entregado}
            onChange={(e) => onChange(e.target.checked ? { devuelto: false } : null)}
            title="Entregado"
          />
        ) : (
          <input
            type="checkbox"
            checked={valor?.devuelto ?? false}
            disabled={!valor}
            onChange={(e) => valor && onChange({ devuelto: e.target.checked })}
            title="DEV"
          />
        )}
      </td>
    );
  }

  function CeldaCantidadDev({ valor, onChange }: { valor: ItemCantidad | null; onChange: (v: ItemCantidad | null) => void }) {
    if (tango) return <td className="px-2 py-1.5"></td>;
    return (
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            defaultValue={valor?.cantidad ?? ''}
            disabled={!enEntrega}
            onBlur={(e) => {
              const v = e.target.value;
              if (v === '') { if (valor !== null) onChange(null); return; }
              const cantidad = parseInt(v, 10);
              if (!Number.isFinite(cantidad)) return;
              if (cantidad === (valor?.cantidad ?? -1)) return;
              onChange({ cantidad, devuelto: valor?.devuelto ?? false });
            }}
            className="w-[50px] border border-slate-200 rounded px-1 py-0.5 text-xs disabled:bg-slate-50 disabled:text-slate-500"
          />
          <input
            type="checkbox"
            checked={valor?.devuelto ?? false}
            disabled={!enDevolucion || !valor}
            title="DEV"
            onChange={(e) => valor && onChange({ ...valor, devuelto: e.target.checked })}
          />
        </div>
      </td>
    );
  }

  function CeldaNumero({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
    if (tango) return <td className="px-2 py-1.5 text-center"></td>;
    return (
      <td className="px-2 py-1.5 text-center">
        <input
          type="number"
          min={0}
          defaultValue={valor ?? ''}
          disabled={!enEntrega}
          onBlur={(e) => {
            const v = e.target.value;
            const nuevo = v === '' ? null : parseInt(v, 10);
            if (nuevo === valor) return;
            if (nuevo !== null && !Number.isFinite(nuevo)) return;
            onChange(nuevo);
          }}
          className="w-[60px] border border-slate-200 rounded px-1 py-0.5 text-xs text-center disabled:bg-slate-50 disabled:text-slate-500"
        />
      </td>
    );
  }

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${guardando ? 'opacity-70' : ''} ${tango ? 'bg-slate-50' : ''}`}>
      <td className="px-2 py-1.5 font-mono font-bold text-slate-900 whitespace-nowrap">{fila.codigo}</td>
      <td className="px-2 py-1.5 font-mono text-slate-700 whitespace-nowrap">{fila.indicativo ?? <span className="text-slate-300">—</span>}</td>
      <td className="px-2 py-1.5 text-center text-slate-700">{fila.plazas}</td>
      <td className="px-2 py-1.5">
        {tango ? null : (
          <input
            type="text"
            defaultValue={fila.eqMedDue ?? ''}
            disabled={!enEntrega}
            placeholder="—"
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v === (fila.eqMedDue ?? null)) return;
              commit({ eqMedDue: v });
            }}
            className="w-[90px] border border-slate-200 rounded px-1 py-0.5 text-xs disabled:bg-slate-50 disabled:text-slate-500"
          />
        )}
      </td>
      <CeldaConNumero    valor={fila.botMed}     onChange={(v) => commit({ botMed: v })} />
      <CeldaConNumero    valor={fila.botDue}     onChange={(v) => commit({ botDue: v })} />
      <CeldaSoloDev      valor={fila.monitor}    onChange={(v) => commit({ monitor: v })} />
      <CeldaSoloDev      valor={fila.balaO2}     onChange={(v) => commit({ balaO2: v })} />
      <CeldaSoloDev      valor={fila.ampularios} onChange={(v) => commit({ ampularios: v })} />
      <CeldaSoloDev      valor={fila.morfico}    onChange={(v) => commit({ morfico: v })} />
      <CeldaNumero       valor={fila.collarines} onChange={(v) => commit({ collarines: v })} />
      <td className="px-2 py-1.5">
        {tango ? null : (
          fila.walkies.length === 0 ? (
            <span className="text-slate-300 text-xs">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {fila.walkies.map((w) => (
                <label key={w.asignacionId} className="inline-flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5">
                  <span className="font-mono text-[10px]">{w.numero}</span>
                  <input
                    type="checkbox"
                    checked={w.devuelto}
                    disabled={!enDevolucion}
                    title="DEV"
                    onChange={(e) => {
                      const nuevoWalkies = fila.walkies.map((x) =>
                        x.asignacionId === w.asignacionId ? { ...x, devuelto: e.target.checked } : x
                      );
                      commit({ walkies: nuevoWalkies });
                    }}
                  />
                </label>
              ))}
            </div>
          )
        )}
      </td>
      <CeldaCantidadDev valor={fila.carpetas} onChange={(v) => commit({ carpetas: v })} />
      <CeldaNumero      valor={fila.tarjetas}        onChange={(v) => commit({ tarjetas: v })} />
      <CeldaNumero      valor={fila.partesRecibidos} onChange={(v) => commit({ partesRecibidos: v })} />
      <CeldaNumero      valor={fila.bat}             onChange={(v) => commit({ bat: v })} />
      <td className="px-2 py-1.5 text-center">
        {esClinicaAvanzada && !tango ? (
          <input
            type="number"
            step="0.1"
            defaultValue={fila.tempMin ?? ''}
            disabled={!enEntrega}
            onBlur={(e) => {
              const v = e.target.value;
              const n = v === '' ? null : Number(v);
              if (n !== null && !Number.isFinite(n)) return;
              if (n === fila.tempMin) return;
              commit({ tempMin: n });
            }}
            className="w-[60px] border border-slate-200 rounded px-1 py-0.5 text-xs text-center disabled:bg-slate-50 disabled:text-slate-500"
          />
        ) : null}
      </td>
      <td className="px-2 py-1.5 text-center">
        {esClinicaAvanzada && !tango ? (
          <input
            type="number"
            step="0.1"
            defaultValue={fila.tempMax ?? ''}
            disabled={!enEntrega}
            onBlur={(e) => {
              const v = e.target.value;
              const n = v === '' ? null : Number(v);
              if (n !== null && !Number.isFinite(n)) return;
              if (n === fila.tempMax) return;
              commit({ tempMax: n });
            }}
            className="w-[60px] border border-slate-200 rounded px-1 py-0.5 text-xs text-center disabled:bg-slate-50 disabled:text-slate-500"
          />
        ) : null}
      </td>
    </tr>
  );
}
