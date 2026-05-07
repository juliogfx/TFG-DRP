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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateEventoInput } from '@/types/evento';

interface OpcionCatalogo { id: number; nombre: string; codigo: string; }
interface OpcionEmpresa extends OpcionCatalogo { tipo: 'PROMOTOR' | 'CONTRATADA' | 'FACULTATIVOS'; }

export default function NuevoEventoPage() {
  const router = useRouter();

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
  });

  const [ubicaciones, setUbicaciones] = useState<OpcionCatalogo[]>([]);
  const [tiposEvento, setTiposEvento] = useState<OpcionCatalogo[]>([]);
  const [empresas, setEmpresas] = useState<OpcionEmpresa[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [resUbic, resTipos, resEmpresas] = await Promise.all([
          fetch('/api/ubicaciones'),
          fetch('/api/tipos-evento'),
          fetch('/api/empresas'),
        ]);
        const [dataUbic, dataTipos, dataEmpresas] = await Promise.all([
          resUbic.json(), resTipos.json(), resEmpresas.json(),
        ]);
        setUbicaciones(dataUbic.data ?? []);
        setTiposEvento(dataTipos.data ?? []);
        setEmpresas(dataEmpresas.data ?? []);
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
      [campo]: ['ubicacionId', 'tipoEventoId', 'aforoPrevisto', 'empresaPromotorId', 'empresaContratadaId']
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
      router.push('/eventos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el evento');
    } finally {
      setEnviando(false);
    }
  }

  const promotores = empresas.filter((e) => e.tipo === 'PROMOTOR');
  const contratadas = empresas.filter((e) => e.tipo === 'CONTRATADA' || e.tipo === 'FACULTATIVOS');

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
            <input type="date" value={form.fecha} onChange={(e) => actualizarCampo('fecha', e.target.value)}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Rival</label>
            <input type="text" value={form.rival ?? ''} onChange={(e) => actualizarCampo('rival', e.target.value)}
              placeholder="Ej: Atlético de Madrid"
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
