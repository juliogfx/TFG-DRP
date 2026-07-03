/**
 * @file app/eventos/[id]/asignacion/page.tsx
 * @description Rediseño Excel Asistentes — tabla única con todas las
 * personas del sistema y una columna POSICIÓN que asigna cada persona a
 * una PlazaDotacion del evento. Guardado inmediato en cada cambio.
 *
 * Columnas: POSICIÓN / CONTAR / ACRON / INCORPORACIÓN / NOMBRE / TEL /
 *           PUESTO / OBSERV.
 * Filtros:  dotación, puesto, buscador de nombre.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { EventoDetalle } from '@/types/evento';

interface PersonaApi {
  id: number;
  nombreCompleto: string;
  tipo: 'VOLUNTARIO' | 'FACULTATIVO';
  titulacion: string | null;
  telefono: string | null;
}

interface PlazaApi {
  id: number;
  numero: number;
  nombre: string;
  rolRequerido: string | null;
  incorporacion: string | null;
  contar: boolean;
  acron: string | null;
  observaciones: string | null;
  persona: { id: number; nombreCompleto: string; tipo: string; titulacion: string | null; telefono: string | null } | null;
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

interface FilaAsist {
  persona: PersonaApi;
  plazaId: number | null;
  dotacionId: number | null;
  plazaNombre: string | null;
  contar: boolean;
  acron: string | null;
  incorporacion: string | null;
  observaciones: string | null;
}

const INCORPORACIONES = ['PLANTIO', 'SERVICIO', 'B85'];

type SaveState = 'saving' | 'ok' | 'err';
type CampoGuardable = 'contar' | 'acron' | 'incorporacion' | 'observaciones';

function acronDefaultDeTitulacion(titulacion: string | null): string {
  if (!titulacion) return '';
  const t = titulacion.toLowerCase();
  if (t.includes('médic')) return 'MED';
  if (t.includes('enferm') || t.includes('due')) return 'ENF';
  if (t.includes('técnic') || t.includes('emergenc')) return 'TEC';
  if (t.includes('socorrist')) return 'SOC';
  if (t.includes('práctic') || t.includes('practic')) return 'PRA';
  if (t.includes('conductor')) return 'CON';
  if (t.includes('coordin')) return 'COO';
  if (t.includes('operador') || t.includes('comunicac')) return 'OPE';
  if (t.includes('volunt')) return 'VOL';
  return '';
}

/**
 * Orden natural para nombres tipo "BANQ.-1", "UVI1-3", "CAMNOR-2":
 * compara prefijo (dotación) alfabéticamente y luego el número al final.
 */
function comparePlazaNombre(a: string, b: string): number {
  const parse = (s: string): { prefix: string; num: number } => {
    const idx = s.lastIndexOf('-');
    if (idx < 0) return { prefix: s, num: 0 };
    const num = parseInt(s.slice(idx + 1), 10);
    return { prefix: s.slice(0, idx), num: isNaN(num) ? 0 : num };
  };
  const pa = parse(a);
  const pb = parse(b);
  const cmp = pa.prefix.localeCompare(pb.prefix, 'es');
  if (cmp !== 0) return cmp;
  return pa.num - pb.num;
}

export default function AsignacionPage() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const eventoId = rawId ? parseInt(rawId, 10) : NaN;
  const eventoIdValido = !isNaN(eventoId) && eventoId > 0;

  const [grupos, setGrupos] = useState<GrupoApi[]>([]);
  const [personas, setPersonas] = useState<PersonaApi[]>([]);
  const [evento, setEvento] = useState<EventoDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  const [filtroDot, setFiltroDot] = useState<string>('TODAS');
  const [filtroPuesto, setFiltroPuesto] = useState<string>('TODOS');
  const [buscador, setBuscador] = useState<string>('');

  const cargar = useCallback(async () => {
    if (!eventoIdValido) return;
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
        setEvento(jsonEv.data ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [eventoId, eventoIdValido]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Marca el estado de guardado de un campo y auto-limpia tras 2s si es 'ok'. */
  function marcarEstado(plazaId: number, campo: CampoGuardable, state: SaveState) {
    const key = `${plazaId}:${campo}`;
    setSaveStates((prev) => ({ ...prev, [key]: state }));
    if (state === 'ok' || state === 'err') {
      setTimeout(() => {
        setSaveStates((prev) => {
          if (prev[key] !== state) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, state === 'ok' ? 2000 : 4000);
    }
  }

  const plazaPorPersona = useMemo(() => {
    const map = new Map<number, { plaza: PlazaApi; dotacionId: number }>();
    for (const g of grupos) {
      for (const p of g.plazas) {
        if (p.persona) map.set(p.persona.id, { plaza: p, dotacionId: g.dotacion.id });
      }
    }
    return map;
  }, [grupos]);

  const plazasLibres = useMemo(() => {
    const libres: { plaza: PlazaApi; dotacionId: number; dotacionCodigo: string }[] = [];
    for (const g of grupos) {
      for (const p of g.plazas) {
        if (!p.persona) libres.push({ plaza: p, dotacionId: g.dotacion.id, dotacionCodigo: g.dotacion.codigo });
      }
    }
    return libres.sort((a, b) => comparePlazaNombre(a.plaza.nombre, b.plaza.nombre));
  }, [grupos]);

  const filasBase: FilaAsist[] = useMemo(() => {
    const filas: FilaAsist[] = personas.map((per) => {
      const asig = plazaPorPersona.get(per.id);
      if (asig) {
        return {
          persona: per,
          plazaId: asig.plaza.id,
          dotacionId: asig.dotacionId,
          plazaNombre: asig.plaza.nombre,
          contar: asig.plaza.contar,
          acron: asig.plaza.acron ?? acronDefaultDeTitulacion(per.titulacion),
          incorporacion: asig.plaza.incorporacion,
          observaciones: asig.plaza.observaciones,
        };
      }
      return {
        persona: per,
        plazaId: null,
        dotacionId: null,
        plazaNombre: null,
        contar: true,
        acron: acronDefaultDeTitulacion(per.titulacion),
        incorporacion: null,
        observaciones: null,
      };
    });
    // 1) Asignados primero, ordenados por nombre de plaza (BANQ.-1, BANQ.-2, CAMNOR-1…).
    // 2) Libres al final, por puesto y luego nombre.
    return filas.sort((a, b) => {
      const asigA = a.plazaId !== null ? 0 : 1;
      const asigB = b.plazaId !== null ? 0 : 1;
      if (asigA !== asigB) return asigA - asigB;
      if (a.plazaId !== null && b.plazaId !== null) {
        return comparePlazaNombre(a.plazaNombre ?? '', b.plazaNombre ?? '');
      }
      const puestoA = a.persona.titulacion ?? 'zzz';
      const puestoB = b.persona.titulacion ?? 'zzz';
      const cmp = puestoA.localeCompare(puestoB, 'es');
      if (cmp !== 0) return cmp;
      return a.persona.nombreCompleto.localeCompare(b.persona.nombreCompleto, 'es');
    });
  }, [personas, plazaPorPersona]);

  const dotacionesUnicas = useMemo(() => {
    return Array.from(new Set(grupos.map((g) => g.dotacion.codigo))).sort();
  }, [grupos]);
  const puestosUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const p of personas) if (p.titulacion) set.add(p.titulacion);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [personas]);

  const filas = useMemo(() => {
    return filasBase.filter((f) => {
      // Filtro dotación: asignados a esa dotación + libres
      if (filtroDot !== 'TODAS') {
        const g = grupos.find((gg) => gg.dotacion.codigo === filtroDot);
        const idDot = g?.dotacion.id;
        const enDotacion = f.dotacionId !== null && f.dotacionId === idDot;
        const libre = f.plazaId === null;
        if (!enDotacion && !libre) return false;
      }
      if (filtroPuesto !== 'TODOS') {
        if ((f.persona.titulacion ?? '') !== filtroPuesto) return false;
      }
      if (buscador.trim() !== '') {
        const q = buscador.trim().toLowerCase();
        if (!f.persona.nombreCompleto.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [filasBase, filtroDot, filtroPuesto, buscador, grupos]);

  /**
   * PUT a una plaza actualizando alguno de sus campos. Guardado inmediato:
   * al terminar recarga los datos para tener el estado consistente.
   *
   * `campoIndicador` (opcional) hace que se muestre el badge ✓/✗ junto al
   * input correspondiente. Los cambios de asignación (personaId) no usan
   * indicador porque se refleja visualmente en el propio selector.
   */
  async function actualizarPlaza(
    dotacionId: number,
    plazaId: number,
    cambios: {
      personaId?: number | null;
      incorporacion?: string | null;
      contar?: boolean;
      acron?: string | null;
      observaciones?: string | null;
    },
    campoIndicador?: CampoGuardable,
  ): Promise<boolean> {
    setGuardando(plazaId);
    setError(null);
    if (campoIndicador) marcarEstado(plazaId, campoIndicador, 'saving');
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/plazas/${plazaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      if (campoIndicador) marcarEstado(plazaId, campoIndicador, 'ok');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
      if (campoIndicador) marcarEstado(plazaId, campoIndicador, 'err');
      return false;
    } finally {
      setGuardando(null);
    }
  }

  /** Renderiza el badge ✓ (verde) / ✗ (rojo) / spinner al lado del input. */
  function badgeGuardado(plazaId: number | null, campo: CampoGuardable) {
    if (plazaId === null) return null;
    const state = saveStates[`${plazaId}:${campo}`];
    if (!state) return null;
    if (state === 'saving') return <span className="ml-1 text-slate-400 text-xs">…</span>;
    if (state === 'ok') return <span className="ml-1 text-emerald-600 text-xs font-bold">✓</span>;
    return <span className="ml-1 text-red-600 text-xs font-bold" title="Error al guardar">✗</span>;
  }

  /** Cambia la asignación de una persona a una plaza distinta (o la libera). */
  async function cambiarAsignacion(fila: FilaAsist, nuevaPlazaId: number | null) {
    // Si la persona ya tenía plaza, liberarla primero
    if (fila.plazaId !== null && fila.dotacionId !== null) {
      const ok = await actualizarPlaza(fila.dotacionId, fila.plazaId, { personaId: null });
      if (!ok) return;
    }
    if (nuevaPlazaId !== null) {
      const nuevo = plazasLibres.find((pl) => pl.plaza.id === nuevaPlazaId);
      if (!nuevo) {
        setError('Plaza seleccionada ya no disponible.');
        await cargar();
        return;
      }
      // Rellenar con los defaults del ACRON si la plaza aún no lo tiene
      const acronPropuesto = nuevo.plaza.acron ?? acronDefaultDeTitulacion(fila.persona.titulacion);
      await actualizarPlaza(nuevo.dotacionId, nuevo.plaza.id, {
        personaId: fila.persona.id,
        acron: acronPropuesto,
      });
    }
    await cargar();
  }

  if (!eventoIdValido) {
    return (
      <div>
        <div className="mb-4">
          <Link href="/eventos" className="text-sm text-slate-500 hover:text-slate-700">← Volver a eventos</Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          ID de evento inválido en la URL ({rawId ?? 'vacío'}). Vuelve al listado y usa el botón &quot;Asignación&quot; de un evento concreto.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Link href="/eventos" className="text-sm text-slate-500 hover:text-slate-700">← Volver a eventos</Link>
        <span className="text-slate-300">·</span>
        <Link
          href={`/eventos/${eventoId}/dimensionamiento`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Volver al dimensionamiento
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Asignación de asistentes <span className="text-slate-400 font-normal">· #{eventoId}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{evento?.nombre || `Evento #${eventoId}`}</p>
        </div>
        <div className="text-sm text-slate-500">
          {filasBase.filter((f) => f.plazaId !== null).length}/{filasBase.length} asignadas
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Dotación</label>
          <select
            value={filtroDot}
            onChange={(e) => setFiltroDot(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
          >
            <option value="TODAS">TODAS</option>
            {dotacionesUnicas.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Puesto</label>
          <select
            value={filtroPuesto}
            onChange={(e) => setFiltroPuesto(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
          >
            <option value="TODOS">TODOS</option>
            {puestosUnicos.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">Buscar nombre</label>
          <input
            type="text"
            value={buscador}
            onChange={(e) => setBuscador(e.target.value)}
            placeholder="Filtrar por nombre…"
            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-slate-500">Cargando…</div>
      ) : filasBase.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-lg">
          No hay personas activas en el sistema.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-40">POSICIÓN</th>
                <th className="text-center px-2 py-2 font-medium text-slate-600 w-16">CONTAR</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 w-20">ACRON</th>
                <th className="text-left px-2 py-2 font-medium text-slate-600 w-32">INCORP.</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">NOMBRE Y APELLIDOS</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">TELÉFONO</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">PUESTO</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-56">OBSERV./ACREDIT.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => {
                const asignada = f.plazaId !== null && f.dotacionId !== null;
                const disabled = !asignada || guardando === f.plazaId;
                return (
                  <tr
                    key={f.persona.id}
                    className={`hover:bg-slate-50 ${asignada ? '' : 'bg-slate-50/60'}`}
                  >
                    <td className="px-3 py-1.5">
                      <select
                        value={f.plazaId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          cambiarAsignacion(f, val === '' ? null : Number(val));
                        }}
                        disabled={guardando !== null}
                        className={`w-full border border-slate-300 rounded px-2 py-1 text-sm ${
                          asignada ? 'font-mono font-semibold bg-emerald-50' : 'bg-white'
                        }`}
                      >
                        <option value="">— Sin asignar —</option>
                        {asignada && f.plazaNombre && (
                          <option value={f.plazaId ?? ''}>{f.plazaNombre}</option>
                        )}
                        {plazasLibres.map((pl) => (
                          <option key={pl.plaza.id} value={pl.plaza.id}>
                            {pl.plaza.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={f.contar}
                        disabled={disabled}
                        onChange={(e) => {
                          if (!asignada || f.dotacionId === null || f.plazaId === null) return;
                          actualizarPlaza(f.dotacionId, f.plazaId, { contar: e.target.checked }, 'contar')
                            .then((ok) => { if (ok) cargar(); });
                        }}
                      />
                      {badgeGuardado(f.plazaId, 'contar')}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <input
                        type="text"
                        maxLength={10}
                        value={f.acron ?? ''}
                        disabled={disabled}
                        onChange={(e) => {
                          // actualización local rápida
                          const nuevo = e.target.value.toUpperCase().slice(0, 10);
                          setGrupos((prev) => prev.map((g) => ({
                            ...g,
                            plazas: g.plazas.map((p) => (p.id === f.plazaId ? { ...p, acron: nuevo } : p)),
                          })));
                        }}
                        onBlur={(e) => {
                          if (!asignada || f.dotacionId === null || f.plazaId === null) return;
                          const val = e.target.value.trim().toUpperCase();
                          actualizarPlaza(f.dotacionId, f.plazaId, { acron: val || null }, 'acron');
                        }}
                        className="w-16 border border-slate-300 rounded px-1 py-0.5 text-xs text-center uppercase disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      {badgeGuardado(f.plazaId, 'acron')}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <select
                        value={f.incorporacion ?? ''}
                        disabled={disabled}
                        onChange={(e) => {
                          if (!asignada || f.dotacionId === null || f.plazaId === null) return;
                          actualizarPlaza(f.dotacionId, f.plazaId, { incorporacion: e.target.value || null }, 'incorporacion')
                            .then((ok) => { if (ok) cargar(); });
                        }}
                        className="w-full border border-slate-300 rounded px-1 py-0.5 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">—</option>
                        {INCORPORACIONES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                      {badgeGuardado(f.plazaId, 'incorporacion')}
                    </td>
                    <td className="px-3 py-1.5 font-medium text-slate-800">
                      {f.persona.nombreCompleto}
                      <span className="ml-2 text-xs text-slate-500">
                        ({f.persona.tipo === 'FACULTATIVO' ? 'FAC' : 'VOL'})
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 tabular-nums">{f.persona.telefono ?? '—'}</td>
                    <td className="px-3 py-1.5 text-slate-600">{f.persona.titulacion ?? '—'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <input
                        type="text"
                        value={f.observaciones ?? ''}
                        disabled={disabled}
                        onChange={(e) => {
                          const nuevo = e.target.value;
                          setGrupos((prev) => prev.map((g) => ({
                            ...g,
                            plazas: g.plazas.map((p) => (p.id === f.plazaId ? { ...p, observaciones: nuevo } : p)),
                          })));
                        }}
                        onBlur={(e) => {
                          if (!asignada || f.dotacionId === null || f.plazaId === null) return;
                          actualizarPlaza(f.dotacionId, f.plazaId, { observaciones: e.target.value || null }, 'observaciones');
                        }}
                        maxLength={200}
                        className="w-56 border border-slate-300 rounded px-1 py-0.5 text-xs disabled:bg-slate-100"
                      />
                      {badgeGuardado(f.plazaId, 'observaciones')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
