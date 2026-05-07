/**
 * @file app/eventos/page.tsx
 * @description Página de listado de Eventos del módulo de gestión DRP.
 *
 * Muestra una tabla con todos los eventos activos obtenidos de
 * GET /api/eventos. Permite navegar al formulario de creación,
 * ver el detalle/edición de un evento, y eliminar con soft-delete
 * tras confirmación del usuario.
 *
 * Client Component — necesita interactividad (fetch, confirm, router).
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventoListItem } from '@/types/evento';

function useEventos() {
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/eventos');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setEventos(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  return { eventos, loading, error, recargar: cargar };
}

export default function EventosPage() {
  const router = useRouter();
  const { eventos, loading, error, recargar } = useEventos();
  const [eliminando, setEliminando] = useState<number | null>(null);

  async function handleEliminar(id: number, nombre: string) {
    if (!window.confirm(`¿Eliminar el evento "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(id);
    try {
      const res = await fetch(`/api/eventos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      await recargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar el evento');
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Eventos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de Dispositivos de Riesgos Previsibles</p>
        </div>
        <button
          onClick={() => router.push('/eventos/nuevo')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nuevo evento
        </button>
      </div>

      {loading && <div className="text-center py-12 text-slate-500">Cargando eventos...</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          Error al cargar los eventos: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {eventos.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No hay eventos registrados.{' '}
              <button onClick={() => router.push('/eventos/nuevo')} className="text-blue-600 hover:underline">
                Crear el primero
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Ubicación</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Dotaciones</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eventos.map((evento) => (
                    <tr key={evento.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{evento.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                          {evento.ubicacion.codigo}
                        </span>
                        {evento.ubicacion.nombre}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {evento.tipoEvento?.nombre ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                          {evento.numeroDotaciones}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => router.push(`/eventos/${evento.id}/editar`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(evento.id, evento.nombre)}
                          disabled={eliminando === evento.id}
                          className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                        >
                          {eliminando === evento.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
