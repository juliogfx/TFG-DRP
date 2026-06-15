/**
 * @file app/uco/page.tsx
 * @description Dashboard UCO — vista operativa en tiempo real del evento DRP.
 *
 * Pantalla principal del Coordinador de Operaciones durante el evento.
 * Muestra el estado de todas las dotaciones, contadores clicables y
 * tabla de intervenciones EN CURSO, con actualización automática cada 30s.
 *
 * Tarjetas de dotación con tamaño adaptativo según total de dotaciones:
 *   ≤8 = amplio | ≤16 = normal | ≤24 = compacto | ≤35 = mini | >35 = micro
 *
 * Para gestión completa de intervenciones navegar a /uco/intervenciones.
 */

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EstadoUCO, DotacionEstado } from '@/types/uco';
import type { EventoListItem } from '@/types/evento';
import type {
  IntervencionListItem,
  CreateIntervencionInput,
  UpdateIntervencionInput,
  GravedadIntervencion,
  SintomatologiaItem,
} from '@/types/intervencion';

type ModoTarjeta = 'amplio' | 'normal' | 'compacto' | 'mini' | 'micro';

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

const DOT_STYLES: Record<string, string> = {
  DISPONIBLE: 'bg-green-500',
  EN_INTERVENCION: 'bg-yellow-500',
  NO_OPERATIVA: 'bg-red-500',
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

const GRID_CLASSES: Record<ModoTarjeta, string> = {
  amplio:   'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  normal:   'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3',
  compacto: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3',
  mini:     'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2',
  micro:    'grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-2',
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
 * Convierte ISO string a formato datetime-local (YYYY-MM-DDTHH:mm) en zona local.
 */
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcularModo(numDotaciones: number): ModoTarjeta {
  if (numDotaciones <= 8) return 'amplio';
  if (numDotaciones <= 16) return 'normal';
  if (numDotaciones <= 24) return 'compacto';
  if (numDotaciones <= 35) return 'mini';
  return 'micro';
}

/**
 * Tarjeta de dotación con tamaño y contenido adaptativos al modo.
 * Si la dotación está EN_INTERVENCION, la tarjeta entera es clicable
 * hacia /uco/intervenciones con filtro de dotación activa.
 * Si no, muestra un enlace pequeño "Ver historial →".
 */
function TarjetaDotacion({
  dotacion,
  eventoId,
  modo,
}: {
  dotacion: DotacionEstado;
  eventoId: number;
  modo: ModoTarjeta;
}) {
  const router = useRouter();
  const personalCubierto = dotacion.numeroPersonasAsignadas >= dotacion.personalMinimo;
  const enIntervencion = dotacion.estado === 'EN_INTERVENCION';

  function navegarActiva() {
    router.push(`/uco/intervenciones?eventoId=${eventoId}&dotacionId=${dotacion.id}&filtro=activa`);
  }

  function navegarHistorialDirecto() {
    router.push(`/uco/intervenciones?eventoId=${eventoId}&dotacionId=${dotacion.id}`);
  }

  // MICRO — solo código + punto de color
  if (modo === 'micro') {
    return (
      <div
        onClick={enIntervencion ? navegarActiva : navegarHistorialDirecto}
        className={`rounded border ${CARD_STYLES[dotacion.estado]} p-2 flex items-center gap-1.5 cursor-pointer ${enIntervencion ? 'hover:ring-2 hover:ring-yellow-300' : 'hover:ring-2 hover:ring-slate-300'}`}
        title={enIntervencion
          ? `${dotacion.codigo} — Ver intervención activa`
          : `${dotacion.codigo} — ${ESTADO_LABELS[dotacion.estado]} · Ver historial`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_STYLES[dotacion.estado]}`} />
        <span className="text-xs font-mono font-bold text-slate-900 truncate">{dotacion.codigo}</span>
      </div>
    );
  }

  // MINI — código + badge estado + icono cobertura
  if (modo === 'mini') {
    return (
      <div
        onClick={enIntervencion ? navegarActiva : navegarHistorialDirecto}
        className={`rounded border ${CARD_STYLES[dotacion.estado]} p-2 cursor-pointer ${enIntervencion ? 'hover:ring-2 hover:ring-yellow-300' : 'hover:ring-2 hover:ring-slate-300'}`}
        title={enIntervencion
          ? `${dotacion.codigo} — Ver intervención activa`
          : `${dotacion.codigo} — ${ESTADO_LABELS[dotacion.estado]} · Ver historial`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-mono font-bold text-slate-900 truncate">{dotacion.codigo}</span>
          <span className={`text-[10px] ${personalCubierto ? 'text-green-700' : 'text-red-600'}`}>
            {personalCubierto ? '✓' : '✗'}
          </span>
        </div>
        <span className={`block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-center ${BADGE_STYLES[dotacion.estado]}`}>
          {ESTADO_LABELS[dotacion.estado]}
        </span>
      </div>
    );
  }

  // COMPACTO — código + tipo + badge + cobertura número
  if (modo === 'compacto') {
    return (
      <div
        onClick={enIntervencion ? navegarActiva : navegarHistorialDirecto}
        className={`rounded-lg border-2 ${CARD_STYLES[dotacion.estado]} p-3 cursor-pointer ${enIntervencion ? 'hover:ring-2 hover:ring-yellow-300' : 'hover:ring-2 hover:ring-slate-300'}`}
        title={enIntervencion ? 'Ver intervención activa' : 'Ver historial'}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-mono font-bold text-slate-900">{dotacion.codigo}</span>
          <span className={`text-xs font-semibold ${personalCubierto ? 'text-green-700' : 'text-red-600'}`}>
            {dotacion.numeroPersonasAsignadas}/{dotacion.personalMinimo}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-1">{TIPO_LABELS[dotacion.tipo] ?? dotacion.tipo}</p>
        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${BADGE_STYLES[dotacion.estado]}`}>
          {ESTADO_LABELS[dotacion.estado]}
        </span>
      </div>
    );
  }

  // NORMAL — código, indicativo, tipo, badge, cobertura, personal máx 3
  if (modo === 'normal') {
    return (
      <div
        onClick={enIntervencion ? navegarActiva : navegarHistorialDirecto}
        className={`rounded-lg border-2 ${CARD_STYLES[dotacion.estado]} p-3 cursor-pointer ${enIntervencion ? 'hover:ring-2 hover:ring-yellow-300' : 'hover:ring-2 hover:ring-slate-300'}`}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-mono font-bold text-slate-900">{dotacion.codigo}</span>
            {dotacion.indicativo && (
              <span className="ml-1.5 text-xs text-slate-500 font-mono">{dotacion.indicativo}</span>
            )}
            <p className="text-xs text-slate-500 mt-0.5">{TIPO_LABELS[dotacion.tipo] ?? dotacion.tipo}</p>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[dotacion.estado]}`}>
            {ESTADO_LABELS[dotacion.estado]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs mb-1">
          <span className={`font-semibold ${personalCubierto ? 'text-green-700' : 'text-red-600'}`}>
            👤 {dotacion.numeroPersonasAsignadas}/{dotacion.personalMinimo}
          </span>
        </div>
        {dotacion.personal.length > 0 && (
          <div className="border-t border-slate-200 pt-1 mt-1 space-y-0.5">
            {dotacion.personal.slice(0, 3).map((p) => (
              <div key={p.id} className="text-xs text-slate-700 truncate">
                {p.nombreCompleto}
              </div>
            ))}
            {dotacion.personal.length > 3 && (
              <div className="text-xs text-slate-400">+{dotacion.personal.length - 3} más…</div>
            )}
          </div>
        )}
        {enIntervencion ? (
          <p className="text-xs text-yellow-700 mt-2 font-medium">Ver intervención activa →</p>
        ) : (
          <p className="text-xs text-slate-400 mt-2">Ver historial →</p>
        )}
      </div>
    );
  }

  // AMPLIO — todo
  return (
    <div
      onClick={enIntervencion ? navegarActiva : navegarHistorialDirecto}
      className={`rounded-lg border-2 ${CARD_STYLES[dotacion.estado]} p-4 cursor-pointer ${enIntervencion ? 'hover:ring-2 hover:ring-yellow-300' : 'hover:ring-2 hover:ring-slate-300'}`}
    >
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
      {enIntervencion ? (
        <p className="text-xs text-yellow-700 mt-2 font-medium">Ver intervención activa →</p>
      ) : (
        <p className="text-xs text-slate-400 mt-2">Ver historial →</p>
      )}
    </div>
  );
}

function TablaIntervenciones({
  intervenciones,
  onRowClick,
}: {
  intervenciones: IntervencionListItem[];
  onRowClick?: (i: IntervencionListItem) => void;
}) {
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
            <tr
              key={i.id}
              onClick={() => onRowClick?.(i)}
              className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
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

function UCOContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventoIdParam = searchParams.get('eventoId');
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<number | null>(
    eventoIdParam ? Number(eventoIdParam) : null
  );
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

  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const [modalEditar, setModalEditar] = useState<IntervencionListItem | null>(null);
  const [formEditar, setFormEditar] = useState<UpdateIntervencionInput>({});
  const [guardando, setGuardando] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

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
      // Cambiar dotación a EN_INTERVENCION automáticamente
      if (body.dotacionActivaId) {
        fetch(`/api/dotaciones/${body.dotacionActivaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'EN_INTERVENCION' }),
        }).catch(console.error);
        setEstadoUCO((prev) => prev ? {
          ...prev,
          dotaciones: prev.dotaciones.map((d) =>
            d.id === body.dotacionActivaId
              ? { ...d, estado: 'EN_INTERVENCION' as const }
              : d
          ),
        } : prev);
      }
      await fetchEstado(true);
      setShowModalIntervencion(false);
      setFormIntervencion(FORM_INTERVENCION_INICIAL);
    } catch (e) {
      setErrorIntervencion(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setRegistrando(false);
    }
  }

  async function handleGuardarEdicion() {
    if (!modalEditar) return;
    setErrorEditar(null);
    setGuardando(true);
    try {
      const res = await fetch(
        `/api/intervenciones/${modalEditar.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formEditar),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(
        json.error ?? `Error ${res.status}`
      );
      setIntervenciones((prev) =>
        prev.map((i) => i.id === json.data.id ? json.data : i)
      );
      setModalEditar(null);
    } catch (e) {
      setErrorEditar(
        e instanceof Error ? e.message : 'Error al guardar'
      );
    } finally {
      setGuardando(false);
    }
  }

  const intervencionesAbiertas = intervenciones.filter((i) => i.abierta);

  const eventosFiltrados = eventos.filter((ev) => {
    if (busquedaEvento && !ev.nombre.toLowerCase().includes(busquedaEvento.toLowerCase())) return false;
    if (filtroFechaDesde && ev.fecha < filtroFechaDesde) return false;
    if (filtroFechaHasta && ev.fecha > filtroFechaHasta) return false;
    return true;
  });
  const ultimaActualizacion = estadoUCO
    ? new Date(estadoUCO.actualizadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  const numDotaciones = estadoUCO?.dotaciones.length ?? 0;
  const modoTarjeta: ModoTarjeta = calcularModo(numDotaciones);

  function urlIntervenciones(filtro?: string) {
    const params = new URLSearchParams();
    if (eventoSeleccionado) params.set('eventoId', String(eventoSeleccionado));
    if (filtro) params.set('filtro', filtro);
    return `/uco/intervenciones?${params.toString()}`;
  }

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

      <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={busquedaEvento}
            onChange={(e) => setBusquedaEvento(e.target.value)}
            placeholder="Buscar evento por nombre..."
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={eventoSeleccionado ?? ''}
            onChange={(e) => {
              const nuevoEvento = e.target.value ? Number(e.target.value) : null;
              setEventoSeleccionado(nuevoEvento);
              setBusquedaEvento('');
              if (!nuevoEvento) {
                setEstadoUCO(null);
                setIntervenciones([]);
              }
            }}
            className="flex-1 max-w-xs border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona un evento...</option>
            {eventosFiltrados.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre} — {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 items-center">
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
            onClick={() => {
              setBusquedaEvento('');
              setFiltroFechaDesde('');
              setFiltroFechaHasta('');
              setEventoSeleccionado(null);
              setEstadoUCO(null);
              setIntervenciones([]);
            }}
            className="self-end text-xs text-blue-600 hover:text-blue-800 font-medium pb-1.5"
          >
            Limpiar
          </button>
          {eventos.length > 0 && (
            <span className="self-end text-xs text-slate-400 pb-1.5">
              {eventosFiltrados.length} de {eventos.length} eventos
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {cargando && <div className="text-center py-12 text-slate-500">Cargando estado del evento...</div>}

      {!cargando && estadoUCO && (
        <>
          <div className="flex items-center flex-wrap gap-3 mb-1">
            <h2 className="text-xl font-semibold text-slate-900">{estadoUCO.nombreEvento}</h2>
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
          <p className="text-sm text-slate-500 mb-4">
            {new Date(estadoUCO.fechaEvento + 'T00:00:00').toLocaleDateString('es-ES', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>

          {/* Contadores clicables */}
          <div className="grid grid-cols-4 gap-4 mb-2">
            <button
              onClick={() => router.push(urlIntervenciones())}
              title="Ver intervenciones"
              className="bg-white border border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition"
            >
              <p className="text-3xl font-bold text-slate-900">{estadoUCO.contadores.totalIntervenciones}</p>
              <p className="text-xs text-slate-500 mt-1">Intervenciones</p>
            </button>
            <button
              onClick={() => router.push(urlIntervenciones('alta'))}
              title="Ver intervenciones con alta en lugar"
              className="bg-white border border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition"
            >
              <p className="text-3xl font-bold text-blue-600">{estadoUCO.contadores.altasEnLugar}</p>
              <p className="text-xs text-slate-500 mt-1">Altas en lugar</p>
            </button>
            <button
              onClick={() => router.push(urlIntervenciones('clinica'))}
              title="Ver traslados a clínica"
              className="bg-white border border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition"
            >
              <p className="text-3xl font-bold text-orange-600">{estadoUCO.contadores.trasladosClinica}</p>
              <p className="text-xs text-slate-500 mt-1">Traslados clínica</p>
            </button>
            <button
              onClick={() => router.push(urlIntervenciones('hospital'))}
              title="Ver traslados a hospital"
              className="bg-white border border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition"
            >
              <p className="text-3xl font-bold text-red-600">{estadoUCO.contadores.trasladosHospital}</p>
              <p className="text-xs text-slate-500 mt-1">Traslados hospital</p>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-8">
            Los contadores reflejan las intervenciones médicas registradas en el sistema durante el evento.
            El estado operativo de las dotaciones se gestiona desde el módulo Dotaciones.
          </p>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Intervenciones en curso</h2>
              <div className="flex gap-3 items-center">
                <Link
                  href={urlIntervenciones()}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver todas →
                </Link>
                <button
                  onClick={() => setShowModalIntervencion(true)}
                  disabled={!eventoSeleccionado}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  + Nueva intervención
                </button>
              </div>
            </div>

            {intervencionesAbiertas.length > 0 ? (
              <TablaIntervenciones
                intervenciones={intervencionesAbiertas}
                onRowClick={(i) => {
                  setFormEditar({
                    dotacionActivaId: i.dotacionActiva.id,
                    sintomatologiaId: i.sintomatologia?.id,
                    gravedad: i.gravedad,
                    horaAviso: i.horaAviso,
                    horaLlegada: i.horaLlegada,
                    horaFinal: i.horaFinal,
                    dotacionApoyoId: i.dotacionApoyo?.id ?? null,
                    altaEnLugar: i.altaEnLugar,
                    trasladoClinica: i.trasladoClinica,
                    trasladoHospital: i.trasladoHospital,
                    hospitalDestino: i.hospitalDestino,
                  });
                  setModalEditar(i);
                  setErrorEditar(null);
                }}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                Sin intervenciones activas en este momento.
              </p>
            )}
          </div>

          <div className="flex items-center mb-3">
            <h2 className="text-lg font-semibold text-slate-800">Estado de dotaciones</h2>
            <span className="text-xs text-slate-400 ml-2">
              ({numDotaciones} dotaciones · modo {modoTarjeta})
            </span>
          </div>
          {estadoUCO.dotaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No hay dotaciones activas para este evento.</div>
          ) : (
            <div className={GRID_CLASSES[modoTarjeta]}>
              {estadoUCO.dotaciones.map((dotacion) => (
                <TarjetaDotacion
                  key={dotacion.id}
                  dotacion={dotacion}
                  eventoId={eventoSeleccionado!}
                  modo={modoTarjeta}
                />
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
                        ...p, altaEnLugar: e.target.checked, trasladoClinica: false, trasladoHospital: false,
                      }))}
                    />
                    Alta en el lugar
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIntervencion.trasladoClinica}
                      onChange={(e) => setFormIntervencion((p) => ({
                        ...p, trasladoClinica: e.target.checked, altaEnLugar: false, trasladoHospital: false,
                      }))}
                    />
                    Traslado a clínica
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIntervencion.trasladoHospital}
                      onChange={(e) => setFormIntervencion((p) => ({
                        ...p, trasladoHospital: e.target.checked, altaEnLugar: false, trasladoClinica: false,
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

      {/* Modal editar intervención (acceso directo desde el dashboard) */}
      {modalEditar && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setModalEditar(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Editar intervención #{modalEditar.numeroIntervencion}
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${modalEditar.abierta ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {modalEditar.abierta ? 'En curso' : 'Cerrada'}
                </span>
              </h2>
            </div>

            {errorEditar && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{errorEditar}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación activada</label>
                <select value={formEditar.dotacionActivaId ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, dotacionActivaId: Number(e.target.value) || undefined }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  {estadoUCO?.dotaciones.map((d) => <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sintomatología</label>
                <select value={formEditar.sintomatologiaId ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, sintomatologiaId: Number(e.target.value) || undefined }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  {sintomatologias.map((s) => <option key={s.id} value={s.id}>{s.tipo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gravedad</label>
                <div className="flex gap-2">
                  {(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'] as GravedadIntervencion[]).map((g) => (
                    <button key={g} type="button"
                      onClick={() => setFormEditar((p) => ({ ...p, gravedad: g }))}
                      className={`flex-1 text-xs py-1.5 rounded-md font-medium border transition-colors
                        ${formEditar.gravedad === g ? GRAVEDAD_STYLES[g] + ' border-transparent' : 'border-slate-300 text-slate-600'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hora aviso</label>
                  <input type="datetime-local" value={isoToDatetimeLocal(formEditar.horaAviso ?? null)}
                    onChange={(e) => setFormEditar((p) => ({ ...p, horaAviso: e.target.value || null }))}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hora llegada</label>
                  <input type="datetime-local" value={isoToDatetimeLocal(formEditar.horaLlegada ?? null)}
                    onChange={(e) => setFormEditar((p) => ({ ...p, horaLlegada: e.target.value || null }))}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hora final</label>
                  <input type="datetime-local" value={isoToDatetimeLocal(formEditar.horaFinal ?? null)}
                    onChange={(e) => setFormEditar((p) => ({ ...p, horaFinal: e.target.value || null }))}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-xs" />
                </div>
              </div>
              <p className="text-xs text-slate-400 -mt-2">Al rellenar &quot;Hora final&quot;, la intervención pasa a estado cerrada.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación de apoyo</label>
                <select value={formEditar.dotacionApoyoId ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, dotacionApoyoId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Sin apoyo</option>
                  {estadoUCO?.dotaciones.filter((d) => d.id !== formEditar.dotacionActivaId).map((d) => (
                    <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resolución</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={!!formEditar.altaEnLugar}
                      onChange={(e) => setFormEditar((p) => ({ ...p, altaEnLugar: e.target.checked, trasladoClinica: e.target.checked ? false : p.trasladoClinica, trasladoHospital: e.target.checked ? false : p.trasladoHospital }))} />
                    Alta en el lugar
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={!!formEditar.trasladoClinica}
                      onChange={(e) => setFormEditar((p) => ({ ...p, trasladoClinica: e.target.checked, altaEnLugar: e.target.checked ? false : p.altaEnLugar, trasladoHospital: e.target.checked ? false : p.trasladoHospital }))} />
                    Traslado a clínica
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={!!formEditar.trasladoHospital}
                      onChange={(e) => setFormEditar((p) => ({ ...p, trasladoHospital: e.target.checked, altaEnLugar: e.target.checked ? false : p.altaEnLugar, trasladoClinica: e.target.checked ? false : p.trasladoClinica }))} />
                    Traslado hospitalario
                  </label>
                  {formEditar.trasladoHospital && (
                    <input type="text" placeholder="Centro hospitalario de destino" value={formEditar.hospitalDestino ?? ''}
                      onChange={(e) => setFormEditar((p) => ({ ...p, hospitalDestino: e.target.value || null }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm ml-6" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setModalEditar(null)} disabled={guardando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={guardando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UCOPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500">Cargando...</div>}>
      <UCOContent />
    </Suspense>
  );
}
