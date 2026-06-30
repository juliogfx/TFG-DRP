/**
 * @file app/eventos/[id]/editar/page.tsx
 * @description Página de edición de un Evento DRP existente.
 *
 * Carga el evento desde GET /api/eventos/:id y precarga el formulario
 * con sus datos actuales. Al enviar, llama a PUT /api/eventos/:id y
 * redirige a /eventos si la operación tiene éxito.
 * Muestra mensaje de error específico si el evento no existe (404).
 *
 * Client Component — necesita fetch, estado de formulario y router.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { UpdateEventoInput, EventoDetalle } from '@/types/evento';

interface OpcionCatalogo { id: number; nombre: string; codigo: string; }
interface OpcionEmpresa extends OpcionCatalogo { tipo: 'PROMOTOR' | 'CONTRATADA' | 'FACULTATIVOS'; }
interface OpcionEquipo { id: number; nombre: string; codigo: string; deporte: string; }

export default function EditarEventoPage() {
  const router = useRouter();
  const params = useParams();
  const eventoId = Number(params.id);

  const [form, setForm] = useState<UpdateEventoInput>({});
  const [ubicaciones, setUbicaciones] = useState<OpcionCatalogo[]>([]);
  const [tiposEvento, setTiposEvento] = useState<OpcionCatalogo[]>([]);
  const [empresas, setEmpresas] = useState<OpcionEmpresa[]>([]);
  const [equipos, setEquipos] = useState<OpcionEquipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!eventoId || isNaN(eventoId)) { setNoEncontrado(true); setCargando(false); return; }

    async function cargarDatos() {
      try {
        const [resEvento, resUbic, resTipos, resEmpresas, resEquipos] = await Promise.all([
          fetch(`/api/eventos/${eventoId}`),
          fetch('/api/ubicaciones'),
          fetch('/api/tipos-evento'),
          fetch('/api/empresas'),
          fetch('/api/equipos'),
        ]);

        if (resEvento.status === 404) { setNoEncontrado(true); return; }
        if (!resEvento.ok) throw new Error(`Error ${resEvento.status} al cargar el evento`);

        const [dataEvento, dataUbic, dataTipos, dataEmpresas, dataEquipos] = await Promise.all([
          resEvento.json(), resUbic.json(), resTipos.json(), resEmpresas.json(), resEquipos.json(),
        ]);

        const evento: EventoDetalle = dataEvento.data;
        setForm({
          nombre: evento.nombre,
          ubicacionId: evento.ubicacion.id,
          fecha: evento.fecha,
          tipoEventoId: evento.tipoEvento?.id ?? undefined,
          rival: evento.rival ?? '',
          aforoPrevisto: evento.aforoPrevisto ?? undefined,
          aforoEstimado: evento.aforoEstimado ?? undefined,
          aforoTotal: evento.aforoTotal ?? undefined,
          personalRiesgo: evento.personalRiesgo ?? '',
          temporada: evento.temporada ?? '',
          empresaPromotorId: evento.empresaPromotor?.id ?? undefined,
          empresaContratadaId: evento.empresaContratada?.id ?? undefined,
          equipoLocalId: evento.equipoLocal?.id ?? undefined,
          equipoVisitanteId: evento.equipoVisitante?.id ?? undefined,
          directorMedico: evento.directorMedico ?? '',
          observaciones: evento.observaciones ?? '',
          horaInicioEvento: evento.horaInicioEvento ?? '',
          horaFinEvento: evento.horaFinEvento ?? '',
        });

        setUbicaciones(dataUbic.data ?? []);
        setTiposEvento(dataTipos.data ?? []);
        setEmpresas(dataEmpresas.data ?? []);
        setEquipos(dataEquipos.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar los datos');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [eventoId]);

  function actualizarCampo(campo: keyof UpdateEventoInput, valor: string) {
    setForm((prev) => ({
      ...prev,
      [campo]: ['ubicacionId', 'tipoEventoId', 'aforoPrevisto', 'aforoEstimado', 'aforoTotal', 'empresaPromotorId', 'empresaContratadaId', 'equipoLocalId', 'equipoVisitanteId'].includes(campo)
        ? (valor === '' ? undefined : Number(valor)) : valor,
    }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.nombre?.trim()) return setError('El nombre del evento es obligatorio.');
    if (!form.ubicacionId) return setError('Selecciona una ubicación.');
    if (!form.fecha) return setError('La fecha del evento es obligatoria.');

    setEnviando(true);
    try {
      const res = await fetch(`/api/eventos/${eventoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      router.push('/eventos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar el evento');
    } finally {
      setEnviando(false);
    }
  }

  const promotores = empresas.filter((e) => e.tipo === 'PROMOTOR');
  const contratadas = empresas.filter((e) => e.tipo === 'CONTRATADA' || e.tipo === 'FACULTATIVOS');
  const tipoSeleccionado = tiposEvento.find((t) => t.id === form.tipoEventoId);
  // esConcierto removed — label "Artista / Grupo" is now always shown for non-sports events

  /** Evento deportivo: PLA, CHA, COP o nombre con palabras clave deportivas */
  const esDeportivo = tipoSeleccionado
    ? ['PLA', 'CHA', 'COP'].includes(tipoSeleccionado.codigo) ||
      /partido|liga|copa|champions|baloncesto/i.test(tipoSeleccionado.nombre)
    : false;

  /**
   * Filtra equipos según el tipo de evento seleccionado.
   * PLA → solo LaLiga; CHA → LaLiga + Europa + Selecciones;
   * COP → LaLiga + Selecciones; baloncesto → solo Baloncesto;
   * resto deportivo → todos los equipos.
   * @param tipo - TipoEventoCatalogo seleccionado.
   * @returns Array de equipos filtrados.
   */
  function equiposFiltrados(tipo: typeof tipoSeleccionado): typeof equipos {
    if (!tipo) return equipos;
    const cod = tipo.codigo;
    const nom = tipo.nombre.toLowerCase();
    if (cod === 'PLA') return equipos.filter((e) => e.deporte === 'Fútbol - LaLiga');
    if (cod === 'CHA') return equipos.filter((e) =>
      ['Fútbol - LaLiga', 'Fútbol - Europa', 'Fútbol - Selecciones'].includes(e.deporte)
    );
    if (cod === 'COP') return equipos.filter((e) =>
      ['Fútbol - LaLiga', 'Fútbol - Selecciones'].includes(e.deporte)
    );
    if (/baloncesto/i.test(nom)) return equipos.filter((e) => e.deporte === 'Baloncesto');
    return equipos;
  }
  const equiposDisponibles = equiposFiltrados(tipoSeleccionado);

  /**
   * Calcula la temporada deportiva a partir de la fecha y el tipo de evento.
   * Fútbol: temporada empieza en julio. Baloncesto: en septiembre.
   * @param fecha - Fecha en formato YYYY-MM-DD.
   * @param tipo  - TipoEventoCatalogo seleccionado.
   * @returns String de temporada "YYYY-YY" o vacío si no aplica.
   */
  function calcularTemporada(fecha: string, tipo: typeof tipoSeleccionado): string {
    if (!fecha || !tipo) return '';
    const d = new Date(fecha + 'T12:00:00');
    const mes = d.getMonth() + 1;
    const anyo = d.getFullYear();
    const cod = tipo.codigo;
    const nom = tipo.nombre.toLowerCase();
    const esFutbol = ['PLA', 'CHA', 'COP'].includes(cod) || /partido|liga|copa|champions/i.test(nom);
    const esBasket = /baloncesto/i.test(nom);
    if (!esFutbol && !esBasket) return '';
    const mesInicio = esFutbol ? 7 : 9;
    const anyoInicio = mes >= mesInicio ? anyo : anyo - 1;
    const anyoFin = (anyoInicio + 1).toString().slice(-2);
    return `${anyoInicio}-${anyoFin}`;
  }

  /**
   * Construye el nombre sugerido del evento.
   * Deportivo con ambos equipos: "[Local] vs [Visitante] - DD/MM/YYYY"
   * No deportivo con artista: "[Artista] - DD/MM/YYYY"
   * @param localId     - ID del equipo local.
   * @param visitanteId - ID del equipo visitante.
   * @param fecha       - Fecha en formato YYYY-MM-DD.
   * @param rival       - Texto libre del campo Artista/Grupo.
   * @returns Nombre sugerido o cadena vacía si faltan datos.
   */
  function nombreSugerido(
    localId: number | undefined,
    visitanteId: number | undefined,
    fecha: string,
    rival: string,
  ): string {
    const fechaStr = fecha
      ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';
    if (esDeportivo) {
      const local = equiposDisponibles.find((e) => e.id === localId);
      const visitante = equiposDisponibles.find((e) => e.id === visitanteId);
      if (local && visitante) {
        return fechaStr
          ? `${local.nombre} vs ${visitante.nombre} - ${fechaStr}`
          : `${local.nombre} vs ${visitante.nombre}`;
      }
      return '';
    }
    if (rival?.trim() && fechaStr) return `${rival.trim()} - ${fechaStr}`;
    return '';
  }

  if (cargando) return <div className="text-center py-12 text-slate-500">Cargando evento...</div>;

  if (noEncontrado) return (
    <div className="text-center py-12">
      <p className="text-xl font-semibold text-slate-700 mb-2">Evento no encontrado</p>
      <p className="text-slate-500 mb-6">El evento que intentas editar no existe o ha sido eliminado.</p>
      <button onClick={() => router.push('/eventos')} className="text-blue-600 hover:underline text-sm">
        ← Volver a la lista de eventos
      </button>
    </div>
  );

  if (error && !form.nombre) return (
    <div className="text-center py-12">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md inline-block">{error}</div>
      <div className="mt-4">
        <button onClick={() => router.push('/eventos')} className="text-blue-600 hover:underline text-sm">
          ← Volver a la lista de eventos
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.push('/eventos')} className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1">
          ← Volver a eventos
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">Editar evento</h1>
        <p className="text-sm text-slate-500 mt-1">Los campos marcados con * son obligatorios.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
          <input type="text" value={form.nombre ?? ''} onChange={(e) => actualizarCampo('nombre', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación *</label>
            <select value={form.ubicacionId ?? ''} onChange={(e) => actualizarCampo('ubicacionId', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              {ubicaciones.map((u) => <option key={u.id} value={u.id}>[{u.codigo}] {u.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={form.fecha ?? ''}
              onChange={(e) => {
                const fecha = e.target.value;
                const temporada = calcularTemporada(fecha, tipoSeleccionado);
                const nombre = nombreSugerido(form.equipoLocalId, form.equipoVisitanteId, fecha, form.rival ?? '');
                setForm((prev) => ({
                  ...prev,
                  fecha,
                  ...(temporada && { temporada }),
                  ...(nombre && { nombre }),
                }));
              }}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de evento</label>
            <select
              value={form.tipoEventoId ?? ''}
              onChange={(e) => actualizarCampo('tipoEventoId', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {tiposEvento.map((t) => <option key={t.id} value={t.id}>[{t.codigo}] {t.nombre}</option>)}
            </select>
          </div>
          {tipoSeleccionado && !esDeportivo && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {'Artista / Grupo'}
              </label>
              <input
                type="text"
                value={form.rival ?? ''}
                onChange={(e) => {
                  const rival = e.target.value;
                  const nombre = nombreSugerido(undefined, undefined, form.fecha ?? '', rival);
                  setForm((prev) => ({ ...prev, rival, ...(nombre !== '' && { nombre }) }));
                }}
                placeholder="Ej: Bad Bunny, Taylor Swift, nombre del evento..."
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {esDeportivo && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Equipo local (anfitrión)</label>
              <select
                value={form.equipoLocalId ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : undefined;
                  setForm((prev) => ({ ...prev, equipoLocalId: id, equipoVisitanteId: id === prev.equipoVisitanteId ? undefined : prev.equipoVisitanteId }));
                }}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {equiposDisponibles
                  .filter((eq) => eq.id !== form.equipoVisitanteId)
                  .map((eq) => <option key={eq.id} value={eq.id}>[{eq.codigo}] {eq.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Equipo visitante (rival)</label>
              <select
                value={form.equipoVisitanteId ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : undefined;
                  setForm((prev) => ({ ...prev, equipoVisitanteId: id }));
                }}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {equiposDisponibles
                  .filter((eq) => eq.id !== form.equipoLocalId)
                  .map((eq) => <option key={eq.id} value={eq.id}>[{eq.codigo}] {eq.nombre}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aforo previsto</label>
            <input type="number" value={form.aforoPrevisto ?? ''} onChange={(e) => actualizarCampo('aforoPrevisto', e.target.value)}
              min={0} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Temporada</label>
            <input type="text" value={form.temporada ?? ''} onChange={(e) => actualizarCampo('temporada', e.target.value)}
              placeholder="Ej: 2025-26"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Empresa promotora</label>
          <select value={form.empresaPromotorId ?? ''} onChange={(e) => actualizarCampo('empresaPromotorId', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar...</option>
            {promotores.map((e) => <option key={e.id} value={e.id}>[{e.codigo}] {e.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Empresa contratada (DRP)</label>
          <select value={form.empresaContratadaId ?? ''} onChange={(e) => actualizarCampo('empresaContratadaId', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar...</option>
            {contratadas.map((e) => <option key={e.id} value={e.id}>[{e.codigo}] {e.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Director médico</label>
          <input type="text" value={form.directorMedico ?? ''} onChange={(e) => actualizarCampo('directorMedico', e.target.value)}
            placeholder="Nombre del director médico responsable"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
          <textarea value={form.observaciones ?? ''} onChange={(e) => actualizarCampo('observaciones', e.target.value)}
            rows={3} placeholder="Notas adicionales sobre el evento..."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aforo total del recinto</label>
            <input
              type="number"
              min={0}
              value={form.aforoTotal ?? ''}
              onChange={(e) => actualizarCampo('aforoTotal', e.target.value)}
              placeholder="ej: 85000"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aforo estimado para este evento</label>
            <input
              type="number"
              min={0}
              value={form.aforoEstimado ?? ''}
              onChange={(e) => actualizarCampo('aforoEstimado', e.target.value)}
              placeholder="ej: 60000"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Personal de riesgo</label>
          <textarea
            rows={3}
            value={form.personalRiesgo ?? ''}
            onChange={(e) => actualizarCampo('personalRiesgo', e.target.value)}
            placeholder="ej: 150 ultras visitantes sector norte, vikingos en sector 400..."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora inicio del evento</label>
            <input type="time" value={form.horaInicioEvento ?? ''} onChange={(e) => actualizarCampo('horaInicioEvento', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora fin del evento</label>
            <input type="time" value={form.horaFinEvento ?? ''} onChange={(e) => actualizarCampo('horaFinEvento', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={enviando}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors">
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button onClick={() => router.push('/eventos')} disabled={enviando}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-6 py-2 rounded-md transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
