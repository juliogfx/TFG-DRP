/**
 * @file app/uco/page.tsx
 * @description Dashboard UCO — vista operativa en tiempo real del evento DRP.
 *
 * Pantalla principal del Coordinador de Operaciones durante el evento.
 * Muestra el estado de todas las dotaciones, personal asignado,
 * contadores de intervenciones y tabla de intervenciones activas/cerradas,
 * con actualización automática cada 30s. Permite registrar nuevas intervenciones.
 *
 * Client Component — necesita fetch, polling con setInterval y estado.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { EstadoUCO, DotacionEstado } from '@/types/uco';
import type { EventoListItem } from '@/types/evento';
import type {
  IntervencionListItem,
  CreateIntervencionInput,
  GravedadIntervencion,
  SintomatologiaItem,
} from '@/types/intervencion';

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

const GRAVEDAD_STYLES: Record<string, string> = {
  LEVE:     'bg-green-100 text-green-700',
  MODERADA: 'bg-yellow-100 text-yellow-700',
  GRAVE:    'bg-orange-100 text-orange-700',
  CRITICA:  'bg-red-100 text-red-700',
};

const FORM_INTERVENCION_INICIAL = {
  dotacionActivaId: '' as number | '',
  sintomatologiaId: '' as number | '',
  gravedad: 'LEVE' as GravedadIntervencion,
  horaAviso: '',
  dotacionApoyoId: '' as number | '',
  altaEnLugar: false,
  trasladoClinica: false,
  trasladoHospital: false,
  hospitalDestino: '',
};

const POLLING_INTERVAL_MS = 30_000;

/**
 * Tarjeta individual de dotación para el grid del dashboard.
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
 * Tabla compacta para mostrar intervenciones (activas o cerradas).
 */
function TablaIntervenciones({ intervenciones }: { intervenciones: IntervencionListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-slate-600">Nº</th>
            <th className="text-left px-3 py-2 font-medium text-slate-600">Dotación</th>
            <th className="text-left px-3 py-2 font-medium text-slate-600">Sintomatología</th>
            <th className="text-left px-3 py-2 font-medium text-slate-600">Gravedad</th>
            <th className="text-left px-3 py-2 font-medium text-slate-600">Aviso</th>
            <th className="text-left px-3 py-2 font-medium text-slate-600">Resolución</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {intervenciones.map((i) => (
            <tr key={i.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 font-mono font-bold text-slate-900">#{i.numeroIntervencion}</td>
              <td className="px-3 py-2 font-mono text-slate-700">
                {i.dotacionActiva.codigo}
                {i.dotacionApoyo && <span className="text-slate-400"> +{i.dotacionApoyo.codigo}</span>}
              </td>
              <td className="px-3 py-2 text-slate-600">{i.sintomatologia?.tipo ?? '—'}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${GRAVEDAD_STYLES[i.gravedad]}`}>
                  {i.gravedad}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-500 font-mono">
                {i.horaAviso
                  ? new Date(i.horaAviso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </td>
              <td className="px-3 py-2 text-slate-500">
                {i.altaEnLugar ? 'Alta en lugar'
                  : i.trasladoClinica ? 'Clínica'
                  : i.trasladoHospital ? `Hospital${i.hospitalDestino ? ` · ${i.hospitalDestino}` : ''}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Dashboard UCO — pantalla operativa principal.
 */
export default function UCOPage() {
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<number | null>(null);
  const [estadoUCO, setEstadoUCO] = useState<EstadoUCO | null>(null);
  const [intervenciones, setIntervenciones] = useState<IntervencionListItem[]>([]);
  const [sintomatologias, setSintomatologias] = useState<SintomatologiaItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModalIntervencion, setShowModalIntervencion] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errorIntervencion, setErrorIntervencion] = useState<string | null>(null);
  const [formIntervencion, setFormIntervencion] = useState(FORM_INTERVENCION_INICIAL);

  /**
   * Obtiene estado UCO + intervenciones del evento seleccionado.
   */
  const fetchEstado = useCallback(async (esPolling = false) => {
    if (!eventoSeleccionado) return;
    if (esPolling) setActualizando(true);
    else setCargando(true);
    setError(null);
    try {
      const [resEstado, resInterv] = await Promise.all([
        fetch(`/api/uco/estado?eventoId=${eventoSeleccionado}`),
        fetch(`/api/intervenciones?eventoId=${eventoSeleccionado}`),
      ]);
      if (!resEstado.ok) { const json = await resEstado.json(); throw new Error(json.error ?? `Error ${resEstado.status}`); }
      const jsonEstado = await resEstado.json();
      const jsonInterv = await resInterv.json();
      setEstadoUCO(jsonEstado.data);
      setIntervenciones(jsonInterv.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el estado');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [eventoSeleccionado]);

  useEffect(() => {
    async function cargarInicial() {
      try {
        const [resEventos, resSint] = await Promise.all([
          fetch('/api/eventos'),
          fetch('/api/sintomatologias'),
        ]);
        if (!resEventos.ok) throw new Error(`Error ${resEventos.status}`);
        const jsonEventos = await resEventos.json();
        const jsonSint = await resSint.json();
        setEventos(jsonEventos.data);
        setSintomatologias(jsonSint.data ?? []);
        if (jsonEventos.data.length > 0) setEventoSeleccionado(jsonEventos.data[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar eventos');
      }
    }
    cargarInicial();
  }, []);

  useEffect(() => {
    if (!eventoSeleccionado) return;
    fetchEstado(false);
    const intervalo = setInterval(() => fetchEstado(true), POLLING_INTERVAL_MS);
    return () => clearInterval(intervalo);
  }, [eventoSeleccionado, fetchEstado]);

  async function handleRegistrarIntervencion() {
    setErrorIntervencion(null);
    if (!formIntervencion.dotacionActivaId) return setErrorIntervencion('Selecciona la dotación activada.');
    if (!formIntervencion.sintomatologiaId) return setErrorIntervencion('Selecciona la sintomatología.');
    if (!eventoSeleccionado) return;
    setRegistrando(true);
    try {
      const body: CreateIntervencionInput = {
        eventoId: eventoSeleccionado,
        dotacionActivaId: Number(formIntervencion.dotacionActivaId),
        sintomatologiaId: Number(formIntervencion.sintomatologiaId),
        gravedad: formIntervencion.gravedad,
        horaAviso: formIntervencion.horaAviso || undefined,
        dotacionApoyoId: formIntervencion.dotacionApoyoId ? Number(formIntervencion.dotacionApoyoId) : undefined,
        altaEnLugar: formIntervencion.altaEnLugar,
        trasladoClinica: formIntervencion.trasladoClinica,
        trasladoHospital: formIntervencion.trasladoHospital,
        hospitalDestino: formIntervencion.trasladoHospital ? formIntervencion.hospitalDestino || undefined : undefined,
      };
      const res = await fetch('/api/intervenciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      await fetchEstado(true);
      setShowModalIntervencion(false);
      setFormIntervencion(FORM_INTERVENCION_INICIAL);
    } catch (e) {
      setErrorIntervencion(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setRegistrando(false);
    }
  }

  const intervencionesAbiertas = intervenciones.filter((i) => i.abierta);
  const intervencionesCerradas = intervenciones.filter((i) => !i.abierta);

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

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Intervenciones</h2>
              <button
                onClick={() => setShowModalIntervencion(true)}
                disabled={!eventoSeleccionado}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                + Nueva intervención
              </button>
            </div>

            {intervencionesAbiertas.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">En curso</p>
                <TablaIntervenciones intervenciones={intervencionesAbiertas} />
              </div>
            )}

            {intervencionesCerradas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cerradas</p>
                <TablaIntervenciones intervenciones={intervencionesCerradas} />
              </div>
            )}

            {intervenciones.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                Sin intervenciones registradas en este evento.
              </p>
            )}
          </div>

          <h2 className="text-lg font-semibold text-slate-800 mb-3">Dotaciones</h2>
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

      {showModalIntervencion && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModalIntervencion(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nueva intervención</h2>

            {errorIntervencion && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                {errorIntervencion}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación activada *</label>
                <select
                  value={formIntervencion.dotacionActivaId}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, dotacionActivaId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleccionar dotación...</option>
                  {estadoUCO?.dotaciones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sintomatología *</label>
                <select
                  value={formIntervencion.sintomatologiaId}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, sintomatologiaId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleccionar sintomatología...</option>
                  {sintomatologias.map((s) => (
                    <option key={s.id} value={s.id}>{s.tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gravedad *</label>
                <div className="flex gap-2">
                  {(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'] as GravedadIntervencion[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormIntervencion((p) => ({ ...p, gravedad: g }))}
                      className={`flex-1 text-xs py-1.5 rounded-md font-medium border transition-colors
                        ${formIntervencion.gravedad === g
                          ? GRAVEDAD_STYLES[g] + ' border-transparent'
                          : 'border-slate-300 text-slate-600'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora de aviso</label>
                <input
                  type="datetime-local"
                  value={formIntervencion.horaAviso}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, horaAviso: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación de apoyo</label>
                <select
                  value={formIntervencion.dotacionApoyoId}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, dotacionApoyoId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Sin apoyo</option>
                  {estadoUCO?.dotaciones
                    .filter((d) => d.id !== Number(formIntervencion.dotacionActivaId))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resolución</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIntervencion.altaEnLugar}
                      onChange={(e) => setFormIntervencion((p) => ({
                        ...p,
                        altaEnLugar: e.target.checked,
                        trasladoClinica: false,
                        trasladoHospital: false,
                      }))}
                    />
                    Alta en el lugar
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIntervencion.trasladoClinica}
                      onChange={(e) => setFormIntervencion((p) => ({
                        ...p,
                        trasladoClinica: e.target.checked,
                        altaEnLugar: false,
                        trasladoHospital: false,
                      }))}
                    />
                    Traslado a clínica
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIntervencion.trasladoHospital}
                      onChange={(e) => setFormIntervencion((p) => ({
                        ...p,
                        trasladoHospital: e.target.checked,
                        altaEnLugar: false,
                        trasladoClinica: false,
                      }))}
                    />
                    Traslado hospitalario
                  </label>
                  {formIntervencion.trasladoHospital && (
                    <input
                      type="text"
                      placeholder="Centro hospitalario de destino"
                      value={formIntervencion.hospitalDestino}
                      onChange={(e) => setFormIntervencion((p) => ({ ...p, hospitalDestino: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm ml-6 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowModalIntervencion(false)}
                disabled={registrando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarIntervencion}
                disabled={registrando}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {registrando ? 'Registrando...' : 'Registrar intervención'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
