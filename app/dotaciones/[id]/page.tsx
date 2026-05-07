/**
 * @file app/dotaciones/[id]/page.tsx
 * @description Página de detalle de una Dotación DRP.
 *
 * Muestra los datos completos de la dotación, el personal asignado con
 * sus roles y turnos, y un formulario inline para asignar nuevo personal.
 * Permite cambiar el estado operativo y desasignar personas.
 *
 * Client Component — necesita fetch, estado y router.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { DotacionDetalle, PersonaListItem, EstadoDotacion } from '@/types/dotacion';

const TIPO_LABELS: Record<string, string> = {
  AMBULANCIA: 'Ambulancia', BOTIQUIN: 'Botiquín', UVI: 'UVI Móvil',
  SVB: 'SVB', CLINICA: 'Clínica', AVANZADA: 'Avanzada',
  BANQUILLO: 'Banquillo', LIMA: 'LIMA', UCO_UNIT: 'UCO',
};

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

const ROLES_DOTACION = [
  'Conductor', 'Socorrista', 'Enfermero/a', 'Médico/a',
  'Técnico Emergencias Sanitarias', 'Coordinador/a', 'Prácticas',
];

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
  const [asignando, setAsignando] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [desasignando, setDesasignando] = useState<number | null>(null);

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
        const [dataDotacion, dataPersonal] = await Promise.all([resDotacion.json(), resPersonal.json()]);
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

  async function handleAsignar() {
    setErrorAsignacion(null);
    if (!personaSeleccionada) return setErrorAsignacion('Selecciona una persona.');
    if (!rolSeleccionado.trim()) return setErrorAsignacion('Indica el rol en la dotación.');
    setAsignando(true);
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/asignaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: personaSeleccionada, rolEnDotacion: rolSeleccionado }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      const resDotacion = await fetch(`/api/dotaciones/${dotacionId}`);
      const dataDotacion = await resDotacion.json();
      setDotacion(dataDotacion.data);
      setPersonaSeleccionada('');
      setRolSeleccionado('');
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

  const idsAsignados = new Set(dotacion?.personal.map((p) => p.persona.id) ?? []);
  const personalParaAsignar = personalDisponible.filter((p) => !idsAsignados.has(p.id));

  if (cargando) return <div className="text-center py-12 text-slate-500">Cargando dotación...</div>;

  if (noEncontrada) return (
    <div className="text-center py-12">
      <p className="text-xl font-semibold text-slate-700 mb-2">Dotación no encontrada</p>
      <p className="text-slate-500 mb-6">La dotación no existe o ha sido eliminada.</p>
      <button onClick={() => router.push('/dotaciones')} className="text-blue-600 hover:underline text-sm">← Volver a dotaciones</button>
    </div>
  );

  if (error || !dotacion) return (
    <div className="text-center py-12">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md inline-block">{error ?? 'Error desconocido'}</div>
      <div className="mt-4"><button onClick={() => router.push('/dotaciones')} className="text-blue-600 hover:underline text-sm">← Volver a dotaciones</button></div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <button onClick={() => router.push('/dotaciones')} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
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
          <p className="text-sm text-slate-500">{TIPO_LABELS[dotacion.tipo] ?? dotacion.tipo} · {dotacion.evento.nombre}</p>
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
          <p className="text-sm font-medium text-slate-800">{dotacion.posicion?.nombre ?? <span className="text-slate-400">Sin asignar</span>}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Indicativo</p>
          <p className="text-sm font-medium text-slate-800 font-mono">{dotacion.indicativo ?? <span className="text-slate-400">—</span>}</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-slate-700 mb-2">Cambiar estado operativo</p>
        <div className="flex gap-2">
          {(['DISPONIBLE', 'EN_INTERVENCION', 'NO_OPERATIVA'] as EstadoDotacion[]).map((estado) => (
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
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Personal asignado
          <span className="ml-2 text-sm font-normal text-slate-400">({dotacion.personal.length} persona{dotacion.personal.length !== 1 ? 's' : ''})</span>
        </h2>
        {dotacion.personal.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
            No hay personal asignado a esta dotación.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {dotacion.personal.map((asignacion) => (
              <div key={asignacion.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{asignacion.persona.nombreCompleto}</p>
                  <p className="text-xs text-slate-500">
                    {asignacion.rolEnDotacion} · {' '}
                    <span className={`font-medium ${asignacion.persona.tipo === 'FACULTATIVO' ? 'text-purple-600' : 'text-blue-600'}`}>
                      {asignacion.persona.tipo === 'FACULTATIVO' ? 'Facultativo' : 'Voluntario'}
                    </span>
                    {' · '}{asignacion.persona.titulacion}
                  </p>
                </div>
                <button
                  onClick={() => handleDesasignar(asignacion.persona.id, asignacion.persona.nombreCompleto)}
                  disabled={desasignando === asignacion.persona.id}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 ml-4"
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-3">{errorAsignacion}</div>
        )}
        {personalParaAsignar.length === 0 ? (
          <p className="text-sm text-slate-400">Todo el personal disponible ya está asignado a esta dotación.</p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            <select
              value={personaSeleccionada}
              onChange={(e) => setPersonaSeleccionada(Number(e.target.value) || '')}
              className="flex-1 min-w-48 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar persona...</option>
              {personalParaAsignar.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreCompleto} ({p.tipo === 'FACULTATIVO' ? 'Facultativo' : 'Voluntario'})
                </option>
              ))}
            </select>
            <select
              value={rolSeleccionado}
              onChange={(e) => setRolSeleccionado(e.target.value)}
              className="flex-1 min-w-40 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar rol...</option>
              {ROLES_DOTACION.map((rol) => <option key={rol} value={rol}>{rol}</option>)}
            </select>
            <button
              onClick={handleAsignar}
              disabled={asignando}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap"
            >
              {asignando ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
