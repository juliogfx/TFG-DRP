/**
 * @file app/eventos/page.tsx
 * @description Página de listado de Eventos del módulo de gestión DRP.
 *
 * Muestra una tabla con todos los eventos activos obtenidos de
 * GET /api/eventos. Incluye barra de filtros (búsqueda por nombre,
 * ubicación, tipo, fecha desde/hasta). Permite navegar al formulario
 * de creación, ver el detalle/edición y eliminar con soft-delete.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventoListItem } from '@/types/evento';

interface UbicacionItem { id: number; codigo: string; nombre: string; }
interface TipoEventoItem { id: number; codigo: string; nombre: string; }

const ESTADO_EVENTO_BADGE: Record<string, string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-800',
  ACTIVO:     'bg-green-100 text-green-800',
  FINALIZADO: 'bg-gray-100 text-gray-600',
};

const ESTADO_EVENTO_LABEL: Record<string, string> = {
  PENDIENTE:  'Pendiente',
  ACTIVO:     'Activo',
  FINALIZADO: 'Finalizado',
};

type FiltroEstadoEvento = 'TODOS' | 'PENDIENTE' | 'ACTIVO' | 'FINALIZADO';

function useEventos(estado: FiltroEstadoEvento) {
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = estado === 'TODOS' ? '/api/eventos' : `/api/eventos?estado=${estado}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setEventos(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => { cargar(); }, [cargar]);

  return { eventos, loading, error, recargar: cargar };
}

export default function EventosPage() {
  const router = useRouter();
  const [filtroEstadoEvento, setFiltroEstadoEvento] = useState<FiltroEstadoEvento>('ACTIVO');
  const { eventos, loading, error, recargar } = useEventos(filtroEstadoEvento);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<number | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  // Catálogos para filtros
  const [ubicaciones, setUbicaciones] = useState<UbicacionItem[]>([]);
  const [tiposEvento, setTiposEvento] = useState<TipoEventoItem[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [resU, resT] = await Promise.all([
          fetch('/api/ubicaciones'),
          fetch('/api/tipos-evento'),
        ]);
        const jsonU = await resU.json();
        const jsonT = await resT.json();
        setUbicaciones(jsonU.data ?? []);
        setTiposEvento(jsonT.data ?? []);
      } catch {
        // Silencioso: los filtros pueden quedar sin opciones, pero no rompemos la página
      }
    }
    cargarCatalogos();
  }, []);

  // F3.1 — transición manual de estado del evento. PENDIENTE→ACTIVO o
  // ACTIVO→FINALIZADO con confirmación. El backend revalida en el GET
  // siguiente; aquí solo persistimos el cambio explícito que pide el UCO.
  async function handleCambiarEstadoEvento(id: number, nuevoEstado: 'ACTIVO' | 'FINALIZADO', nombre: string) {
    const mensaje = nuevoEstado === 'ACTIVO'
      ? `¿Activar el evento "${nombre}"? Pasará a estado ACTIVO.`
      : `¿Finalizar el evento "${nombre}"? Pasará a estado FINALIZADO y desaparecerá del listado principal. Las intervenciones abiertas NO se cierran.`;
    if (!window.confirm(mensaje)) return;
    setCambiandoEstado(id);
    try {
      const res = await fetch(`/api/eventos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      await recargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar el estado');
    } finally {
      setCambiandoEstado(null);
    }
  }

  async function handleEliminar(id: number, nombre: string) {
    if (!window.confirm(`¿Eliminar el evento "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(id);
    try {
      const res = await fetch(`/api/eventos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      await recargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar el evento');
    } finally {
      setEliminando(null);
    }
  }

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroUbicacion('');
    setFiltroTipo('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroEstadoEvento('ACTIVO');
  }

  const eventosFiltrados = eventos.filter((ev) => {
    if (busqueda && !ev.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (filtroUbicacion && ev.ubicacion.id !== Number(filtroUbicacion)) return false;
    if (filtroTipo && ev.tipoEvento?.id !== Number(filtroTipo)) return false;
    if (filtroFechaDesde && ev.fecha < filtroFechaDesde) return false;
    if (filtroFechaHasta && ev.fecha > filtroFechaHasta) return false;
    return true;
  });

  const eventosPrincipal = eventosFiltrados.filter((e) => e.estado !== 'FINALIZADO');
  const eventosHistorial = eventosFiltrados.filter((e) => e.estado === 'FINALIZADO');

  const hayFiltrosActivos = busqueda || filtroUbicacion || filtroTipo || filtroFechaDesde || filtroFechaHasta
    || filtroEstadoEvento !== 'ACTIVO';

  function renderTabla(lista: EventoListItem[]) {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nº</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ubicación</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Dotaciones</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((evento) => (
              <tr key={evento.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">#{evento.id}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{evento.nombre}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_EVENTO_BADGE[evento.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                    {ESTADO_EVENTO_LABEL[evento.estado] ?? evento.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                    {evento.ubicacion.codigo}
                  </span>
                  {evento.ubicacion.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {evento.tipoEvento?.nombre ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {evento.numeroDotaciones}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {evento.estado === 'PENDIENTE' && (
                    <button
                      onClick={() => handleCambiarEstadoEvento(evento.id, 'ACTIVO', evento.nombre)}
                      disabled={cambiandoEstado === evento.id}
                      className="text-green-700 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                    >
                      {cambiandoEstado === evento.id ? '...' : 'Activar'}
                    </button>
                  )}
                  {evento.estado === 'ACTIVO' && (
                    <button
                      onClick={() => handleCambiarEstadoEvento(evento.id, 'FINALIZADO', evento.nombre)}
                      disabled={cambiandoEstado === evento.id}
                      className="text-slate-600 hover:text-slate-900 text-sm font-medium disabled:opacity-50"
                    >
                      {cambiandoEstado === evento.id ? '...' : 'Finalizar'}
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/eventos/${evento.id}/posiciones`)}
                    className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                  >
                    Posiciones
                  </button>
                  <button
                    onClick={() => router.push(`/eventos/${evento.id}/dimensionamiento`)}
                    className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                  >
                    Dimensionamiento
                  </button>
                  <button
                    onClick={() => router.push(`/eventos/${evento.id}/asignacion`)}
                    className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                  >
                    Asignación
                  </button>
                  <button
                    onClick={() => router.push(`/eventos/${evento.id}/fichajes`)}
                    className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                  >
                    Fichajes
                  </button>
                  <button
                    onClick={() => router.push(`/eventos/${evento.id}/control-material`)}
                    className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                  >
                    Material
                  </button>
                  <button
                    onClick={() => router.push(`/eventos/${evento.id}/editar`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(evento.id, evento.nombre)}
                    disabled={eliminando === evento.id}
                    className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                  >
                    {eliminando === evento.id ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Eventos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de Dispositivos de Riesgos Previsibles</p>
        </div>
        <button
          onClick={() => router.push('/eventos/nuevo')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nuevo evento
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
        <div className="flex items-end gap-4">
          <div className="w-[150px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado evento</label>
            <select
              value={filtroEstadoEvento}
              onChange={(e) => setFiltroEstadoEvento(e.target.value as FiltroEstadoEvento)}
              className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ACTIVO">Activo</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const ev = eventos.find((x) => x.id === Number(e.target.value));
                if (ev) setBusqueda(ev.nombre);
              }
            }}
            className="w-[250px] border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Ir a evento...</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre} — {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación</label>
            <select
              value={filtroUbicacion}
              onChange={(e) => setFiltroUbicacion(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {tiposEvento.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
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
          {eventosFiltrados.length} de {eventos.length} eventos
        </p>
      </div>

      {loading && <div className="text-center py-12 text-slate-500">Cargando eventos...</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          Error al cargar los eventos: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {eventos.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No hay eventos registrados.{' '}
              <button onClick={() => router.push('/eventos/nuevo')} className="text-blue-600 hover:underline">
                Crear el primero
              </button>
            </div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Ningún evento coincide con los filtros aplicados.
            </div>
          ) : (
            <>
              {eventosPrincipal.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Ningún evento activo o pendiente coincide con los filtros.
                </div>
              ) : (
                renderTabla(eventosPrincipal)
              )}

              {eventosHistorial.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setHistorialAbierto((v) => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <span className="text-xs">{historialAbierto ? '▾' : '▸'}</span>
                    Ver historial ({eventosHistorial.length} evento{eventosHistorial.length === 1 ? '' : 's'} finalizado{eventosHistorial.length === 1 ? '' : 's'})
                  </button>
                  {historialAbierto && (
                    <div className="mt-3">
                      {renderTabla(eventosHistorial)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
