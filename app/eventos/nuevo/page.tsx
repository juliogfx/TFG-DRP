/**
 * @file app/eventos/nuevo/page.tsx
 * @description Página de creación de un nuevo Evento DRP.
 *
 * Renderiza un formulario con los campos del Evento. Los selects de
 * ubicación, tipo de evento y empresas se cargan desde los endpoints
 * de catálogo. Al enviar, llama a POST /api/eventos y redirige a
 * /eventos si la operación tiene éxito.
 *
 * Client Component — necesita fetch, estado de formulario y router.
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CreateEventoInput } from '@/types/evento';

interface OpcionCatalogo { id: number; nombre: string; codigo: string; }
interface OpcionEmpresa extends OpcionCatalogo { tipo: 'PROMOTOR' | 'CONTRATADA' | 'FACULTATIVOS'; }
interface OpcionEquipo { id: number; nombre: string; codigo: string; deporte: string; }
interface OpcionPlantilla { id: number; nombre: string; descripcion: string | null; numeroPosiciones: number }

export default function NuevoEventoPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500">Cargando...</div>}>
      <NuevoEventoContent />
    </Suspense>
  );
}

function NuevoEventoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plantillaIdParam = searchParams.get('plantillaId');

  const [form, setForm] = useState<CreateEventoInput>({
    nombre: '',
    ubicacionId: 0,
    fecha: '',
    tipoEventoId: undefined,
    rival: '',
    aforoPrevisto: undefined,
    temporada: '',
    empresaPromotorId: undefined,
    empresaContratadaId: undefined,
    equipoLocalId: undefined,
    equipoVisitanteId: undefined,
    horaInicioEvento: '',
    horaFinEvento: '',
  });

  const [ubicaciones, setUbicaciones] = useState<OpcionCatalogo[]>([]);
  const [tiposEvento, setTiposEvento] = useState<OpcionCatalogo[]>([]);
  const [empresas, setEmpresas] = useState<OpcionEmpresa[]>([]);
  const [equipos, setEquipos] = useState<OpcionEquipo[]>([]);
  const [plantillas, setPlantillas] = useState<OpcionPlantilla[]>([]);
  const [plantillaId, setPlantillaId] = useState<number | ''>(plantillaIdParam ? Number(plantillaIdParam) : '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [resUbic, resTipos, resEmpresas, resEquipos, resPlant] = await Promise.all([
          fetch('/api/ubicaciones'),
          fetch('/api/tipos-evento'),
          fetch('/api/empresas'),
          fetch('/api/equipos'),
          fetch('/api/plantillas'),
        ]);
        const [dataUbic, dataTipos, dataEmpresas, dataEquipos, dataPlant] = await Promise.all([
          resUbic.json(), resTipos.json(), resEmpresas.json(), resEquipos.json(), resPlant.json(),
        ]);
        setUbicaciones(dataUbic.data ?? []);
        setTiposEvento(dataTipos.data ?? []);
        setEmpresas(dataEmpresas.data ?? []);
        setEquipos(dataEquipos.data ?? []);
        setPlantillas(dataPlant.data ?? []);
      } catch {
        setError('Error al cargar los datos del formulario. Recarga la página.');
      } finally {
        setCargandoCatalogos(false);
      }
    }
    cargarCatalogos();
  }, []);

  function actualizarCampo(campo: keyof CreateEventoInput, valor: string) {
    setForm((prev) => ({
      ...prev,
      [campo]: ['ubicacionId', 'tipoEventoId', 'aforoPrevisto', 'empresaPromotorId', 'empresaContratadaId', 'equipoLocalId', 'equipoVisitanteId']
        .includes(campo) ? (valor === '' ? undefined : Number(valor)) : valor,
    }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.nombre.trim()) return setError('El nombre del evento es obligatorio.');
    if (!form.ubicacionId) return setError('Selecciona una ubicación.');
    if (!form.fecha) return setError('La fecha del evento es obligatoria.');

    setEnviando(true);
    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);

      // F1.3 — si el usuario eligió plantilla, la aplicamos al evento
      // recién creado. El evento queda creado igualmente si falla, así
      // que devolvemos al usuario a /eventos con el aviso.
      const eventoIdCreado = json.data?.id;
      if (plantillaId && eventoIdCreado) {
        const resAplicar = await fetch(`/api/plantillas/${plantillaId}/aplicar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventoId: eventoIdCreado }),
        });
        if (!resAplicar.ok) {
          const errJson = await resAplicar.json();
          throw new Error(`Evento creado pero no se aplicó la plantilla: ${errJson.error ?? `Error ${resAplicar.status}`}`);
        }
      }
      router.push('/eventos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el evento');
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

  if (cargandoCatalogos) return <div className="text-center py-12 text-slate-500">Cargando formulario...</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.push('/eventos')} className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1">
          ← Volver a eventos
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo evento</h1>
        <p className="text-sm text-slate-500 mt-1">Los campos marcados con * son obligatorios.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      <div className="space-y-5">
        {plantillas.length > 0 && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
            <label className="block text-sm font-medium text-blue-900 mb-1">Crear desde plantilla (opcional)</label>
            <select
              value={plantillaId}
              onChange={(e) => setPlantillaId(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sin plantilla (evento vacío) —</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.numeroPosiciones} pos.){p.descripcion ? ` — ${p.descripcion}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-blue-700 mt-1">
              Al seleccionar plantilla, tras crear el evento se generan automáticamente las posiciones y dotaciones definidas.
            </p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
          <input type="text" value={form.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)}
            placeholder="Ej: Real Madrid vs FC Barcelona"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación *</label>
            <select value={form.ubicacionId || ''} onChange={(e) => actualizarCampo('ubicacionId', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              {ubicaciones.map((u) => <option key={u.id} value={u.id}>[{u.codigo}] {u.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={form.fecha}
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
                  const nombre = nombreSugerido(undefined, undefined, form.fecha, rival);
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
                  const visitanteId = id === form.equipoVisitanteId ? undefined : form.equipoVisitanteId;
                  const nombre = nombreSugerido(id, visitanteId, form.fecha, form.rival ?? '');
                  setForm((prev) => ({ ...prev, equipoLocalId: id, equipoVisitanteId: visitanteId, ...(nombre !== '' && { nombre }) }));
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
                  const nombre = nombreSugerido(form.equipoLocalId, id, form.fecha, form.rival ?? '');
                  setForm((prev) => ({ ...prev, equipoVisitanteId: id, ...(nombre !== '' && { nombre }) }));
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
            {enviando ? 'Creando...' : 'Crear evento'}
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
