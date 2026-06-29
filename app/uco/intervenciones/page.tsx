'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type {
  IntervencionListItem,
  CreateIntervencionInput,
  UpdateIntervencionInput,
  GravedadIntervencion,
  EstadoIntervencion,
  ResolucionIntervencion,
  SintomatologiaItem,
} from '@/types/intervencion';
import type { DotacionListItem } from '@/types/dotacion';
import type { EventoListItem } from '@/types/evento';
import DateTimeInput from '@/app/components/DateTimeInput';

const TIPO_LABELS: Record<string, string> = {
  AMBULANCIA: 'Ambulancia', BOTIQUIN: 'Botiquín', UVI: 'UVI Móvil',
  SVB: 'SVB', CLINICA: 'Clínica', AVANZADA: 'Avanzada',
  BANQUILLO: 'Banquillo', LIMA: 'LIMA', UCO_UNIT: 'UCO',
};

const GRAVEDAD_STYLES: Record<string, string> = {
  LEVE:     'bg-green-100 text-green-700',
  MODERADA: 'bg-yellow-100 text-yellow-700',
  GRAVE:    'bg-orange-100 text-orange-700',
  CRITICA:  'bg-red-100 text-red-700',
};

const ESTADO_STYLES: Record<EstadoIntervencion, string> = {
  PENDIENTE_DOTACION: 'bg-orange-100 text-orange-700',
  EN_CURSO:           'bg-blue-100 text-blue-700',
  CERRADA:            'bg-slate-100 text-slate-600',
};

const ESTADO_LABEL: Record<EstadoIntervencion, string> = {
  PENDIENTE_DOTACION: 'Pend. dot.',
  EN_CURSO:           'En curso',
  CERRADA:            'Cerrada',
};

const RESOLUCION_LABEL: Record<ResolucionIntervencion, string> = {
  ALTA_EN_LUGAR:         'Alta en el lugar',
  TRASLADO_CLINICA:      'Traslado a clínica',
  ALTA_EN_CLINICA:       'Alta en clínica',
  TRASLADO_HOSPITALARIO: 'Traslado hospitalario',
};

const ESTADO_DOT_LABEL: Record<string, string> = {
  CL0_DISPONIBLE:           'CL0 Disponible',
  CL1_EN_CAMINO:            'CL1 En camino',
  CL2_EN_INTERVENCION:      'CL2 En intervención',
  CL3_NO_DISPONIBLE:        'CL3 No disponible',
  CL5_SOLICITUD_AYUDA:      'CL5 Solicitud ayuda',
  CL6_SITUACION_CONFLICTIVA:'CL6 Sit. conflictiva',
};

/** Aviso F2.6: dotación no disponible. No bloquea, solo informa. */
function AvisoDotacionNoDisponible({
  dotacionId,
  dotaciones,
  dotacionAnteriorId,
}: {
  dotacionId: number | null;
  dotaciones: DotacionListItem[];
  dotacionAnteriorId?: number | null;
}) {
  if (!dotacionId) return null;
  if (dotacionAnteriorId != null && dotacionId === dotacionAnteriorId) return null;
  const dot = dotaciones.find((d) => d.id === dotacionId);
  if (!dot || dot.estado === 'CL0_DISPONIBLE') return null;
  return (
    <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
      ⚠ La dotación <span className="font-mono font-semibold">{dot.codigo}</span> está en{' '}
      <span className="font-medium">{ESTADO_DOT_LABEL[dot.estado] ?? dot.estado}</span> — asignarla
      igualmente la pondrá en <span className="font-medium">CL1 En camino</span>.
    </p>
  );
}

const FORM_INICIAL = {
  dotacionActivaId: '' as number | '',
  sintomatologiaId: '' as number | '',
  gravedad: 'LEVE' as GravedadIntervencion,
  uco: 'UCO1',
  sector: '',
  lugar: '',
  horaAviso: '',
  dotacionApoyoId: '' as number | '',
  altaEnLugar: false,
  trasladoClinica: false,
  trasladoHospital: false,
  hospitalDestino: '',
};

function formatearHora(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function IntervencionesContent() {
  const searchParams = useSearchParams();
  const eventoIdParam = searchParams.get('eventoId');
  const eventoIdInicial = eventoIdParam ? Number(eventoIdParam) : null;
  const filtroParam = searchParams.get('filtro');
  const dotacionIdParam = searchParams.get('dotacionId');
  const abrirIntervencionParam = searchParams.get('abrirIntervencion');

  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(eventoIdInicial);
  const [intervenciones, setIntervenciones] = useState<IntervencionListItem[]>([]);
  const [dotaciones, setDotaciones] = useState<DotacionListItem[]>([]);
  const [sintomatologias, setSintomatologias] = useState<SintomatologiaItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros de evento (búsqueda texto + fechas)
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  // Filtro por estado de evento (afecta a /api/eventos). Default ACTIVO.
  const [filtroEstadoEvento, setFiltroEstadoEvento] = useState<'TODOS' | 'PENDIENTE' | 'ACTIVO' | 'FINALIZADO'>('ACTIVO');

  // Filtros de intervenciones
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'EN_CURSO' | 'CERRADAS'>(
    filtroParam === 'activa' ? 'EN_CURSO' : 'TODAS'
  );
  const [filtroDotacion, setFiltroDotacion] = useState<number | ''>(
    dotacionIdParam ? Number(dotacionIdParam) : ''
  );
  const [filtroGravedad, setFiltroGravedad] = useState<'TODAS' | GravedadIntervencion>('TODAS');
  const [filtroResolucion, setFiltroResolucion] = useState<'TODAS' | 'alta' | 'clinica' | 'hospital'>(
    filtroParam === 'alta' ? 'alta'
    : filtroParam === 'clinica' ? 'clinica'
    : filtroParam === 'hospital' ? 'hospital'
    : 'TODAS'
  );

  // Modal nueva intervención
  const [showNueva, setShowNueva] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errorNueva, setErrorNueva] = useState<string | null>(null);
  const [formNueva, setFormNueva] = useState(FORM_INICIAL);

  // Modal ver/editar intervención
  const [modalIntervencion, setModalIntervencion] = useState<{
    intervencion: IntervencionListItem;
    modo: 'ver' | 'editar';
  } | null>(null);
  const [formEditar, setFormEditar] = useState<UpdateIntervencionInput>({});
  const [guardando, setGuardando] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  // Sintomatologías: catálogo estable, se carga una sola vez.
  useEffect(() => {
    async function cargarSint() {
      try {
        const resSint = await fetch('/api/sintomatologias');
        const jsonSint = await resSint.json();
        setSintomatologias(jsonSint.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar sintomatologías');
      }
    }
    cargarSint();
  }, []);

  // Eventos: recarga cuando cambia el filtro de estado.
  useEffect(() => {
    async function cargarEventos() {
      try {
        const url = filtroEstadoEvento === 'TODOS'
          ? '/api/eventos'
          : `/api/eventos?estado=${filtroEstadoEvento}`;
        const resEv = await fetch(url);
        const jsonEv = await resEv.json();
        setEventos(jsonEv.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar eventos');
      }
    }
    cargarEventos();
  }, [filtroEstadoEvento]);

  const recargar = useCallback(async () => {
    if (!eventoId) return;
    setCargando(true);
    setError(null);
    try {
      const [resInt, resDot] = await Promise.all([
        fetch(`/api/intervenciones?eventoId=${eventoId}`),
        fetch(`/api/dotaciones?eventoId=${eventoId}`),
      ]);
      const jsonInt = await resInt.json();
      const jsonDot = await resDot.json();
      setIntervenciones(jsonInt.data ?? []);
      setDotaciones(jsonDot.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, [eventoId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => {
    // No incluyo filtroDotacion porque viene del URL (?dotacionId=) y se
    // gestiona en su propio useEffect debajo. El onChange del select de evento
    // ya lo resetea explícitamente cuando el usuario cambia de evento.
    setFiltroEstado('TODAS');
    setFiltroGravedad('TODAS');
    setFiltroResolucion('TODAS');
  }, [eventoId]);

  // Sync filtroDotacion con ?dotacionId= cada vez que cambia el URL.
  useEffect(() => {
    setFiltroDotacion(dotacionIdParam ? Number(dotacionIdParam) : '');
  }, [dotacionIdParam]);

  useEffect(() => {
    if (filtroParam === 'alta' || filtroParam === 'clinica' || filtroParam === 'hospital') {
      setFiltroResolucion(filtroParam);
    } else {
      setFiltroResolucion('TODAS');
    }
  }, [filtroParam]);

  // Deep-link a una intervención concreta: cuando llega ?abrirIntervencion=N
  // y la lista ya está cargada, abrimos el modal directamente en modo editar
  // (lo que el dashboard espera cuando el UCO pincha "Ver intervención activa").
  useEffect(() => {
    if (!abrirIntervencionParam) return;
    const objetivoId = Number(abrirIntervencionParam);
    if (!Number.isFinite(objetivoId)) return;
    const i = intervenciones.find((x) => x.id === objetivoId);
    if (i) {
      setFormEditar({
        dotacionActivaId: i.dotacionActiva?.id ?? null,
        sintomatologiaId: i.sintomatologia?.id,
        gravedad: i.gravedad,
        uco: i.uco,
        sector: i.sector,
        lugar: i.lugar,
        resolucion: i.resolucion,
        parte: i.parte,
        horaAviso: i.horaAviso,
        horaLlegada: i.horaLlegada,
        horaFinal: i.horaFinal,
        dotacionApoyoId: i.dotacionApoyo?.id ?? null,
        hospitalDestino: i.hospitalDestino,
      });
      setModalIntervencion({ intervencion: i, modo: 'editar' });
      setErrorEditar(null);
    }
  }, [abrirIntervencionParam, intervenciones]);

  /** Resetea por completo todos los filtros y datos cargados. */
  function limpiarTodo() {
    setBusquedaEvento('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroEstadoEvento('ACTIVO');
    setEventoId(null);
    setIntervenciones([]);
    setDotaciones([]);
    setFiltroDotacion('');
    setFiltroEstado('TODAS');
    setFiltroGravedad('TODAS');
    setFiltroResolucion('TODAS');
  }

  async function handleRegistrar() {
    setErrorNueva(null);
    if (!formNueva.sintomatologiaId) return setErrorNueva('Selecciona la sintomatología.');
    if (!eventoId) return;
    setRegistrando(true);
    try {
      const body: CreateIntervencionInput = {
        eventoId,
        dotacionActivaId: formNueva.dotacionActivaId ? Number(formNueva.dotacionActivaId) : null,
        sintomatologiaId: Number(formNueva.sintomatologiaId),
        gravedad: formNueva.gravedad,
        uco: formNueva.uco,
        sector: formNueva.sector.trim() || null,
        lugar: formNueva.lugar.trim() || null,
        horaAviso: formNueva.horaAviso || undefined,
        dotacionApoyoId: formNueva.dotacionApoyoId ? Number(formNueva.dotacionApoyoId) : undefined,
        altaEnLugar: formNueva.altaEnLugar,
        trasladoClinica: formNueva.trasladoClinica,
        trasladoHospital: formNueva.trasladoHospital,
        hospitalDestino: formNueva.trasladoHospital ? formNueva.hospitalDestino || undefined : undefined,
      };
      const res = await fetch('/api/intervenciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setIntervenciones((prev) => [json.data, ...prev]);
      setShowNueva(false);
      setFormNueva(FORM_INICIAL);
    } catch (e) {
      setErrorNueva(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setRegistrando(false);
    }
  }

  function abrirModalVer(i: IntervencionListItem) {
    setModalIntervencion({ intervencion: i, modo: 'ver' });
    setErrorEditar(null);
  }

  function pasarAEditar() {
    if (!modalIntervencion) return;
    const i = modalIntervencion.intervencion;
    setFormEditar({
      dotacionActivaId: i.dotacionActiva?.id ?? null,
      sintomatologiaId: i.sintomatologia?.id,
      gravedad: i.gravedad,
      uco: i.uco,
      sector: i.sector,
      lugar: i.lugar,
      resolucion: i.resolucion,
      parte: i.parte,
      horaAviso: i.horaAviso,
      horaLlegada: i.horaLlegada,
      horaFinal: i.horaFinal,
      dotacionApoyoId: i.dotacionApoyo?.id ?? null,
      hospitalDestino: i.hospitalDestino,
    });
    setModalIntervencion({ ...modalIntervencion, modo: 'editar' });
  }

  async function handleGuardar() {
    if (!modalIntervencion) return;
    setErrorEditar(null);

    // Validación local: para cerrar (horaFinal) se exige parte + resolución.
    if (formEditar.horaFinal) {
      if (!formEditar.parte || formEditar.parte.trim() === '') {
        return setErrorEditar('Para registrar la hora final hay que seleccionar el parte (dotación que rellena el parte).');
      }
      if (!formEditar.resolucion) {
        return setErrorEditar('Para registrar la hora final hay que indicar la resolución.');
      }
    }

    setGuardando(true);
    try {
      const res = await fetch(`/api/intervenciones/${modalIntervencion.intervencion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEditar),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setIntervenciones((prev) => prev.map((i) => i.id === json.data.id ? json.data : i));
      setModalIntervencion({ intervencion: json.data, modo: 'ver' });
    } catch (e) {
      setErrorEditar(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  // Lista de eventos filtrada por texto y fechas
  const eventosFiltrados = eventos.filter((ev) => {
    if (busquedaEvento && !ev.nombre.toLowerCase().includes(busquedaEvento.toLowerCase())) return false;
    if (filtroFechaDesde && ev.fecha < filtroFechaDesde) return false;
    if (filtroFechaHasta && ev.fecha > filtroFechaHasta) return false;
    return true;
  });

  // Aplicar filtros de intervenciones
  const filtradas = intervenciones.filter((i) => {
    if (filtroEstado === 'EN_CURSO' && !i.abierta) return false;
    if (filtroEstado === 'CERRADAS' && i.abierta) return false;
    if (filtroDotacion && i.dotacionActiva?.id !== Number(filtroDotacion)) return false;
    if (filtroGravedad !== 'TODAS' && i.gravedad !== filtroGravedad) return false;
    if (filtroResolucion === 'alta' && !i.altaEnLugar) return false;
    if (filtroResolucion === 'clinica' && !i.trasladoClinica) return false;
    if (filtroResolucion === 'hospital' && !i.trasladoHospital) return false;
    return true;
  });

  const eventoActual = eventos.find((e) => e.id === eventoId);

  return (
    <div>
      <div className="mb-4">
        <Link href={`/uco${eventoId ? `?eventoId=${eventoId}` : ''}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Volver al dashboard UCO
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Intervenciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {eventoActual ? eventoActual.nombre : 'Selecciona un evento'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={recargar}
            disabled={cargando || !eventoId}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : '↻ Recargar'}
          </button>
          <button
            onClick={() => { setFormNueva(FORM_INICIAL); setErrorNueva(null); setShowNueva(true); }}
            disabled={!eventoId}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            + Nueva intervención
          </button>
        </div>
      </div>

      {/* Bloque unificado de filtros — fila 1: estado + búsqueda + selector evento; fila 2: fechas + filtros intervenciones */}
      <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
        <div className="flex items-end gap-4">
          <div className="w-[150px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado evento</label>
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
          <input
            type="text"
            value={busquedaEvento}
            onChange={(e) => setBusquedaEvento(e.target.value)}
            placeholder="Buscar evento por nombre..."
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={eventoId ?? ''}
            onChange={(e) => {
              const nuevoEvento = e.target.value ? Number(e.target.value) : null;
              setEventoId(nuevoEvento);
              setBusquedaEvento('');
              setFiltroDotacion('');
              setFiltroEstado('TODAS');
              setFiltroGravedad('TODAS');
              setFiltroResolucion('TODAS');
              setIntervenciones([]);
            }}
            className="w-[250px] border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona un evento...</option>
            {eventosFiltrados.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre} — {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
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
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
              disabled={!eventoId}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="TODAS">Todas</option>
              <option value="EN_CURSO">En curso</option>
              <option value="CERRADAS">Cerradas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dotación</label>
            <select
              value={filtroDotacion}
              onChange={(e) => setFiltroDotacion(e.target.value ? Number(e.target.value) : '')}
              disabled={!eventoId}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Todas</option>
              {dotaciones.map((d) => (
                <option key={d.id} value={d.id}>{d.codigo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Gravedad</label>
            <select
              value={filtroGravedad}
              onChange={(e) => setFiltroGravedad(e.target.value as typeof filtroGravedad)}
              disabled={!eventoId}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="TODAS">Todas</option>
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="GRAVE">Grave</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Resolución</label>
            <select
              value={filtroResolucion}
              onChange={(e) => setFiltroResolucion(e.target.value as typeof filtroResolucion)}
              disabled={!eventoId}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="TODAS">Todas</option>
              <option value="alta">Alta en lugar</option>
              <option value="clinica">Traslado clínica</option>
              <option value="hospital">Traslado hospital</option>
            </select>
          </div>
          <button
            onClick={limpiarTodo}
            className="self-end text-xs text-blue-600 hover:text-blue-800 font-medium pb-1.5"
          >
            Limpiar
          </button>
          <span className="self-end text-xs text-slate-400 pb-1.5 ml-auto">
            {eventoId
              ? `${filtradas.length} de ${intervenciones.length} intervenciones`
              : `${eventosFiltrados.length} de ${eventos.length} eventos`}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {eventoId && (
        <>
          {/* Tabla */}
          {filtradas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
              {intervenciones.length === 0
                ? 'Sin intervenciones registradas en este evento.'
                : 'Ninguna intervención coincide con los filtros aplicados.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full table-fixed text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="w-[6%] text-left px-3 py-2 font-medium text-slate-600">Nº</th>
                    <th className="w-[9%] text-left px-3 py-2 font-medium text-slate-600">Estado</th>
                    <th className="w-[10%] text-left px-3 py-2 font-medium text-slate-600">Dotación</th>
                    <th className="w-[22%] text-left px-3 py-2 font-medium text-slate-600">Sintomatología</th>
                    <th className="w-[11%] text-left px-3 py-2 font-medium text-slate-600">Gravedad</th>
                    <th className="w-[8%] text-left px-3 py-2 font-medium text-slate-600">Aviso</th>
                    <th className="w-[26%] text-left px-3 py-2 font-medium text-slate-600">Resolución</th>
                    <th className="w-[8%] text-right px-3 py-2 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtradas.map((i) => {
                    const sintomatologia = i.sintomatologia?.tipo ?? '—';
                    const resolucion = i.resolucion
                      ? (i.resolucion === 'TRASLADO_HOSPITALARIO' && i.hospitalDestino
                          ? `${RESOLUCION_LABEL[i.resolucion]} · ${i.hospitalDestino}`
                          : RESOLUCION_LABEL[i.resolucion])
                      : '—';
                    return (
                    <tr
                      key={i.id}
                      onClick={() => abrirModalVer(i)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2 font-mono font-bold text-slate-900 truncate">#{i.numeroIntervencion}</td>
                      <td className="px-3 py-2 truncate">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${ESTADO_STYLES[i.estado]}`}>
                          {ESTADO_LABEL[i.estado]}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 truncate">
                        {i.dotacionActiva?.codigo ?? '—'}
                        {i.dotacionApoyo && <span className="text-slate-400"> +{i.dotacionApoyo.codigo}</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 truncate" title={sintomatologia}>{sintomatologia}</td>
                      <td className="px-3 py-2 truncate">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${GRAVEDAD_STYLES[i.gravedad]}`}>
                          {i.gravedad}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-mono truncate">
                        {i.horaAviso ? new Date(i.horaAviso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 truncate" title={resolucion}>{resolucion}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormEditar({
                              dotacionActivaId: i.dotacionActiva?.id ?? null,
                              sintomatologiaId: i.sintomatologia?.id,
                              gravedad: i.gravedad,
                              uco: i.uco,
                              sector: i.sector,
                              lugar: i.lugar,
                              resolucion: i.resolucion,
                              parte: i.parte,
                              horaAviso: i.horaAviso,
                              horaLlegada: i.horaLlegada,
                              horaFinal: i.horaFinal,
                              dotacionApoyoId: i.dotacionApoyo?.id ?? null,
                              hospitalDestino: i.hospitalDestino,
                            });
                            setModalIntervencion({ intervencion: i, modo: 'editar' });
                            setErrorEditar(null);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal nueva intervención */}
      {showNueva && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNueva(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nueva intervención</h2>
            {errorNueva && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{errorNueva}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">UCO *</label>
                  <select
                    value={formNueva.uco}
                    onChange={(e) => setFormNueva((p) => ({ ...p, uco: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="UCO1">UCO1</option>
                    <option value="UCO2">UCO2</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                  <input
                    type="text"
                    value={formNueva.sector}
                    onChange={(e) => setFormNueva((p) => ({ ...p, sector: e.target.value }))}
                    placeholder="Ej: Sector A, Gol Sur, Acceso Norte..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lugar</label>
                <input
                  type="text"
                  value={formNueva.lugar}
                  onChange={(e) => setFormNueva((p) => ({ ...p, lugar: e.target.value }))}
                  placeholder="Ej: Puerta 7, Fila 3 Asiento 12..."
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación activada</label>
                <select
                  value={formNueva.dotacionActivaId}
                  onChange={(e) => setFormNueva((p) => ({ ...p, dotacionActivaId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Sin asignar (Pendiente dotación)</option>
                  {dotaciones.map((d) => (
                    <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>
                  ))}
                </select>
                <AvisoDotacionNoDisponible
                  dotacionId={formNueva.dotacionActivaId === '' ? null : Number(formNueva.dotacionActivaId)}
                  dotaciones={dotaciones}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sintomatología *</label>
                <select
                  value={formNueva.sintomatologiaId}
                  onChange={(e) => setFormNueva((p) => ({ ...p, sintomatologiaId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleccionar sintomatología...</option>
                  {sintomatologias.map((s) => <option key={s.id} value={s.id}>{s.tipo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gravedad *</label>
                <div className="flex gap-2">
                  {(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'] as GravedadIntervencion[]).map((g) => (
                    <button key={g} type="button"
                      onClick={() => setFormNueva((p) => ({ ...p, gravedad: g }))}
                      className={`flex-1 text-xs py-1.5 rounded-md font-medium border transition-colors
                        ${formNueva.gravedad === g ? GRAVEDAD_STYLES[g] + ' border-transparent' : 'border-slate-300 text-slate-600'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora de aviso</label>
                <input type="datetime-local" value={formNueva.horaAviso}
                  onChange={(e) => setFormNueva((p) => ({ ...p, horaAviso: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación de apoyo</label>
                <select value={formNueva.dotacionApoyoId}
                  onChange={(e) => setFormNueva((p) => ({ ...p, dotacionApoyoId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Sin apoyo</option>
                  {dotaciones.filter((d) => d.id !== Number(formNueva.dotacionActivaId)).map((d) => (
                    <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resolución</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formNueva.altaEnLugar}
                      onChange={(e) => setFormNueva((p) => ({ ...p, altaEnLugar: e.target.checked, trasladoClinica: false, trasladoHospital: false }))} />
                    Alta en el lugar
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formNueva.trasladoClinica}
                      onChange={(e) => setFormNueva((p) => ({ ...p, trasladoClinica: e.target.checked, altaEnLugar: false, trasladoHospital: false }))} />
                    Traslado a clínica
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formNueva.trasladoHospital}
                      onChange={(e) => setFormNueva((p) => ({ ...p, trasladoHospital: e.target.checked, altaEnLugar: false, trasladoClinica: false }))} />
                    Traslado hospitalario
                  </label>
                  {formNueva.trasladoHospital && (
                    <input type="text" placeholder="Centro hospitalario de destino" value={formNueva.hospitalDestino}
                      onChange={(e) => setFormNueva((p) => ({ ...p, hospitalDestino: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm ml-6 focus:outline-none focus:ring-2 focus:ring-red-500" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowNueva(false)} disabled={registrando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleRegistrar} disabled={registrando}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                {registrando ? 'Registrando...' : 'Registrar intervención'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver/editar */}
      {modalIntervencion && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setModalIntervencion(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Intervención #{modalIntervencion.intervencion.numeroIntervencion}
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLES[modalIntervencion.intervencion.estado]}`}>
                  {ESTADO_LABEL[modalIntervencion.intervencion.estado]}
                </span>
              </h2>
            </div>

            {errorEditar && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{errorEditar}</div>}

            {modalIntervencion.modo === 'ver' ? (
              <div className="space-y-3 text-sm">
                <div><span className="text-slate-500">UCO:</span> {modalIntervencion.intervencion.uco}</div>
                {modalIntervencion.intervencion.sector && (
                  <div><span className="text-slate-500">Sector:</span> {modalIntervencion.intervencion.sector}</div>
                )}
                {modalIntervencion.intervencion.lugar && (
                  <div><span className="text-slate-500">Lugar:</span> {modalIntervencion.intervencion.lugar}</div>
                )}
                <div><span className="text-slate-500">Dotación activada:</span> <span className="font-mono">{modalIntervencion.intervencion.dotacionActiva?.codigo ?? '—'}</span></div>
                {modalIntervencion.intervencion.dotacionApoyo && (
                  <div><span className="text-slate-500">Dotación de apoyo:</span> <span className="font-mono">{modalIntervencion.intervencion.dotacionApoyo.codigo}</span></div>
                )}
                <div><span className="text-slate-500">Sintomatología:</span> {modalIntervencion.intervencion.sintomatologia?.tipo ?? '—'}</div>
                <div>
                  <span className="text-slate-500">Gravedad:</span>{' '}
                  <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${GRAVEDAD_STYLES[modalIntervencion.intervencion.gravedad]}`}>
                    {modalIntervencion.intervencion.gravedad}
                  </span>
                </div>
                <div><span className="text-slate-500">Hora de aviso:</span> {formatearHora(modalIntervencion.intervencion.horaAviso)}</div>
                <div><span className="text-slate-500">Hora de llegada:</span> {formatearHora(modalIntervencion.intervencion.horaLlegada)}</div>
                <div><span className="text-slate-500">Hora final:</span> {formatearHora(modalIntervencion.intervencion.horaFinal)}</div>
                <div>
                  <span className="text-slate-500">Resolución:</span>{' '}
                  {modalIntervencion.intervencion.resolucion
                    ? (modalIntervencion.intervencion.resolucion === 'TRASLADO_HOSPITALARIO' && modalIntervencion.intervencion.hospitalDestino
                        ? `${RESOLUCION_LABEL[modalIntervencion.intervencion.resolucion]} · ${modalIntervencion.intervencion.hospitalDestino}`
                        : RESOLUCION_LABEL[modalIntervencion.intervencion.resolucion])
                    : 'Sin definir'}
                </div>
                {modalIntervencion.intervencion.parte && (
                  <div><span className="text-slate-500">Parte:</span> {modalIntervencion.intervencion.parte}</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">UCO</label>
                    <select value={formEditar.uco ?? 'UCO1'}
                      onChange={(e) => setFormEditar((p) => ({ ...p, uco: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                      <option value="UCO1">UCO1</option>
                      <option value="UCO2">UCO2</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                    <input type="text" value={formEditar.sector ?? ''}
                      onChange={(e) => setFormEditar((p) => ({ ...p, sector: e.target.value || null }))}
                      placeholder="Ej: Sector A, Gol Sur..."
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lugar</label>
                  <input type="text" value={formEditar.lugar ?? ''}
                    onChange={(e) => setFormEditar((p) => ({ ...p, lugar: e.target.value || null }))}
                    placeholder="Ej: Puerta 7, Fila 3 Asiento 12..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dotación activada</label>
                  <select value={formEditar.dotacionActivaId ?? ''}
                    onChange={(e) => setFormEditar((p) => ({ ...p, dotacionActivaId: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                    <option value="">Sin asignar</option>
                    {dotaciones.map((d) => <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>)}
                  </select>
                  <AvisoDotacionNoDisponible
                    dotacionId={formEditar.dotacionActivaId ?? null}
                    dotaciones={dotaciones}
                    dotacionAnteriorId={modalIntervencion?.intervencion.dotacionActiva?.id ?? null}
                  />
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
                  <DateTimeInput
                    label="Hora aviso"
                    value={formEditar.horaAviso}
                    onChange={(v) => setFormEditar((p) => ({ ...p, horaAviso: v }))}
                  />
                  <DateTimeInput
                    label="Hora llegada"
                    value={formEditar.horaLlegada}
                    onChange={(v) => setFormEditar((p) => ({ ...p, horaLlegada: v }))}
                  />
                  <DateTimeInput
                    label="Hora final"
                    value={formEditar.horaFinal}
                    onChange={(v) => setFormEditar((p) => ({ ...p, horaFinal: v }))}
                  />
                </div>
                <p className="text-xs text-slate-400 -mt-2">Para registrar &quot;Hora final&quot; deben estar definidos &quot;Parte&quot; y &quot;Resolución&quot;.</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dotación de apoyo</label>
                  <select value={formEditar.dotacionApoyoId ?? ''}
                    onChange={(e) => setFormEditar((p) => ({ ...p, dotacionApoyoId: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                    <option value="">Sin apoyo</option>
                    {dotaciones.filter((d) => d.id !== formEditar.dotacionActivaId).map((d) => (
                      <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Resolución {formEditar.horaFinal && <span className="text-red-600">*</span>}
                  </label>
                  <select value={formEditar.resolucion ?? ''}
                    onChange={(e) => setFormEditar((p) => ({ ...p, resolucion: (e.target.value || null) as ResolucionIntervencion | null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                    <option value="">Sin definir</option>
                    <option value="ALTA_EN_LUGAR">Alta en el lugar</option>
                    <option value="TRASLADO_CLINICA">Traslado a clínica</option>
                    <option value="ALTA_EN_CLINICA">Alta en clínica</option>
                    <option value="TRASLADO_HOSPITALARIO">Traslado hospitalario</option>
                  </select>
                  {formEditar.resolucion === 'TRASLADO_HOSPITALARIO' && (
                    <input type="text" placeholder="Centro hospitalario de destino" value={formEditar.hospitalDestino ?? ''}
                      onChange={(e) => setFormEditar((p) => ({ ...p, hospitalDestino: e.target.value || null }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-2" />
                  )}
                  {formEditar.horaFinal && !formEditar.resolucion && (
                    <p className="text-xs text-red-600 mt-1">La resolución es obligatoria para cerrar la intervención.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Parte {formEditar.horaFinal && <span className="text-red-600">*</span>}
                  </label>
                  <select value={formEditar.parte ?? ''}
                    onChange={(e) => setFormEditar((p) => ({ ...p, parte: e.target.value || null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                    <option value="">Seleccionar dotación que rellena el parte</option>
                    {dotaciones.map((d) => (
                      <option key={d.id} value={d.codigo}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>
                    ))}
                  </select>
                  {formEditar.horaFinal && !formEditar.parte && (
                    <p className="text-xs text-red-600 mt-1">El parte es obligatorio para cerrar la intervención.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              {modalIntervencion.modo === 'ver' ? (
                <>
                  <button onClick={() => setModalIntervencion(null)}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors">Cerrar</button>
                  <button onClick={pasarAEditar}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">Editar</button>
                </>
              ) : (
                <>
                  <button onClick={() => setModalIntervencion({ ...modalIntervencion, modo: 'ver' })} disabled={guardando}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
                  <button onClick={handleGuardar} disabled={guardando}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntervencionesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500">Cargando...</div>}>
      <IntervencionesContent />
    </Suspense>
  );
}
