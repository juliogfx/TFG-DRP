'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DotacionListItem, TipoDotacion } from '@/types/dotacion';
import type { EventoListItem } from '@/types/evento';

const TIPO_LABELS: Record<string, string> = {
  AMBULANCIA: 'Ambulancia', BOTIQUIN: 'Botiquín', UVI: 'UVI Móvil',
  SVB: 'SVB', CLINICA: 'Clínica', AVANZADA: 'Avanzada',
  BANQUILLO: 'Banquillo', LIMA: 'LIMA', UCO_UNIT: 'UCO',
};

const TIPOS_DOTACION: TipoDotacion[] = [
  'AMBULANCIA', 'BOTIQUIN', 'UVI', 'SVB', 'CLINICA',
  'AVANZADA', 'BANQUILLO', 'LIMA', 'UCO_UNIT',
];

const ESTADO_STYLES: Record<string, string> = {
  DISPONIBLE: 'bg-green-100 text-green-700',
  EN_INTERVENCION: 'bg-yellow-100 text-yellow-700',
  NO_OPERATIVA: 'bg-red-100 text-red-700',
};

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_INTERVENCION: 'En intervención',
  NO_OPERATIVA: 'No operativa',
};

const FORM_INICIAL = {
  codigo: '',
  tipo: 'BOTIQUIN' as TipoDotacion,
  personalMinimo: 2,
  indicativo: '',
};

export default function DotacionesPage() {
  const router = useRouter();
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<number | null>(null);
  const [dotaciones, setDotaciones] = useState<DotacionListItem[]>([]);
  const [loadingDotaciones, setLoadingDotaciones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [nuevaDotacion, setNuevaDotacion] = useState(FORM_INICIAL);

  useEffect(() => {
    async function cargarEventos() {
      try {
        const res = await fetch('/api/eventos');
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setEventos(json.data);
        if (json.data.length > 0) setEventoSeleccionado(json.data[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar eventos');
      }
    }
    cargarEventos();
  }, []);

  useEffect(() => {
    if (!eventoSeleccionado) return;
    async function cargarDotaciones() {
      setLoadingDotaciones(true);
      setError(null);
      try {
        const res = await fetch(`/api/dotaciones?eventoId=${eventoSeleccionado}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setDotaciones(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar dotaciones');
      } finally {
        setLoadingDotaciones(false);
      }
    }
    cargarDotaciones();
  }, [eventoSeleccionado]);

  async function handleEliminar(id: number, codigo: string) {
    if (!window.confirm(`¿Eliminar la dotación "${codigo}"?`)) return;
    setEliminando(id);
    try {
      const res = await fetch(`/api/dotaciones/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      setDotaciones((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar la dotación');
    } finally {
      setEliminando(null);
    }
  }

  /** Abre el modal de creación tras validar que hay un evento seleccionado. */
  function abrirModal() {
    if (!eventoSeleccionado) return;
    setNuevaDotacion(FORM_INICIAL);
    setErrorCreacion(null);
    setShowModal(true);
  }

  /** Cierra el modal y resetea el formulario. */
  function cerrarModal() {
    setShowModal(false);
    setNuevaDotacion(FORM_INICIAL);
    setErrorCreacion(null);
  }

  /**
   * Envía la petición POST /api/dotaciones con los datos del modal.
   * Si la creación es exitosa, añade la nueva dotación al listado sin recargar.
   */
  async function handleCrearDotacion() {
    setErrorCreacion(null);
    const codigo = nuevaDotacion.codigo.trim().toUpperCase();
    if (!codigo) {
      setErrorCreacion('El código es obligatorio.');
      return;
    }
    if (!eventoSeleccionado) {
      setErrorCreacion('No hay evento seleccionado.');
      return;
    }
    setCreando(true);
    try {
      const indicativo = nuevaDotacion.indicativo.trim();
      const res = await fetch('/api/dotaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId: eventoSeleccionado,
          codigo,
          tipo: nuevaDotacion.tipo,
          personalMinimo: nuevaDotacion.personalMinimo,
          indicativo: indicativo || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);

      const creada = json.data as DotacionListItem;
      setDotaciones((prev) => [...prev, creada].sort((a, b) => a.codigo.localeCompare(b.codigo)));
      cerrarModal();
    } catch (e) {
      setErrorCreacion(e instanceof Error ? e.message : 'Error al crear la dotación');
    } finally {
      setCreando(false);
    }
  }

  const puedeCrear = !!eventoSeleccionado;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dotaciones</h1>
          <p className="text-sm text-slate-500 mt-1">Personal y recursos por evento</p>
        </div>
        <button
          onClick={abrirModal}
          disabled={!puedeCrear}
          title={puedeCrear ? 'Crear nueva dotación' : 'Selecciona un evento primero'}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nueva dotación
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Filtrar por evento</label>
        <select
          value={eventoSeleccionado ?? ''}
          onChange={(e) => setEventoSeleccionado(e.target.value ? Number(e.target.value) : null)}
          className="w-full max-w-md border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecciona un evento...</option>
          {eventos.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.nombre} — {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {loadingDotaciones && (
        <div className="text-center py-12 text-slate-500">Cargando dotaciones...</div>
      )}

      {!loadingDotaciones && eventoSeleccionado && (
        <>
          {dotaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No hay dotaciones para este evento. Crea la primera con el botón &quot;+ Nueva dotación&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Personal</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Posición</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dotaciones.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">{d.codigo}</td>
                      <td className="px-4 py-3 text-slate-600">{TIPO_LABELS[d.tipo] ?? d.tipo}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[d.estado]}`}>
                          {ESTADO_LABELS[d.estado] ?? d.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold ${d.numeroPersonasAsignadas >= d.personalMinimo ? 'text-green-600' : 'text-red-500'}`}>
                          {d.numeroPersonasAsignadas}/{d.personalMinimo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {d.posicion?.nombre ?? <span className="text-slate-300">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => router.push(`/dotaciones/${d.id}`)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Ver detalle
                        </button>
                        <button
                          onClick={() => handleEliminar(d.id, d.codigo)}
                          disabled={eliminando === d.id}
                          className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                        >
                          {eliminando === d.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
          onClick={cerrarModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Nueva dotación</h2>
            <p className="text-xs text-slate-500 mb-5">Los campos marcados con * son obligatorios.</p>

            {errorCreacion && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                {errorCreacion}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                <input
                  type="text"
                  value={nuevaDotacion.codigo}
                  onChange={(e) => setNuevaDotacion((prev) => ({ ...prev, codigo: e.target.value }))}
                  placeholder="B01"
                  maxLength={20}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <select
                  value={nuevaDotacion.tipo}
                  onChange={(e) => setNuevaDotacion((prev) => ({ ...prev, tipo: e.target.value as TipoDotacion }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIPOS_DOTACION.map((t) => (
                    <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Personal mínimo *</label>
                <input
                  type="number"
                  min={1}
                  value={nuevaDotacion.personalMinimo}
                  onChange={(e) => setNuevaDotacion((prev) => ({ ...prev, personalMinimo: Math.max(1, Number(e.target.value) || 1) }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Indicativo radio</label>
                <input
                  type="text"
                  value={nuevaDotacion.indicativo}
                  onChange={(e) => setNuevaDotacion((prev) => ({ ...prev, indicativo: e.target.value }))}
                  placeholder="DELTA-3"
                  maxLength={50}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={cerrarModal}
                disabled={creando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearDotacion}
                disabled={creando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {creando ? 'Creando...' : 'Crear dotación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
