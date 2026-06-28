'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

function DotacionesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventoIdParam = searchParams.get('eventoId');
  const estadoDotParam = searchParams.get('estadoDot');

  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<number | null>(
    eventoIdParam ? Number(eventoIdParam) : null
  );
  const [dotaciones, setDotaciones] = useState<DotacionListItem[]>([]);
  const [loadingDotaciones, setLoadingDotaciones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [nuevaDotacion, setNuevaDotacion] = useState(FORM_INICIAL);

  // Filtros independientes del evento (se mantienen al cambiar)
  const [filtroNombreEvento, setFiltroNombreEvento] = useState('');
  const [filtroFechaDotDesde, setFiltroFechaDotDesde] = useState('');
  const [filtroFechaDotHasta, setFiltroFechaDotHasta] = useState('');

  // Filtros dependientes del evento (se resetean al cambiar)
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroTipoDot, setFiltroTipoDot] = useState('');
  const [filtroIndicativo, setFiltroIndicativo] = useState('');
  const [filtroEstadoDot, setFiltroEstadoDot] = useState(estadoDotParam ?? '');

  // Filtro por estado de evento (afecta a la query a /api/eventos).
  // Si entramos con eventoId por URL, abrimos el filtro a TODOS para no
  // ocultar el evento deep-linkeado si está en otro estado.
  const [filtroEstadoEvento, setFiltroEstadoEvento] = useState<'TODOS' | 'PENDIENTE' | 'ACTIVO' | 'FINALIZADO'>(
    eventoIdParam ? 'TODOS' : 'ACTIVO'
  );

  useEffect(() => {
    async function cargarEventos() {
      try {
        const url = filtroEstadoEvento === 'TODOS'
          ? '/api/eventos'
          : `/api/eventos?estado=${filtroEstadoEvento}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setEventos(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar eventos');
      }
    }
    cargarEventos();
  }, [filtroEstadoEvento]);

  useEffect(() => {
    async function cargarDotaciones() {
      setLoadingDotaciones(true);
      setError(null);
      try {
        const url = eventoSeleccionado
          ? `/api/dotaciones?eventoId=${eventoSeleccionado}`
          : '/api/dotaciones';
        const res = await fetch(url);
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

  // Resetear solo los filtros dependientes del evento al cambiarlo.
  // NO incluye filtroEstadoDot porque ese viene del URL (param ?estadoDot=)
  // — se gestiona en su propio useEffect debajo para no clobberear el
  // deep-link que llega desde el bloque CL0/CL2/CL3 del dashboard UCO.
  useEffect(() => {
    setFiltroCodigo('');
    setFiltroTipoDot('');
    setFiltroIndicativo('');
  }, [eventoSeleccionado]);

  // Sync filtroEstadoDot con el param ?estadoDot= cada vez que cambia la URL.
  // Cubre tanto el mount (después del reset de filtros) como navegaciones
  // suaves entre CL0 → CL2 → CL3 desde el dashboard.
  useEffect(() => {
    setFiltroEstadoDot(estadoDotParam ?? '');
  }, [estadoDotParam]);

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

  function abrirModal() {
    if (!eventoSeleccionado) return;
    setNuevaDotacion(FORM_INICIAL);
    setErrorCreacion(null);
    setShowModal(true);
  }

  function cerrarModal() {
    setShowModal(false);
    setNuevaDotacion(FORM_INICIAL);
    setErrorCreacion(null);
  }

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

  function limpiarFiltros() {
    setFiltroCodigo('');
    setFiltroTipoDot('');
    setFiltroIndicativo('');
    setFiltroEstadoDot('');
    setFiltroNombreEvento('');
    setFiltroFechaDotDesde('');
    setFiltroFechaDotHasta('');
    setFiltroEstadoEvento('ACTIVO');
  }

  const eventosFiltrados = eventos.filter((ev) => {
    if (filtroNombreEvento && !ev.nombre.toLowerCase().includes(filtroNombreEvento.toLowerCase())) return false;
    if (filtroFechaDotDesde && ev.fecha < filtroFechaDotDesde) return false;
    if (filtroFechaDotHasta && ev.fecha > filtroFechaDotHasta) return false;
    return true;
  });

  const dotacionesFiltradas = dotaciones.filter((d) => {
    if (filtroCodigo && !d.codigo.toLowerCase().includes(filtroCodigo.toLowerCase())) return false;
    if (filtroTipoDot && d.tipo !== filtroTipoDot) return false;
    if (filtroIndicativo && !(d.indicativo ?? '').toLowerCase().includes(filtroIndicativo.toLowerCase())) return false;
    if (filtroEstadoDot && d.estado !== filtroEstadoDot) return false;
    if (filtroNombreEvento && !d.evento.nombre.toLowerCase().includes(filtroNombreEvento.toLowerCase())) return false;
    if (filtroFechaDotDesde && d.evento.fecha < filtroFechaDotDesde) return false;
    if (filtroFechaDotHasta && d.evento.fecha > filtroFechaDotHasta) return false;
    return true;
  });

  const hayFiltrosActivos = filtroCodigo || filtroTipoDot || filtroIndicativo || filtroEstadoDot
    || filtroNombreEvento || filtroFechaDotDesde || filtroFechaDotHasta
    || filtroEstadoEvento !== 'ACTIVO';
  const puedeCrear = !!eventoSeleccionado;
  const viendoTodos = !eventoSeleccionado;

  return (
    <div>
      {eventoIdParam && (
        <div className="mb-4">
          <Link
            href={`/uco?eventoId=${eventoIdParam}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Volver al dashboard UCO
          </Link>
        </div>
      )}

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
        <div className="flex items-end gap-4">
          <div className="w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado evento</label>
            <select
              value={filtroEstadoEvento}
              onChange={(e) => setFiltroEstadoEvento(e.target.value as typeof filtroEstadoEvento)}
              className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ACTIVO">Activo</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1">Evento (opcional)</label>
            <select
              value={eventoSeleccionado ?? ''}
              onChange={(e) => setEventoSeleccionado(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los eventos</option>
              {eventosFiltrados.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.nombre} — {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
                </option>
              ))}
            </select>
          </div>
        </div>
        {viendoTodos && (
          <p className="text-xs text-slate-400 mt-1">
            Mostrando dotaciones de todos los eventos. Selecciona uno para crear nuevas dotaciones.
          </p>
        )}
      </div>

      {/* Filtros sobre las dotaciones cargadas */}
      {dotaciones.length > 0 && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-32">
              <label className="block text-xs font-medium text-slate-600 mb-1">Código</label>
              <input
                type="text"
                value={filtroCodigo}
                onChange={(e) => setFiltroCodigo(e.target.value)}
                placeholder="Código..."
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select
                value={filtroTipoDot}
                onChange={(e) => setFiltroTipoDot(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {TIPOS_DOTACION.map((t) => (
                  <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-32">
              <label className="block text-xs font-medium text-slate-600 mb-1">Indicativo</label>
              <input
                type="text"
                value={filtroIndicativo}
                onChange={(e) => setFiltroIndicativo(e.target.value)}
                placeholder="Indicativo radio..."
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-32">
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select
                value={filtroEstadoDot}
                onChange={(e) => setFiltroEstadoDot(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="EN_INTERVENCION">En intervención</option>
                <option value="NO_OPERATIVA">No operativa</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del evento</label>
              <input
                type="text"
                value={filtroNombreEvento}
                onChange={(e) => setFiltroNombreEvento(e.target.value)}
                placeholder="Nombre del evento..."
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha desde</label>
              <input
                type="date"
                value={filtroFechaDotDesde}
                onChange={(e) => setFiltroFechaDotDesde(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={filtroFechaDotHasta}
                onChange={(e) => setFiltroFechaDotHasta(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={limpiarFiltros}
              disabled={!hayFiltrosActivos}
              className="border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            >
              Limpiar
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {dotacionesFiltradas.length} de {dotaciones.length} dotaciones
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {loadingDotaciones && (
        <div className="text-center py-12 text-slate-500">Cargando dotaciones...</div>
      )}

      {!loadingDotaciones && (
        <>
          {dotaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {eventoSeleccionado
                ? 'No hay dotaciones para este evento. Crea la primera con el botón "+ Nueva dotación".'
                : 'No hay dotaciones registradas.'}
            </div>
          ) : dotacionesFiltradas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Ninguna dotación coincide con los filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
                    {viendoTodos && <th className="text-left px-4 py-3 font-medium text-slate-600">Evento</th>}
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Personal</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Posición</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dotacionesFiltradas.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">{d.codigo}</td>
                      {viendoTodos && (
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          <div className="font-medium">{d.evento.nombre}</div>
                          <div className="text-slate-400">{new Date(d.evento.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</div>
                        </td>
                      )}
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

export default function DotacionesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500">Cargando...</div>}>
      <DotacionesContent />
    </Suspense>
  );
}
