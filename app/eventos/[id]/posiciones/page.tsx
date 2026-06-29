/**
 * @file app/eventos/[id]/posiciones/page.tsx
 * @description Gestión de Posiciones de un evento (F1.2).
 *
 * Lista las posiciones del evento, permite filtrar por zona y crear/editar
 * con un modal compartido. El borrado se acepta solo si la posición no
 * tiene dotación asignada (la API devuelve 409 si la tiene).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PosicionListItem, ZonaPosicion } from '@/types/posicion';

interface PuestoItem { id: number; nombre: string; requiereVehiculo: boolean }

const ZONA_BADGE: Record<string, string> = {
  PISTA: 'bg-emerald-100 text-emerald-700',
  GRADA: 'bg-blue-100 text-blue-700',
  OTRO:  'bg-slate-100 text-slate-600',
};

const FORM_INICIAL = {
  nombre: '',
  puestoId: '' as number | '',
  sector: '',
  zona: '' as ZonaPosicion | '',
  componentesMinimo: '' as number | '',
  componentesMaximo: '' as number | '',
};

export default function PosicionesEventoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventoId = Number(params.id);

  const [posiciones, setPosiciones] = useState<PosicionListItem[]>([]);
  const [puestos, setPuestos] = useState<PuestoItem[]>([]);
  const [eventoNombre, setEventoNombre] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtroZona, setFiltroZona] = useState<'TODAS' | ZonaPosicion>('TODAS');

  // Modal nueva/editar
  const [modal, setModal] = useState<{ modo: 'nueva' } | { modo: 'editar'; id: number } | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    if (!eventoId || Number.isNaN(eventoId)) return;
    setCargando(true);
    setError(null);
    try {
      const [resPos, resPue, resEv] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/posiciones`),
        fetch('/api/puestos'),
        fetch(`/api/eventos/${eventoId}`),
      ]);
      if (!resPos.ok) throw new Error(`Error ${resPos.status} cargando posiciones`);
      const jsonPos = await resPos.json();
      const jsonPue = await resPue.json();
      setPosiciones(jsonPos.data ?? []);
      setPuestos(jsonPue.data ?? []);
      if (resEv.ok) {
        const jsonEv = await resEv.json();
        setEventoNombre(jsonEv.data?.nombre ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [eventoId]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirModalNueva() {
    setForm({ ...FORM_INICIAL, puestoId: puestos[0]?.id ?? '' });
    setErrorModal(null);
    setModal({ modo: 'nueva' });
  }

  function abrirModalEditar(p: PosicionListItem) {
    setForm({
      nombre: p.nombre,
      puestoId: p.puesto.id,
      sector: p.sector ?? '',
      zona: (p.zona ?? '') as ZonaPosicion | '',
      componentesMinimo: p.componentesMinimo ?? '',
      componentesMaximo: p.componentesMaximo ?? '',
    });
    setErrorModal(null);
    setModal({ modo: 'editar', id: p.id });
  }

  async function handleGuardar() {
    if (!modal) return;
    if (!form.nombre.trim()) return setErrorModal('El nombre es obligatorio.');
    if (!form.puestoId) return setErrorModal('Selecciona un puesto.');

    const body = {
      nombre: form.nombre.trim(),
      puestoId: Number(form.puestoId),
      sector: form.sector.trim() || null,
      zona: (form.zona || null) as ZonaPosicion | null,
      componentesMinimo: form.componentesMinimo === '' ? null : Number(form.componentesMinimo),
      componentesMaximo: form.componentesMaximo === '' ? null : Number(form.componentesMaximo),
    };

    setGuardando(true);
    try {
      const url = modal.modo === 'nueva'
        ? `/api/eventos/${eventoId}/posiciones`
        : `/api/posiciones/${modal.id}`;
      const method = modal.modo === 'nueva' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setModal(null);
      await cargar();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(p: PosicionListItem) {
    if (!window.confirm(`¿Eliminar la posición "${p.nombre}"?`)) return;
    setEliminando(p.id);
    try {
      const res = await fetch(`/api/posiciones/${p.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  }

  const filtradas = filtroZona === 'TODAS'
    ? posiciones
    : posiciones.filter((p) => p.zona === filtroZona);

  return (
    <div>
      <div className="mb-4">
        <Link href="/eventos" className="text-sm text-slate-500 hover:text-slate-700">← Volver a eventos</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Posiciones del recinto</h1>
          <p className="text-sm text-slate-500 mt-0.5">{eventoNombre || `Evento #${eventoId}`}</p>
        </div>
        <button
          onClick={abrirModalNueva}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nueva posición
        </button>
      </div>

      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-end gap-4">
        <div className="w-[180px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Zona</label>
          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value as typeof filtroZona)}
            className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas</option>
            <option value="PISTA">Pista</option>
            <option value="GRADA">Grada</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <span className="text-xs text-slate-400 ml-auto">
          {filtradas.length} de {posiciones.length} posiciones
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {cargando && <div className="text-center py-12 text-slate-500">Cargando...</div>}

      {!cargando && !error && (
        filtradas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
            {posiciones.length === 0
              ? 'Sin posiciones registradas en este evento.'
              : 'Ninguna posición coincide con el filtro.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Zona</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Puesto</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Comp. mín.</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Comp. máx.</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Sector</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Dotación</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{p.nombre}</td>
                    <td className="px-4 py-3">
                      {p.zona ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ZONA_BADGE[p.zona] ?? 'bg-slate-100 text-slate-600'}`}>
                          {p.zona}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.puesto.nombre}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{p.componentesMinimo ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{p.componentesMaximo ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{p.sector ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3">
                      {p.tieneDotacion
                        ? <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Asignada</span>
                        : <span className="text-xs text-slate-400">Libre</span>}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => abrirModalEditar(p)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(p)}
                        disabled={eliminando === p.id || p.tieneDotacion}
                        title={p.tieneDotacion ? 'No se puede eliminar: tiene dotación asignada.' : ''}
                        className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {eliminando === p.id ? '...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {modal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {modal.modo === 'nueva' ? 'Nueva posición' : 'Editar posición'}
            </h2>

            {errorModal && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                {errorModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: UVI1, Z0.1, CL.AV..."
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Zona</label>
                  <select
                    value={form.zona}
                    onChange={(e) => setForm((p) => ({ ...p, zona: e.target.value as ZonaPosicion | '' }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Sin zona</option>
                    <option value="PISTA">Pista</option>
                    <option value="GRADA">Grada</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Puesto *</label>
                  <select
                    value={form.puestoId}
                    onChange={(e) => setForm((p) => ({ ...p, puestoId: Number(e.target.value) || '' }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {puestos.map((pu) => (
                      <option key={pu.id} value={pu.id}>{pu.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Componentes mínimo</label>
                  <input
                    type="number"
                    min={0}
                    value={form.componentesMinimo}
                    onChange={(e) => setForm((p) => ({ ...p, componentesMinimo: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Componentes máximo</label>
                  <input
                    type="number"
                    min={0}
                    value={form.componentesMaximo}
                    onChange={(e) => setForm((p) => ({ ...p, componentesMaximo: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                <input
                  type="text"
                  value={form.sector}
                  onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))}
                  placeholder="Texto libre — ej: Sector A, Gol Sur..."
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setModal(null)}
                disabled={guardando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {guardando ? 'Guardando...' : (modal.modo === 'nueva' ? 'Crear posición' : 'Guardar cambios')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
