/**
 * @file app/eventos/[id]/dimensionamiento/page.tsx
 * @description Opción B — Pantalla de dimensionamiento RRHH + RRMM por dotación.
 *
 * Tabla con una fila por dotación. Las filas se agrupan en PISTA / GRADA según
 * la zona de la posición asociada. Los totales se calculan en cliente. El
 * guardado se hace por lotes con el botón "Guardar todo" (POST que reemplaza
 * el conjunto). Cada fila tiene checkbox SI/NO; cuando se desmarca, los
 * inputs se atenúan y deshabilitan, pero los valores se conservan.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { EventoDetalle } from '@/types/evento';

interface Fila {
  id: number | null;
  dotacionId: number | null;
  nombre: string;
  zona: string | null;
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

function totalRRHH(f: Fila): number {
  return f.med + f.due + f.cond + f.tec + f.socTec + f.otr;
}

export default function DimensionamientoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = Number(params.id);

  const [filas, setFilas] = useState<Fila[]>([]);
  const [evento, setEvento] = useState<EventoDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!eventoId) return;
    setCargando(true);
    setError(null);
    try {
      const [resDim, resEv] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/dimensionamiento`),
        fetch(`/api/eventos/${eventoId}`),
      ]);
      if (!resDim.ok) throw new Error(`Error ${resDim.status} cargando dimensionamiento`);
      const jsonDim = await resDim.json();
      setFilas(jsonDim.data ?? []);
      if (resEv.ok) {
        const jsonEv = await resEv.json();
        setEvento(jsonEv.data ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [eventoId]);

  useEffect(() => { cargar(); }, [cargar]);

  function setCampo<K extends keyof Fila>(idx: number, key: K, valor: Fila[K]) {
    setFilas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: valor };
      return next;
    });
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/eventos/${eventoId}/dimensionamiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filas }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setFilas(json.data);
      setInfo('Dimensionamiento guardado correctamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarComoPlantilla() {
    setError(null);
    setInfo(null);
    if (!evento) {
      setError('No se ha podido cargar el evento — recarga la página.');
      return;
    }
    const empresa = evento.empresaContratada ?? evento.empresaPromotor;
    if (!empresa) {
      setError('El evento no tiene empresa contratada ni promotora. No se puede crear la plantilla.');
      return;
    }
    const nombreSugerido = `${evento.ubicacion.codigo}-${evento.tipoEvento?.codigo ?? 'GEN'}-${empresa.codigo}`;
    const nombre = window.prompt('Nombre de la plantilla (máx 20):', nombreSugerido);
    if (!nombre || !nombre.trim()) return;
    if (nombre.length > 20) {
      setError('El nombre supera los 20 caracteres.');
      return;
    }

    setGuardandoPlantilla(true);
    try {
      // 1) Crear la plantilla (códigos derivados del evento). Si ya existe el
      //    nombre, reutilizamos el id en lugar de fallar.
      const textoLibre = nombre.slice(0, 6) || 'NUEVO';
      const cuerpoPlantilla = {
        nombre: nombre.trim(),
        codigoLoc: evento.ubicacion.codigo,
        codigoEvt: evento.tipoEvento?.codigo ?? 'GEN',
        codigoCtr: empresa.codigo,
        textoLibre,
        empresaId: empresa.id,
        tipoEventoId: evento.tipoEvento?.id ?? null,
        ubicacionId: evento.ubicacion.id,
        descripcion: `Plantilla generada desde evento ${evento.nombre}`,
      };
      const resPlantilla = await fetch('/api/plantillas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoPlantilla),
      });

      let plantillaId: number;
      if (resPlantilla.ok) {
        const json = await resPlantilla.json();
        plantillaId = json.data.id;
      } else if (resPlantilla.status === 409) {
        // Reutilizar la existente con ese nombre.
        const lista = await (await fetch('/api/plantillas')).json();
        const existente = (lista.data ?? []).find((p: { id: number; nombre: string }) => p.nombre === nombre.trim());
        if (!existente) throw new Error('Conflicto con plantilla existente, pero no se ha localizado.');
        if (!window.confirm(`Ya existe una plantilla "${nombre}". ¿Sobrescribir su dimensionamiento?`)) {
          setGuardandoPlantilla(false);
          return;
        }
        plantillaId = existente.id;
      } else {
        const j = await resPlantilla.json().catch(() => ({}));
        throw new Error(j.error ?? `Error ${resPlantilla.status} creando plantilla`);
      }

      // 2) Guardar el dimensionamiento dentro de la plantilla. Enviamos solo
      //    los campos relevantes — nombre + valores.
      const filasParaPlantilla = filas.map((f) => ({
        nombre: f.nombre,
        incluida: f.incluida,
        med: f.med, due: f.due, cond: f.cond, tec: f.tec, socTec: f.socTec, otr: f.otr,
        vehiculo: f.vehiculo, camillas: f.camillas, silla: f.silla,
        bBasico: f.bBasico, bDue: f.bDue, bOxMed: f.bOxMed,
        oxig: f.oxig, ampul: f.ampul, morfico: f.morfico,
        monitor: f.monitor, pPantalla: f.pPantalla, portatil: f.portatil,
        observ: f.observ,
      }));
      const resDim = await fetch(`/api/plantillas/${plantillaId}/dimensionamiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filas: filasParaPlantilla }),
      });
      if (!resDim.ok) {
        const j = await resDim.json().catch(() => ({}));
        throw new Error(j.error ?? `Error ${resDim.status} guardando dimensionamiento de plantilla`);
      }

      setInfo(`Plantilla "${nombre.trim()}" guardada correctamente (${filasParaPlantilla.length} filas).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar plantilla');
    } finally {
      setGuardandoPlantilla(false);
    }
  }

  const pista = useMemo(() => filas.filter((f) => f.zona === 'PISTA'), [filas]);
  const grada = useMemo(() => filas.filter((f) => f.zona === 'GRADA'), [filas]);
  const otras = useMemo(() => filas.filter((f) => f.zona !== 'PISTA' && f.zona !== 'GRADA'), [filas]);

  function totalesSeccion(lista: Fila[]) {
    const tot = { med: 0, due: 0, cond: 0, tec: 0, socTec: 0, otr: 0, total: 0,
      camillas: 0, bBasico: 0, bDue: 0, bOxMed: 0, oxig: 0, ampul: 0, morfico: 0, pPantalla: 0, portatil: 0 };
    for (const f of lista) {
      if (!f.incluida) continue;
      tot.med += f.med; tot.due += f.due; tot.cond += f.cond; tot.tec += f.tec;
      tot.socTec += f.socTec; tot.otr += f.otr; tot.total += totalRRHH(f);
      tot.camillas += f.camillas; tot.bBasico += f.bBasico; tot.bDue += f.bDue;
      tot.bOxMed += f.bOxMed; tot.oxig += f.oxig; tot.ampul += f.ampul;
      tot.morfico += f.morfico; tot.pPantalla += f.pPantalla; tot.portatil += f.portatil;
    }
    return tot;
  }

  const totPista = totalesSeccion(pista);
  const totGrada = totalesSeccion(grada);
  const totOtras = totalesSeccion(otras);
  const totGeneral = totalesSeccion(filas);

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

  function renderSeccion(titulo: string, lista: Fila[], tot: ReturnType<typeof totalesSeccion>) {
    if (lista.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">{titulo}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((f) => {
                const idx = filas.indexOf(f);
                const rowCls = f.incluida ? '' : 'opacity-50';
                return (
                  <tr key={`${f.dotacionId ?? 'x'}-${f.nombre}`} className={`hover:bg-slate-50 ${rowCls}`}>
                    <td className="px-2 py-1.5 font-mono font-semibold text-slate-800">{f.nombre}</td>
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
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-semibold text-slate-800">
                <td className="px-2 py-2">TOTALES</td>
                <td></td>
                <td className="text-center">{tot.med}</td>
                <td className="text-center">{tot.due}</td>
                <td className="text-center">{tot.cond}</td>
                <td className="text-center">{tot.tec}</td>
                <td className="text-center">{tot.socTec}</td>
                <td className="text-center">{tot.otr}</td>
                <td className="text-center bg-slate-200">{tot.total}</td>
                {HEAD_RRMM_BOOL.map((h) => <td key={h.key}></td>)}
                <td className="text-center">{tot.camillas}</td>
                <td className="text-center">{tot.bBasico}</td>
                <td className="text-center">{tot.bDue}</td>
                <td className="text-center">{tot.bOxMed}</td>
                <td className="text-center">{tot.oxig}</td>
                <td className="text-center">{tot.ampul}</td>
                <td className="text-center">{tot.morfico}</td>
                <td className="text-center">{tot.pPantalla}</td>
                <td className="text-center">{tot.portatil}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/eventos" className="text-sm text-slate-500 hover:text-slate-700">← Volver a eventos</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dimensionamiento</h1>
          <p className="text-sm text-slate-500 mt-0.5">{evento?.nombre || `Evento #${eventoId}`}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={guardarComoPlantilla}
            disabled={guardando || guardandoPlantilla || cargando}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
          >
            {guardandoPlantilla ? 'Guardando plantilla…' : 'Guardar como plantilla'}
          </button>
          <button
            onClick={guardar}
            disabled={guardando || cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar dimensionamiento'}
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
          No hay dotaciones en este evento todavía.
        </p>
      ) : (
        <>
          {renderSeccion('PISTA', pista, totPista)}
          {renderSeccion('GRADA', grada, totGrada)}
          {otras.length > 0 && renderSeccion('SIN ZONA / OTRAS', otras, totOtras)}

          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 grid grid-cols-2 md:grid-cols-7 gap-3">
            <div><strong>TOTAL GENERAL</strong></div>
            <div>MED: {totGeneral.med}</div>
            <div>DUE: {totGeneral.due}</div>
            <div>COND: {totGeneral.cond}</div>
            <div>TEC: {totGeneral.tec}</div>
            <div>OTR: {totGeneral.otr + totGeneral.socTec}</div>
            <div><strong>TOTAL: {totGeneral.total}</strong></div>
          </div>
        </>
      )}
    </div>
  );
}
