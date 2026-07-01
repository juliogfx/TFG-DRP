'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type {
  DotacionDetalle,
  PersonaListItem,
  EstadoDotacion,
} from '@/types/dotacion';

const TIPO_LABELS: Record<string, string> = {
  AMBULANCIA: 'Ambulancia', BOTIQUIN: 'Botiquín', UVI: 'UVI Móvil',
  SVB: 'SVB', CLINICA: 'Clínica', AVANZADA: 'Avanzada',
  BANQUILLO: 'Banquillo', LIMA: 'LIMA', UCO_UNIT: 'UCO',
};

const ESTADO_STYLES: Record<string, string> = {
  CL0_DISPONIBLE:           'bg-green-100 text-green-700',
  CL1_EN_CAMINO:            'bg-blue-100 text-blue-700',
  CL2_EN_INTERVENCION:      'bg-red-100 text-red-700',
  CL3_NO_DISPONIBLE:        'bg-gray-100 text-gray-600',
  CL5_SOLICITUD_AYUDA:      'bg-orange-100 text-orange-700',
  CL6_SITUACION_CONFLICTIVA:'bg-purple-100 text-purple-700',
};

const ESTADO_LABELS: Record<string, string> = {
  CL0_DISPONIBLE:           'CL0 Disponible',
  CL1_EN_CAMINO:            'CL1 En camino',
  CL2_EN_INTERVENCION:      'CL2 En intervención',
  CL3_NO_DISPONIBLE:        'CL3 No disponible',
  CL5_SOLICITUD_AYUDA:      'CL5 Solicitud ayuda',
  CL6_SITUACION_CONFLICTIVA:'CL6 Sit. conflictiva',
};

const ROLES_DOTACION = [
  'Conductor', 'Socorrista', 'Enfermero/a', 'Médico/a',
  'Técnico Emergencias Sanitarias', 'Coordinador/a', 'Prácticas',
];

/**
 * Formatea una fecha ISO como cadena local española corta.
 */
function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Construye el valor inicial sugerido para un input datetime-local
 * combinando la fecha del evento (YYYY-MM-DD) con una hora ISO opcional.
 * Devuelve cadena vacía si no hay hora — el input queda sin sugerencia.
 */
function calcularTurnoPropuesto(fecha: string, hora: string | null): string {
  if (!hora) return '';
  const d = new Date(hora);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const horaCorta = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${fecha}T${horaCorta}`;
}

export default function DotacionDetallePage() {
  const router = useRouter();
  const params = useParams();
  const dotacionId = Number(params.id);

  const [dotacion, setDotacion] = useState<DotacionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalDisponible, setPersonalDisponible] = useState<PersonaListItem[]>([]);
  const [personaSeleccionada, setPersonaSeleccionada] = useState<number | ''>('');
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [turnoInicio, setTurnoInicio] = useState('');
  const [turnoFin, setTurnoFin] = useState('');
  const [asignando, setAsignando] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [desasignando, setDesasignando] = useState<number | null>(null);
  // Contador para forzar recarga de PlazasSeccion tras asignar/desasignar
  // desde las secciones vecinas — ambas escriben ya sobre PlazaDotacion.
  const [plazasRefreshTick, setPlazasRefreshTick] = useState(0);

  useEffect(() => {
    if (!dotacionId || isNaN(dotacionId)) { setNoEncontrada(true); setCargando(false); return; }

    async function cargarDatos() {
      try {
        const [resDotacion, resPersonal] = await Promise.all([
          fetch(`/api/dotaciones/${dotacionId}`),
          fetch('/api/personal'),
        ]);
        if (resDotacion.status === 404) { setNoEncontrada(true); return; }
        if (!resDotacion.ok) throw new Error(`Error ${resDotacion.status}`);
        const [dataDotacion, dataPersonal] = await Promise.all([
          resDotacion.json(),
          resPersonal.json(),
        ]);
        setDotacion(dataDotacion.data);
        setPersonalDisponible(dataPersonal.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar los datos');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [dotacionId]);

  /**
   * Cuando la dotación se carga, propone como turno inicial los valores
   * horaIncorporacionSspp / horaFinalizacionSspp del evento (si están definidos).
   * Solo aplica si el usuario aún no ha editado manualmente los campos.
   */
  useEffect(() => {
    if (!dotacion) return;
    if (!turnoInicio) {
      const horaIso = dotacion.evento.horaIncorporacionSspp;
      const horaHHMM = dotacion.evento.horaInicioEvento;
      setTurnoInicio(
        calcularTurnoPropuesto(dotacion.evento.fecha, horaIso)
        || (horaHHMM ? `${dotacion.evento.fecha}T${horaHHMM}` : '')
      );
    }
    if (!turnoFin) {
      const horaIso = dotacion.evento.horaFinalizacionSspp;
      const horaHHMM = dotacion.evento.horaFinEvento;
      setTurnoFin(
        calcularTurnoPropuesto(dotacion.evento.fecha, horaIso)
        || (horaHHMM ? `${dotacion.evento.fecha}T${horaHHMM}` : '')
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotacion]);

  /** Construye la URL de retorno a /dotaciones preservando el evento. */
  function volverADotaciones() {
    router.push(dotacion?.evento?.id ? `/dotaciones?eventoId=${dotacion.evento.id}` : '/dotaciones');
  }

  async function handleAsignar() {
    setErrorAsignacion(null);
    if (!personaSeleccionada) return setErrorAsignacion('Selecciona una persona.');
    if (!rolSeleccionado.trim()) return setErrorAsignacion('Indica el rol en la dotación.');
    setAsignando(true);
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/asignaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: personaSeleccionada,
          rolEnDotacion: rolSeleccionado,
          turnoInicioPrev: turnoInicio || undefined,
          turnoFinPrev: turnoFin || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      const resDotacion = await fetch(`/api/dotaciones/${dotacionId}`);
      const dataDotacion = await resDotacion.json();
      setDotacion(dataDotacion.data);
      setPlazasRefreshTick((t) => t + 1);
      setPersonaSeleccionada('');
      setRolSeleccionado('');
      // Reponer la propuesta de turno tras cada asignación
      if (dataDotacion.data) {
        const ev = dataDotacion.data.evento;
        setTurnoInicio(
          calcularTurnoPropuesto(ev.fecha, ev.horaIncorporacionSspp)
          || (ev.horaInicioEvento ? `${ev.fecha}T${ev.horaInicioEvento}` : '')
        );
        setTurnoFin(
          calcularTurnoPropuesto(ev.fecha, ev.horaFinalizacionSspp)
          || (ev.horaFinEvento ? `${ev.fecha}T${ev.horaFinEvento}` : '')
        );
      }
    } catch (e) {
      setErrorAsignacion(e instanceof Error ? e.message : 'Error al asignar');
    } finally {
      setAsignando(false);
    }
  }

  async function handleDesasignar(personaId: number, nombrePersona: string) {
    if (!window.confirm(`¿Desasignar a "${nombrePersona}" de esta dotación?`)) return;
    setDesasignando(personaId);
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/asignaciones?personaId=${personaId}`, { method: 'DELETE' });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error ?? `Error ${res.status}`); }
      setDotacion((prev) => prev ? { ...prev, personal: prev.personal.filter((p) => p.persona.id !== personaId) } : prev);
      setPlazasRefreshTick((t) => t + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al desasignar');
    } finally {
      setDesasignando(null);
    }
  }

  async function handleCambiarEstado(nuevoEstado: EstadoDotacion) {
    setCambiandoEstado(true);
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setDotacion(json.data);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado');
    } finally {
      setCambiandoEstado(false);
    }
  }

  // F1.5 — handleToggleAsistencia eliminado: la asistencia se gestiona
  // ahora desde /eventos/[id]/fichajes (pantalla global por evento).


  // F1.7 — handleAsignarMaterial/handleDesasignarMaterial/
  // handleAsignarWalkie/handleDevolverWalkie eliminados: la gestión de
  // material y walkies vive ahora en /eventos/[id]/control-material.

  const idsAsignados = new Set(dotacion?.personal.map((p) => p.persona.id) ?? []);
  const personalParaAsignar = personalDisponible.filter((p) => !idsAsignados.has(p.id));

  if (cargando) return <div className="text-center py-12 text-slate-500">Cargando dotación...</div>;

  if (noEncontrada) return (
    <div className="text-center py-12">
      <p className="text-xl font-semibold text-slate-700 mb-2">Dotación no encontrada</p>
      <p className="text-slate-500 mb-6">La dotación no existe o ha sido eliminada.</p>
      <button onClick={() => router.push('/dotaciones')} className="text-blue-600 hover:underline text-sm">
        ← Volver a dotaciones
      </button>
    </div>
  );

  if (error || !dotacion) return (
    <div className="text-center py-12">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md inline-block">
        {error ?? 'Error desconocido'}
      </div>
      <div className="mt-4">
        <button onClick={() => router.push('/dotaciones')} className="text-blue-600 hover:underline text-sm">
          ← Volver a dotaciones
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <button onClick={volverADotaciones} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
        ← Volver a dotaciones
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-slate-900 font-mono">{dotacion.codigo}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[dotacion.estado]}`}>
              {ESTADO_LABELS[dotacion.estado]}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {TIPO_LABELS[dotacion.tipo] ?? dotacion.tipo} · {dotacion.evento.nombre}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Personal mínimo</p>
          <p className={`text-lg font-semibold ${dotacion.personal.length >= dotacion.personalMinimo ? 'text-green-600' : 'text-red-500'}`}>
            {dotacion.personal.length}/{dotacion.personalMinimo}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Posición</p>
          <p className="text-sm font-medium text-slate-800">
            {dotacion.posicion?.nombre ?? <span className="text-slate-400">Sin asignar</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Indicativo</p>
          <p className="text-sm font-medium text-slate-800 font-mono">
            {dotacion.indicativo ?? <span className="text-slate-400">—</span>}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-slate-700 mb-2">Cambiar estado operativo</p>
        <div className="flex flex-wrap gap-2">
          {([
            'CL0_DISPONIBLE',
            'CL1_EN_CAMINO',
            'CL2_EN_INTERVENCION',
            'CL3_NO_DISPONIBLE',
            'CL5_SOLICITUD_AYUDA',
            'CL6_SITUACION_CONFLICTIVA',
          ] as EstadoDotacion[]).map((estado) => (
            <button
              key={estado}
              onClick={() => handleCambiarEstado(estado)}
              disabled={cambiandoEstado || dotacion.estado === estado}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors disabled:opacity-40
                ${dotacion.estado === estado ? ESTADO_STYLES[estado] + ' border-transparent cursor-default' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {ESTADO_LABELS[estado]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">
            Personal asignado
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({dotacion.personal.length} persona{dotacion.personal.length !== 1 ? 's' : ''})
            </span>
          </h2>
          {/* F1.5 — el control de asistencia/entrada/salida vive en la pantalla
              global de fichajes del evento. Aquí solo se ve el personal
              asignado y se puede desasignar. */}
          <Link
            href={`/eventos/${dotacion.evento.id}/fichajes`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Ir a fichajes del evento →
          </Link>
        </div>
        {dotacion.personal.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
            No hay personal asignado a esta dotación.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {dotacion.personal.map((asignacion) => (
              <div key={asignacion.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{asignacion.persona.nombreCompleto}</p>
                  <p className="text-xs text-slate-500">
                    {asignacion.rolEnDotacion} ·{' '}
                    <span className={`font-medium ${asignacion.persona.tipo === 'FACULTATIVO' ? 'text-purple-600' : 'text-blue-600'}`}>
                      {asignacion.persona.tipo === 'FACULTATIVO' ? 'Facultativo' : 'Voluntario'}
                    </span>
                    {asignacion.persona.titulacion && <>{' · '}{asignacion.persona.titulacion}</>}
                  </p>
                  {asignacion.turnoInicioPrev && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Turno: {formatearFecha(asignacion.turnoInicioPrev)}
                      {asignacion.turnoFinPrev ? ` → ${formatearFecha(asignacion.turnoFinPrev)}` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDesasignar(asignacion.persona.id, asignacion.persona.nombreCompleto)}
                  disabled={desasignando === asignacion.persona.id}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 ml-3"
                >
                  {desasignando === asignacion.persona.id ? 'Desasignando…' : 'Desasignar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Asignar personal</h2>
        {errorAsignacion && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-3">
            {errorAsignacion}
          </div>
        )}
        {personalParaAsignar.length === 0 ? (
          <p className="text-sm text-slate-400">Todo el personal disponible ya está asignado a esta dotación.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Persona</label>
                <select
                  value={personaSeleccionada}
                  onChange={(e) => setPersonaSeleccionada(Number(e.target.value) || '')}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar persona...</option>
                  {personalParaAsignar.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombreCompleto}{p.titulacion ? ` — ${p.titulacion}` : ''} ({p.tipo === 'FACULTATIVO' ? 'Facultativo' : 'Voluntario'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
                <select
                  value={rolSeleccionado}
                  onChange={(e) => setRolSeleccionado(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar rol...</option>
                  {ROLES_DOTACION.map((rol) => <option key={rol} value={rol}>{rol}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Inicio de turno (previsto)
                  {dotacion.evento.horaIncorporacionSspp && (
                    <span className="text-slate-400 font-normal ml-1">· sugerido del evento</span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  value={turnoInicio}
                  onChange={(e) => setTurnoInicio(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fin de turno (previsto)
                  {dotacion.evento.horaFinalizacionSspp && (
                    <span className="text-slate-400 font-normal ml-1">· sugerido del evento</span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  value={turnoFin}
                  onChange={(e) => setTurnoFin(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAsignar}
                disabled={asignando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap"
              >
                {asignando ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Opción B — Plazas (RRHH numeradas + rol requerido + persona asignada). */}
      <PlazasSeccion
        dotacionId={dotacionId}
        eventoId={dotacion.evento.id}
        personalDisponible={personalDisponible}
        refreshTick={plazasRefreshTick}
        onPlazasChanged={async () => {
          const res = await fetch(`/api/dotaciones/${dotacionId}`);
          if (res.ok) {
            const json = await res.json();
            setDotacion(json.data);
          }
        }}
      />

      {/* F1.7 — Material y walkies se gestionan en /eventos/[id]/control-material */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mt-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Material y walkies</h2>
          <p className="text-xs text-slate-500 mt-0.5">La gestión del material y los walkies es global por evento.</p>
        </div>
        <Link
          href={`/eventos/${dotacion.evento.id}/control-material`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Ir a control de material del evento →
        </Link>
      </div>
    </div>
  );
}

interface PlazaApiItem {
  id: number;
  numero: number;
  nombre: string;
  rolRequerido: string | null;
  incorporacion: string | null;
  persona: { id: number; nombreCompleto: string; tipo: string; titulacion: string | null } | null;
}

const ROLES_PLAZA = ['CONDUCTOR', 'TECNICO', 'MEDICO', 'ENFERMERO', 'SOCORRISTA', 'COORDINADOR', 'OTRO'];
const INCORPORACIONES_PLAZA = ['PLANTIO', 'SERVICIO', 'B85', 'OTRO'];

function PlazasSeccion({
  dotacionId,
  eventoId,
  personalDisponible,
  refreshTick,
  onPlazasChanged,
}: {
  dotacionId: number;
  eventoId: number;
  personalDisponible: PersonaListItem[];
  refreshTick: number;
  onPlazasChanged: () => void | Promise<void>;
}) {
  const [plazas, setPlazas] = useState<PlazaApiItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarPlazas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/plazas`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setPlazas(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar plazas');
    } finally {
      setCargando(false);
    }
  }, [dotacionId]);

  useEffect(() => { cargarPlazas(); }, [cargarPlazas, refreshTick]);

  async function actualizar(
    plazaId: number,
    cambios: { personaId?: number | null; rolRequerido?: string | null; incorporacion?: string | null }
  ) {
    setGuardando(plazaId);
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/plazas/${plazaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? `Error ${res.status}`);
      }
      await cargarPlazas();
      // Los cambios de personaId afectan al contador y a la sección "Personal
      // asignado" del padre, que también lee de plazas.
      if (Object.prototype.hasOwnProperty.call(cambios, 'personaId')) {
        await onPlazasChanged();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar plaza');
    } finally {
      setGuardando(null);
    }
  }

  const yaAsignados = new Set(plazas.filter((p) => p.persona).map((p) => p.persona!.id));

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Plazas
          <span className="ml-2 text-xs font-normal text-slate-400">({plazas.length})</span>
        </h2>
        <Link
          href={`/eventos/${eventoId}/asignacion`}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Ver asignación del evento →
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-3">{error}</div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando plazas…</p>
      ) : plazas.length === 0 ? (
        <p className="text-sm text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded">
          Esta dotación no tiene plazas configuradas.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600 w-20">Plaza</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600 w-32">Rol</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Asistente</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600 w-32">Incorp.</th>
              <th className="text-right px-2 py-1.5 font-medium text-slate-600 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plazas.map((p) => (
              <tr key={p.id}>
                <td className="px-2 py-1.5 font-mono font-semibold text-slate-800">{p.nombre}</td>
                <td className="px-2 py-1.5">
                  <select
                    value={p.rolRequerido ?? ''}
                    onChange={(e) => actualizar(p.id, { rolRequerido: e.target.value || null })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {ROLES_PLAZA.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  {p.persona ? (
                    <span className="text-sm">
                      <span className="font-medium text-slate-800">{p.persona.nombreCompleto}</span>
                      <span className="text-xs text-slate-500 ml-1">
                        ({p.persona.tipo === 'FACULTATIVO' ? 'FAC' : 'VOL'}{p.persona.titulacion ? ` · ${p.persona.titulacion}` : ''})
                      </span>
                    </span>
                  ) : (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id) actualizar(p.id, { personaId: id });
                      }}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="">— Asignar persona —</option>
                      {personalDisponible
                        .filter((per) => !yaAsignados.has(per.id))
                        .map((per) => (
                          <option key={per.id} value={per.id}>
                            {per.nombreCompleto} ({per.tipo === 'FACULTATIVO' ? 'FAC' : 'VOL'}{per.titulacion ? ` · ${per.titulacion}` : ''})
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={p.incorporacion ?? ''}
                    onChange={(e) => actualizar(p.id, { incorporacion: e.target.value || null })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {INCORPORACIONES_PLAZA.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5 text-right">
                  {p.persona ? (
                    <button
                      onClick={() => actualizar(p.id, { personaId: null })}
                      disabled={guardando === p.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                    >
                      Liberar
                    </button>
                  ) : (
                    guardando === p.id ? <span className="text-xs text-slate-400">…</span> : null
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
