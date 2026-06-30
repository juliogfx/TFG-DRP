/**
 * @file app/eventos/[id]/asignacion/page.tsx
 * @description Opción B — Asignación de personal a plazas de cada dotación.
 *
 * Muestra todas las dotaciones del evento agrupadas; para cada dotación una
 * tabla con sus plazas (PLAZA | ROL | ASISTENTE | INCORPORACIÓN | ACCIONES).
 * Las personas ya asignadas en este evento no aparecen en el selector — el
 * filtrado se hace en cliente para no duplicar a una misma persona.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface PersonaApi {
  id: number;
  nombreCompleto: string;
  tipo: 'VOLUNTARIO' | 'FACULTATIVO';
  titulacion: string | null;
}

interface PlazaApi {
  id: number;
  numero: number;
  nombre: string;
  rolRequerido: string | null;
  incorporacion: string | null;
  persona: { id: number; nombreCompleto: string; tipo: string; titulacion: string | null } | null;
}

interface GrupoApi {
  dotacion: {
    id: number;
    codigo: string;
    tipo: string;
    indicativo: string | null;
    posicion: { id: number; nombre: string; zona: string | null } | null;
  };
  plazas: PlazaApi[];
}

const ROLES = ['CONDUCTOR', 'TECNICO', 'MEDICO', 'ENFERMERO', 'SOCORRISTA', 'COORDINADOR', 'OTRO'];
const INCORPORACIONES = ['PLANTIO', 'SERVICIO', 'B85', 'OTRO'];

export default function AsignacionPage() {
  const params = useParams<{ id: string }>();
  const eventoId = Number(params.id);

  const [grupos, setGrupos] = useState<GrupoApi[]>([]);
  const [personas, setPersonas] = useState<PersonaApi[]>([]);
  const [nombreEvento, setNombreEvento] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!eventoId) return;
    setCargando(true);
    setError(null);
    try {
      const [resPlazas, resPer, resEv] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/plazas`),
        fetch('/api/personal'),
        fetch(`/api/eventos/${eventoId}`),
      ]);
      if (!resPlazas.ok) throw new Error(`Error ${resPlazas.status} cargando plazas`);
      const jsonPlazas = await resPlazas.json();
      const jsonPer = await resPer.json();
      setGrupos(jsonPlazas.data ?? []);
      setPersonas(jsonPer.data ?? []);
      if (resEv.ok) {
        const jsonEv = await resEv.json();
        setNombreEvento(jsonEv.data?.nombre ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [eventoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const personasYaAsignadas = useMemo(() => {
    const set = new Set<number>();
    for (const g of grupos) {
      for (const p of g.plazas) {
        if (p.persona) set.add(p.persona.id);
      }
    }
    return set;
  }, [grupos]);

  async function actualizarPlaza(
    dotacionId: number,
    plazaId: number,
    cambios: { personaId?: number | null; rolRequerido?: string | null; incorporacion?: string | null }
  ) {
    setGuardando(plazaId);
    setError(null);
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/plazas/${plazaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setGuardando(null);
    }
  }

  function selectorPersonas(plazaActual: PlazaApi) {
    const propia = plazaActual.persona?.id ?? null;
    const opciones = personas.filter((p) => p.id === propia || !personasYaAsignadas.has(p.id));
    return opciones;
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/eventos" className="text-sm text-slate-500 hover:text-slate-700">← Volver a eventos</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Asignación de asistentes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{nombreEvento || `Evento #${eventoId}`}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {cargando ? (
        <div className="text-center py-12 text-slate-500">Cargando…</div>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
          No hay dotaciones con plazas en este evento. Revisa el dimensionamiento.
        </p>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.dotacion.id} className="rounded-lg border border-slate-200">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-mono font-semibold text-slate-900">{g.dotacion.codigo}</span>
                  <span className="text-xs text-slate-500 ml-2">{g.dotacion.tipo}</span>
                  {g.dotacion.indicativo && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-mono font-medium">
                      {g.dotacion.indicativo}
                    </span>
                  )}
                  {g.dotacion.posicion && (
                    <span className="text-xs text-slate-500 ml-2">· {g.dotacion.posicion.nombre} ({g.dotacion.posicion.zona ?? '—'})</span>
                  )}
                </div>
                <Link
                  href={`/dotaciones/${g.dotacion.id}`}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  Abrir dotación →
                </Link>
              </div>
              {g.plazas.length === 0 ? (
                <p className="text-xs text-slate-400 px-4 py-3">Esta dotación no tiene plazas configuradas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-slate-600 w-24">PLAZA</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-600 w-36">ROL REQUERIDO</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-600">ASISTENTE ASIGNADO</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-600 w-44">INCORPORACIÓN</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600 w-32">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.plazas.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono font-semibold text-slate-800">{p.nombre}</td>
                        <td className="px-4 py-2">
                          <select
                            value={p.rolRequerido ?? ''}
                            onChange={(e) => actualizarPlaza(g.dotacion.id, p.id, { rolRequerido: e.target.value || null })}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="">—</option>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          {p.persona ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{p.persona.nombreCompleto}</span>
                              <span className="text-xs text-slate-500">
                                ({p.persona.tipo === 'FACULTATIVO' ? 'FAC' : 'VOL'}{p.persona.titulacion ? ` · ${p.persona.titulacion}` : ''})
                              </span>
                            </div>
                          ) : (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const id = Number(e.target.value);
                                if (id) actualizarPlaza(g.dotacion.id, p.id, { personaId: id });
                              }}
                              className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="">— Seleccionar persona —</option>
                              {selectorPersonas(p).map((per) => (
                                <option key={per.id} value={per.id}>
                                  {per.nombreCompleto} ({per.tipo === 'FACULTATIVO' ? 'FAC' : 'VOL'}{per.titulacion ? ` · ${per.titulacion}` : ''})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={p.incorporacion ?? ''}
                            onChange={(e) => actualizarPlaza(g.dotacion.id, p.id, { incorporacion: e.target.value || null })}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="">—</option>
                            {INCORPORACIONES.map((i) => <option key={i} value={i}>{i}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          {p.persona ? (
                            <button
                              onClick={() => actualizarPlaza(g.dotacion.id, p.id, { personaId: null })}
                              disabled={guardando === p.id}
                              className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-40"
                            >
                              Liberar
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {guardando === p.id && <span className="text-xs text-slate-400">…</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
