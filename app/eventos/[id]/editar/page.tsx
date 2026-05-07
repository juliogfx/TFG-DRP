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

export default function EditarEventoPage() {
  const router = useRouter();
  const params = useParams();
  const eventoId = Number(params.id);

  const [form, setForm] = useState<UpdateEventoInput>({});
  const [ubicaciones, setUbicaciones] = useState<OpcionCatalogo[]>([]);
  const [tiposEvento, setTiposEvento] = useState<OpcionCatalogo[]>([]);
  const [empresas, setEmpresas] = useState<OpcionEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!eventoId || isNaN(eventoId)) { setNoEncontrado(true); setCargando(false); return; }

    async function cargarDatos() {
      try {
        const [resEvento, resUbic, resTipos, resEmpresas] = await Promise.all([
          fetch(`/api/eventos/${eventoId}`),
          fetch('/api/ubicaciones'),
          fetch('/api/tipos-evento'),
          fetch('/api/empresas'),
        ]);

        if (resEvento.status === 404) { setNoEncontrado(true); return; }
        if (!resEvento.ok) throw new Error(`Error ${resEvento.status} al cargar el evento`);

        const [dataEvento, dataUbic, dataTipos, dataEmpresas] = await Promise.all([
          resEvento.json(), resUbic.json(), resTipos.json(), resEmpresas.json(),
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
          temporada: evento.temporada ?? '',
          empresaPromotorId: evento.empresaPromotor?.id ?? undefined,
          empresaContratadaId: evento.empresaContratada?.id ?? undefined,
          directorMedico: evento.directorMedico ?? '',
          observaciones: evento.observaciones ?? '',
        });

        setUbicaciones(dataUbic.data ?? []);
        setTiposEvento(dataTipos.data ?? []);
        setEmpresas(dataEmpresas.data ?? []);
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
      [campo]: ['ubicacionId', 'tipoEventoId', 'aforoPrevisto', 'aforoEstimado',
        'empresaPromotorId', 'empresaContratadaId'].includes(campo)
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
  const esConcierto = tiposEvento.find((t) => t.id === form.tipoEventoId)?.codigo === 'CON';

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
            <input type="date" value={form.fecha ?? ''} onChange={(e) => actualizarCampo('fecha', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de evento</label>
            <select value={form.tipoEventoId ?? ''} onChange={(e) => actualizarCampo('tipoEventoId', e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              {tiposEvento.map((t) => <option key={t.id} value={t.id}>[{t.codigo}] {t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{esConcierto ? 'Artista / Grupo' : 'Rival'}</label>
            <input type="text" value={form.rival ?? ''} onChange={(e) => actualizarCampo('rival', e.target.value)}
              placeholder={esConcierto ? 'Ej: Bad Bunny, Taylor Swift...' : 'Ej: Atlético de Madrid'}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

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
