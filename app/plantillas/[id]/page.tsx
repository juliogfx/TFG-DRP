/**
 * @file app/plantillas/[id]/page.tsx
 * @description Detalle y edición de una plantilla.
 *
 * Muestra los datos básicos y la tabla de dimensionamiento persistida en
 * PlantillaDimensionamiento. Al guardar, reemplaza el conjunto vía
 * POST /api/plantillas/:id/dimensionamiento. Al eliminar, borra la
 * plantilla + posiciones + dimensionamiento.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PlantillaListItem } from '@/types/plantilla';

interface Fila {
  nombre: string;
  incluida: boolean;
  med: number; due: number; cond: number; tec: number; socTec: number; otr: number;
  vehiculo: boolean; camillas: number; silla: boolean;
  bBasico: number; bDue: number; bOxMed: number;
  oxig: number; ampul: number; morfico: number;
  monitor: boolean; pPantalla: number; portatil: number;
  observ: string | null;
}

const CAMPOS_RRHH = ['med', 'due', 'cond', 'tec', 'socTec', 'otr'] as const;
const HEAD_RRHH: Array<{ key: typeof CAMPOS_RRHH[number]; label: string }> = [
  { key: 'med',    label: 'MED' },
  { key: 'due',    label: 'DUE' },
  { key: 'cond',   label: 'COND' },
  { key: 'tec',    label: 'TEC' },
  { key: 'socTec', label: 'SOC/TEC' },
  { key: 'otr',    label: 'OTR' },
];
const HEAD_RRMM_INT: Array<{ key: keyof Fila; label: string }> = [
  { key: 'camillas',  label: 'CAMILLAS' },
  { key: 'bBasico',   label: 'B.BÁSICO' },
  { key: 'bDue',      label: 'B.DUE' },
  { key: 'bOxMed',    label: 'B.OX.MED' },
  { key: 'oxig',      label: 'OXÍG.' },
  { key: 'ampul',     label: 'AMPUL.' },
  { key: 'morfico',   label: 'MÓRFICO' },
  { key: 'pPantalla', label: 'P.PANTALLA' },
  { key: 'portatil',  label: 'PORTÁTIL' },
];
const HEAD_RRMM_BOOL: Array<{ key: keyof Fila; label: string }> = [
  { key: 'vehiculo', label: 'VEHÍCULO' },
  { key: 'silla',    label: 'SILLA' },
  { key: 'monitor',  label: 'MONITOR' },
];

function filaVacia(nombre: string): Fila {
  return {
    nombre,
    incluida: true,
    med: 0, due: 0, cond: 0, tec: 0, socTec: 0, otr: 0,
    vehiculo: false, camillas: 0, silla: false,
    bBasico: 0, bDue: 0, bOxMed: 0,
    oxig: 0, ampul: 0, morfico: 0,
    monitor: false, pPantalla: 0, portatil: 0,
    observ: null,
  };
}

function totalRRHH(f: Fila): number {
  return f.med + f.due + f.cond + f.tec + f.socTec + f.otr;
}

export default function PlantillaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const plantillaId = Number(params.id);

  const [plantilla, setPlantilla] = useState<PlantillaListItem | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!plantillaId) return;
    setCargando(true);
    setError(null);
    try {
      const [resPl, resDim] = await Promise.all([
        fetch(`/api/plantillas/${plantillaId}`),
        fetch(`/api/plantillas/${plantillaId}/dimensionamiento`),
      ]);
      if (!resPl.ok) throw new Error(`Error ${resPl.status} cargando plantilla`);
      if (!resDim.ok) throw new Error(`Error ${resDim.status} cargando dimensionamiento`);
      const jsonPl = await resPl.json();
      const jsonDim = await resDim.json();
      setPlantilla(jsonPl.data ?? null);
      const raw = (jsonDim.data ?? []) as Array<Partial<Fila> & { nombre: string }>;
      setFilas(raw.map((f) => ({ ...filaVacia(f.nombre), ...f, incluida: f.incluida ?? true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [plantillaId]);

  useEffect(() => { cargar(); }, [cargar]);

  function setCampo<K extends keyof Fila>(idx: number, key: K, valor: Fila[K]) {
    setFilas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: valor };
      return next;
    });
  }

  function añadirFila() {
    const nombre = window.prompt('Código de la nueva dotación (ej: UVI3, BANQ., CL.AV.):');
    if (!nombre || !nombre.trim()) return;
    if (filas.some((f) => f.nombre === nombre.trim())) {
      setError(`Ya existe una fila con nombre "${nombre.trim()}".`);
      return;
    }
    setFilas((prev) => [...prev, filaVacia(nombre.trim())]);
  }

  function eliminarFila(idx: number) {
    setFilas((prev) => prev.filter((_, i) => i !== idx));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/plantillas/${plantillaId}/dimensionamiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filas }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setInfo(`Dimensionamiento guardado (${json.data?.filasGuardadas ?? filas.length} filas).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarPlantilla() {
    if (!plantilla) return;
    const ok = window.confirm(
      `¿Eliminar la plantilla "${plantilla.nombre}"?\n\nSe borrarán también sus ${plantilla.numeroPosiciones} posiciones y ${plantilla.numeroFilasDim} filas de dimensionamiento. Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setBorrando(true);
    setError(null);
    try {
      const res = await fetch(`/api/plantillas/${plantillaId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      router.push('/plantillas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
      setBorrando(false);
    }
  }

  const totales = useMemo(() => {
    const t = { med: 0, due: 0, cond: 0, tec: 0, socTec: 0, otr: 0, total: 0,
      camillas: 0, bBasico: 0, bDue: 0, bOxMed: 0, oxig: 0, ampul: 0, morfico: 0, pPantalla: 0, portatil: 0 };
    for (const f of filas) {
      if (!f.incluida) continue;
      t.med += f.med; t.due += f.due; t.cond += f.cond; t.tec += f.tec;
      t.socTec += f.socTec; t.otr += f.otr; t.total += totalRRHH(f);
      t.camillas += f.camillas; t.bBasico += f.bBasico; t.bDue += f.bDue;
      t.bOxMed += f.bOxMed; t.oxig += f.oxig; t.ampul += f.ampul;
      t.morfico += f.morfico; t.pPantalla += f.pPantalla; t.portatil += f.portatil;
    }
    return t;
  }, [filas]);

  function renderInputNumero(idx: number, f: Fila, key: keyof Fila) {
    return (
      <input
        type="number"
        min={0}
        value={f[key] as number}
        disabled={!f.incluida}
        onChange={(e) => setCampo(idx, key, (e.target.value === '' ? 0 : Number(e.target.value)) as never)}
        className="w-14 border border-slate-300 rounded px-1 py-0.5 text-xs text-center disabled:bg-slate-100 disabled:text-slate-400"
      />
    );
  }

  function renderInputBool(idx: number, f: Fila, key: keyof Fila) {
    return (
      <input
        type="checkbox"
        checked={f[key] as boolean}
        disabled={!f.incluida}
        onChange={(e) => setCampo(idx, key, e.target.checked as never)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/plantillas" className="text-sm text-slate-500 hover:text-slate-700">← Volver a plantillas</Link>
      </div>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900 font-mono">
            {plantilla?.nombre ?? `Plantilla #${plantillaId}`}
          </h1>
          {plantilla?.descripcion && (
            <p className="text-sm text-slate-500 mt-1">{plantilla.descripcion}</p>
          )}
          {plantilla && (
            <div className="text-xs text-slate-500 mt-2 space-x-3">
              <span>Tipo: <b>{plantilla.tipoEvento?.nombre ?? '—'}</b></span>
              <span>Ubicación: <b>{plantilla.ubicacion?.nombre ?? '—'}</b></span>
              <span>Empresa: <b>{plantilla.empresa.nombre}</b></span>
              <span>Dotaciones activas: <b>{plantilla.numeroDotacionesActivas}</b></span>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={añadirFila}
            disabled={cargando || guardando}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
          >
            + Añadir fila
          </button>
          <button
            onClick={guardar}
            disabled={cargando || guardando || borrando}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            onClick={eliminarPlantilla}
            disabled={cargando || guardando || borrando}
            className="border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
          >
            {borrando ? 'Eliminando…' : 'Eliminar plantilla'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}
      {info && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-md mb-4">{info}</div>
      )}

      {cargando ? (
        <div className="text-center py-12 text-slate-500">Cargando…</div>
      ) : filas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
          Esta plantilla no tiene dimensionamiento aún. Pulsa <b>+ Añadir fila</b> para empezar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
              <tr>
                <th className="text-left px-2 py-2 font-medium text-slate-600">DOTACIÓN</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600">SI/NO</th>
                {HEAD_RRHH.map((h) => (
                  <th key={h.key} className="text-center px-2 py-2 font-medium text-slate-600">{h.label}</th>
                ))}
                <th className="text-center px-2 py-2 font-medium text-slate-700 bg-slate-100">TOTAL</th>
                {HEAD_RRMM_BOOL.map((h) => (
                  <th key={h.key} className="text-center px-2 py-2 font-medium text-slate-600">{h.label}</th>
                ))}
                {HEAD_RRMM_INT.map((h) => (
                  <th key={h.key} className="text-center px-2 py-2 font-medium text-slate-600">{h.label}</th>
                ))}
                <th className="text-left px-2 py-2 font-medium text-slate-600">OBSERV.</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f, idx) => {
                const rowCls = f.incluida ? '' : 'opacity-50';
                return (
                  <tr key={`${f.nombre}-${idx}`} className={`hover:bg-slate-50 ${rowCls}`}>
                    <td className="px-2 py-1.5 font-mono font-semibold text-slate-800">
                      <input
                        type="text"
                        value={f.nombre}
                        onChange={(e) => setCampo(idx, 'nombre', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs font-mono font-semibold"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={f.incluida}
                        onChange={(e) => setCampo(idx, 'incluida', e.target.checked)}
                      />
                    </td>
                    {CAMPOS_RRHH.map((k) => (
                      <td key={k} className="px-1 py-1.5 text-center">{renderInputNumero(idx, f, k)}</td>
                    ))}
                    <td className="px-2 py-1.5 text-center font-semibold text-slate-800 bg-slate-50">
                      {totalRRHH(f)}
                    </td>
                    {HEAD_RRMM_BOOL.map((h) => (
                      <td key={h.key} className="px-2 py-1.5 text-center">{renderInputBool(idx, f, h.key)}</td>
                    ))}
                    {HEAD_RRMM_INT.map((h) => (
                      <td key={h.key} className="px-1 py-1.5 text-center">{renderInputNumero(idx, f, h.key)}</td>
                    ))}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={f.observ ?? ''}
                        disabled={!f.incluida}
                        onChange={(e) => setCampo(idx, 'observ', e.target.value || null)}
                        maxLength={200}
                        className="w-32 border border-slate-300 rounded px-1 py-0.5 text-xs disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => eliminarFila(idx)}
                        className="text-red-500 hover:text-red-700 text-xs"
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-semibold text-slate-800">
                <td className="px-2 py-2">TOTALES (incluidas)</td>
                <td></td>
                <td className="text-center">{totales.med}</td>
                <td className="text-center">{totales.due}</td>
                <td className="text-center">{totales.cond}</td>
                <td className="text-center">{totales.tec}</td>
                <td className="text-center">{totales.socTec}</td>
                <td className="text-center">{totales.otr}</td>
                <td className="text-center bg-slate-200">{totales.total}</td>
                {HEAD_RRMM_BOOL.map((h) => <td key={h.key}></td>)}
                <td className="text-center">{totales.camillas}</td>
                <td className="text-center">{totales.bBasico}</td>
                <td className="text-center">{totales.bDue}</td>
                <td className="text-center">{totales.bOxMed}</td>
                <td className="text-center">{totales.oxig}</td>
                <td className="text-center">{totales.ampul}</td>
                <td className="text-center">{totales.morfico}</td>
                <td className="text-center">{totales.pPantalla}</td>
                <td className="text-center">{totales.portatil}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
