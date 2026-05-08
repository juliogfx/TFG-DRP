/**
 * @file app/uco/page.tsx
 * @description Dashboard UCO — vista operativa en tiempo real del evento DRP.
 *
 * Pantalla principal del Coordinador de Operaciones durante el evento.
 * Muestra el estado de todas las dotaciones, personal asignado y
 * contadores de intervenciones con actualización automática cada 30s.
 *
 * Client Component — necesita fetch, polling con setInterval y estado.
 * Solo lectura — no permite modificaciones desde esta pantalla.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { EstadoUCO, DotacionEstado } from '@/types/uco';
import type { EventoListItem } from '@/types/evento';

const TIPO_LABELS: Record<string, string> = {
  AMBULANCIA: 'Ambulancia', BOTIQUIN: 'Botiquín', UVI: 'UVI Móvil',
  SVB: 'SVB', CLINICA: 'Clínica', AVANZADA: 'Avanzada',
  BANQUILLO: 'Banquillo', LIMA: 'LIMA', UCO_UNIT: 'UCO',
};

const CARD_STYLES: Record<string, string> = {
  DISPONIBLE: 'border-green-200 bg-green-50',
  EN_INTERVENCION: 'border-yellow-300 bg-yellow-50',
  NO_OPERATIVA: 'border-red-200 bg-red-50',
};

const BADGE_STYLES: Record<string, string> = {
  DISPONIBLE: 'bg-green-100 text-green-800',
  EN_INTERVENCION: 'bg-yellow-100 text-yellow-800',
  NO_OPERATIVA: 'bg-red-100 text-red-800',
};

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_INTERVENCION: 'En intervención',
  NO_OPERATIVA: 'No operativa',
};

const POLLING_INTERVAL_MS = 30_000;

/**
 * Tarjeta individual de dotación para el grid del dashboard.
 * @param dotacion - Datos de estado de la dotación a mostrar.
 */
function TarjetaDotacion({ dotacion }: { dotacion: DotacionEstado }) {
  const personalCubierto = dotacion.numeroPersonasAsignadas >= dotacion.personalMinimo;

  return (
    <div className={`rounded-lg border-2 p-4 ${CARD_STYLES[dotacion.estado]}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-lg font-bold font-mono text-slate-900">{dotacion.codigo}</span>
          {dotacion.indicativo && (
            <span className="ml-2 text-xs text-slate-500 font-mono">{dotacion.indicativo}</span>
          )}
          <p className="text-xs text-slate-500 mt-0.5">{TIPO_LABELS[dotacion.tipo] ?? dotacion.tipo}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${BADGE_STYLES[dotacion.estado]}`}>
          {ESTADO_LABELS[dotacion.estado]}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`text-sm font-semibold ${personalCubierto ? 'text-green-700' : 'text-red-600'}`}>
          👤 {dotacion.numeroPersonasAsignadas}/{dotacion.personalMinimo}
        </span>
        {!personalCubierto && <span className="text-xs text-red-500">Personal insuficiente</span>}
      </div>

      {dotacion.posicion && (
        <p className="text-xs text-slate-500 mb-2">
          📍 {dotacion.posicion.nombre}{dotacion.posicion.sector && ` · ${dotacion.posicion.sector}`}
        </p>
      )}

      {dotacion.personal.length > 0 ? (
        <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
          {dotacion.personal.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.tipo === 'FACULTATIVO' ? 'bg-purple-500' : 'bg-blue-500'}`} />
              <span className="text-xs text-slate-700 truncate">{p.nombreCompleto}</span>
              <span className="text-xs text-slate-400 truncate">· {p.rolEnDotacion}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic mt-1">Sin personal asignado</p>
      )}
    </div>
  );
}

/**
 * Dashboard UCO — pantalla operativa principal.
 * Carga eventos, obtiene estado UCO y refresca cada 30s con polling.
 */
export default function UCOPage() {
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<number | null>(null);
  const [estadoUCO, setEstadoUCO] = useState<EstadoUCO | null>(null);
  const [cargando, setCargando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtiene el estado UCO del evento seleccionado.
   * @param esPolling - true si es actualización automática, false si es carga inicial.
   */
  const fetchEstado = useCallback(async (esPolling = false) => {
    if (!eventoSeleccionado) return;
    if (esPolling) setActualizando(true);
    else setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/uco/estado?eventoId=${eventoSeleccionado}`);
      if (!res.ok) { const json = await res.json(); throw new Error(json.error ?? `Error ${res.status}`); }
      const json = await res.json();
      setEstadoUCO(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el estado');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [eventoSeleccionado]);

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

  /**
   * Carga estado UCO y arranca polling al cambiar evento seleccionado.
   * Limpia el intervalo al desmontar para evitar memory leaks.
   */
  useEffect(() => {
    if (!eventoSeleccionado) return;
    fetchEstado(false);
    const intervalo = setInterval(() => fetchEstado(true), POLLING_INTERVAL_MS);
    return () => clearInterval(intervalo);
  }, [eventoSeleccionado, fetchEstado]);

  const ultimaActualizacion = estadoUCO
    ? new Date(estadoUCO.actualizadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard UCO</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vista operativa en tiempo real</p>
        </div>
        <div className="text-right">
          {actualizando && <span className="text-xs text-blue-600 font-medium animate-pulse">↻ Actualizando...</span>}
          {ultimaActualizacion && !actualizando && (
            <span className="text-xs text-slate-400">Actualizado a las {ultimaActualizacion}</span>
          )}
          <p className="text-xs text-slate-400 mt-0.5">Refresco automático cada {POLLING_INTERVAL_MS / 1000}s</p>
        </div>
      </div>

      <div className="mb-6">
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

      {cargando && <div className="text-center py-12 text-slate-500">Cargando estado del evento...</div>}

      {!cargando && estadoUCO && (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800">{estadoUCO.nombreEvento}</h2>
            <p className="text-sm text-slate-500">
              {new Date(estadoUCO.fechaEvento + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold">{estadoUCO.resumen.disponibles}</span>
              <span className="text-sm">disponibles</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-semibold">{estadoUCO.resumen.enIntervencion}</span>
              <span className="text-sm">en intervención</span>
            </div>
            <div className="flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-semibold">{estadoUCO.resumen.noOperativas}</span>
              <span className="text-sm">no operativas</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full">
              <span className="text-sm font-semibold">{estadoUCO.resumen.total}</span>
              <span className="text-sm">total dotaciones</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-2">
            <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-slate-900">{estadoUCO.contadores.totalIntervenciones}</p>
              <p className="text-xs text-slate-500 mt-1">Intervenciones</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{estadoUCO.contadores.altasEnLugar}</p>
              <p className="text-xs text-slate-500 mt-1">Altas en lugar</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{estadoUCO.contadores.trasladosClinica}</p>
              <p className="text-xs text-slate-500 mt-1">Traslados clínica</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{estadoUCO.contadores.trasladosHospital}</p>
              <p className="text-xs text-slate-500 mt-1">Traslados hospital</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-8">
            Los contadores reflejan las intervenciones médicas registradas en el sistema durante el evento.
            El estado operativo de las dotaciones (disponible / en intervención / no operativa)
            se gestiona desde el módulo Dotaciones.
          </p>

          {estadoUCO.dotaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No hay dotaciones activas para este evento.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {estadoUCO.dotaciones.map((dotacion) => (
                <TarjetaDotacion key={dotacion.id} dotacion={dotacion} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
