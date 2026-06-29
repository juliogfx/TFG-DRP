/**
 * @file app/plantillas/page.tsx
 * @description Listado de plantillas de evento (F1.3).
 *
 * Una plantilla agrupa el conjunto típico de posiciones para un tipo de
 * evento concreto (en el MVP solo hay la del Bernabéu). Desde aquí se
 * pueden crear nuevas plantillas básicas y "usar" una plantilla — esto
 * último redirige a /eventos/nuevo donde el usuario completa los datos
 * del evento concreto y al guardar se aplican las posiciones/dotaciones
 * de la plantilla.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlantillaListItem } from '@/types/plantilla';

interface OpcionCatalogo { id: number; nombre: string; codigo: string }

const FORM_INICIAL = {
  nombre: '',
  codigoLoc: '',
  codigoEvt: '',
  codigoCtr: '',
  textoLibre: '',
  empresaId: '' as number | '',
  tipoEventoId: '' as number | '',
  ubicacionId: '' as number | '',
  descripcion: '',
};

export default function PlantillasPage() {
  const router = useRouter();
  const [plantillas, setPlantillas] = useState<PlantillaListItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catálogos para el modal de creación.
  const [empresas, setEmpresas] = useState<OpcionCatalogo[]>([]);
  const [tipos, setTipos] = useState<OpcionCatalogo[]>([]);
  const [ubicaciones, setUbicaciones] = useState<OpcionCatalogo[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resP, resE, resT, resU] = await Promise.all([
        fetch('/api/plantillas'),
        fetch('/api/empresas'),
        fetch('/api/tipos-evento'),
        fetch('/api/ubicaciones'),
      ]);
      if (!resP.ok) throw new Error(`Error ${resP.status}`);
      const jsonP = await resP.json();
      const jsonE = await resE.json();
      const jsonT = await resT.json();
      const jsonU = await resU.json();
      setPlantillas(jsonP.data ?? []);
      setEmpresas(jsonE.data ?? []);
      setTipos(jsonT.data ?? []);
      setUbicaciones(jsonU.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearPlantilla() {
    setErrorModal(null);
    if (!form.nombre.trim()) return setErrorModal('El nombre es obligatorio.');
    if (!form.empresaId) return setErrorModal('Selecciona la empresa.');
    setGuardando(true);
    try {
      const res = await fetch('/api/plantillas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          codigoLoc: form.codigoLoc.trim() || 'XXX',
          codigoEvt: form.codigoEvt.trim() || 'XXX',
          codigoCtr: form.codigoCtr.trim() || 'XXX',
          textoLibre: form.textoLibre.trim() || '------',
          empresaId: Number(form.empresaId),
          tipoEventoId: form.tipoEventoId ? Number(form.tipoEventoId) : null,
          ubicacionId: form.ubicacionId ? Number(form.ubicacionId) : null,
          descripcion: form.descripcion.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setShowModal(false);
      setForm(FORM_INICIAL);
      await cargar();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plantillas de evento</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Una plantilla define el conjunto típico de posiciones y dotaciones de un tipo de evento. Se aplica al crear un evento nuevo.
          </p>
        </div>
        <button
          onClick={() => { setForm(FORM_INICIAL); setErrorModal(null); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nueva plantilla
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {cargando && <div className="text-center py-12 text-slate-500">Cargando...</div>}

      {!cargando && plantillas.length === 0 && !error && (
        <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
          Sin plantillas registradas.
        </p>
      )}

      {!cargando && plantillas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ubicación</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Empresa</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Posiciones</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plantillas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.descripcion ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.tipoEvento?.nombre ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.ubicacion?.nombre ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.empresa.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {p.numeroPosiciones}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/eventos/nuevo?plantillaId=${p.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Usar plantilla →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nueva plantilla</h2>

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
                  placeholder="Ej: BER-PLA-RMD-FUTBOL"
                  maxLength={20}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Patrón sugerido: [LOC3]-[EVT3]-[CTR3]-[LIBRE6]</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Loc (3)</label>
                  <input type="text" maxLength={3} value={form.codigoLoc}
                    onChange={(e) => setForm((p) => ({ ...p, codigoLoc: e.target.value.toUpperCase() }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Evt (3)</label>
                  <input type="text" maxLength={3} value={form.codigoEvt}
                    onChange={(e) => setForm((p) => ({ ...p, codigoEvt: e.target.value.toUpperCase() }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ctr (3)</label>
                  <input type="text" maxLength={3} value={form.codigoCtr}
                    onChange={(e) => setForm((p) => ({ ...p, codigoCtr: e.target.value.toUpperCase() }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Libre (6)</label>
                  <input type="text" maxLength={6} value={form.textoLibre}
                    onChange={(e) => setForm((p) => ({ ...p, textoLibre: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa *</label>
                <select
                  value={form.empresaId}
                  onChange={(e) => setForm((p) => ({ ...p, empresaId: e.target.value ? Number(e.target.value) : '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo evento</label>
                  <select
                    value={form.tipoEventoId}
                    onChange={(e) => setForm((p) => ({ ...p, tipoEventoId: e.target.value ? Number(e.target.value) : '' }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                  <select
                    value={form.ubicacionId}
                    onChange={(e) => setForm((p) => ({ ...p, ubicacionId: e.target.value ? Number(e.target.value) : '' }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-slate-500 italic">
                La plantilla se crea vacía (sin posiciones). Las posiciones canónicas del Bernabéu se generan al reseedear o se editarán posteriormente por la API.
              </p>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={guardando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearPlantilla}
                disabled={guardando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {guardando ? 'Creando...' : 'Crear plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
