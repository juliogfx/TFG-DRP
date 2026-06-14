'use client';

import { useEffect, useState } from 'react';

interface Titulacion {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

const FORM_INICIAL = { nombre: '', descripcion: '', orden: 0 };

export default function TitulacionesPage() {
  const [titulaciones, setTitulaciones] = useState<Titulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal creación
  const [showModal, setShowModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);

  // Modal edición
  const [editando, setEditando] = useState<Titulacion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  useEffect(() => {
    cargarTitulaciones();
  }, []);

  async function cargarTitulaciones() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/titulaciones');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setTitulaciones(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar titulaciones');
    } finally {
      setCargando(false);
    }
  }

  async function handleCrear() {
    setErrorCreacion(null);
    if (!form.nombre.trim()) { setErrorCreacion('El nombre es obligatorio.'); return; }
    setCreando(true);
    try {
      const res = await fetch('/api/titulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, orden: form.orden }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setTitulaciones((prev) => [...prev, json.data].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)));
      setShowModal(false);
      setForm(FORM_INICIAL);
    } catch (e) {
      setErrorCreacion(e instanceof Error ? e.message : 'Error al crear titulación');
    } finally {
      setCreando(false);
    }
  }

  async function handleGuardar() {
    if (!editando) return;
    setErrorEdicion(null);
    if (!editando.nombre.trim()) { setErrorEdicion('El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      const res = await fetch(`/api/titulaciones/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editando.nombre.trim(), descripcion: editando.descripcion?.trim() || null, orden: editando.orden }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setTitulaciones((prev) => prev.map((t) => t.id === editando.id ? json.data : t).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)));
      setEditando(null);
    } catch (e) {
      setErrorEdicion(e instanceof Error ? e.message : 'Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleActivo(t: Titulacion) {
    if (t.activo) {
      if (!window.confirm(`¿Desactivar la titulación "${t.nombre}"?`)) return;
      try {
        const res = await fetch(`/api/titulaciones/${t.id}`, { method: 'DELETE' });
        if (!res.ok) { const json = await res.json(); throw new Error(json.error ?? `Error ${res.status}`); }
        setTitulaciones((prev) => prev.map((x) => x.id === t.id ? { ...x, activo: false } : x));
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al desactivar');
      }
    } else {
      try {
        const res = await fetch(`/api/titulaciones/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: true }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
        setTitulaciones((prev) => prev.map((x) => x.id === t.id ? json.data : x));
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al activar');
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Titulaciones</h1>
          <p className="text-sm text-slate-500 mt-1">Catálogo de titulaciones sanitarias</p>
        </div>
        <button
          onClick={() => { setForm(FORM_INICIAL); setErrorCreacion(null); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nueva titulación
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>}

      {cargando ? (
        <div className="text-center py-12 text-slate-500">Cargando titulaciones...</div>
      ) : titulaciones.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay titulaciones en el catálogo.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Descripción</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Orden</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {titulaciones.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.nombre}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.descripcion ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{t.orden}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setErrorEdicion(null); setEditando({ ...t }); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActivo(t)}
                      className={`text-sm font-medium ${t.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal creación */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nueva titulación</h2>
            {errorCreacion && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{errorCreacion}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <input type="text" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Orden</label>
                <input type="number" value={form.orden} onChange={(e) => setForm((p) => ({ ...p, orden: Number(e.target.value) }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowModal(false)} disabled={creando} className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleCrear} disabled={creando} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                {creando ? 'Creando...' : 'Crear titulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editando && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Editar titulación</h2>
            {errorEdicion && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{errorEdicion}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input type="text" value={editando.nombre} onChange={(e) => setEditando((p) => p ? { ...p, nombre: e.target.value } : p)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <input type="text" value={editando.descripcion ?? ''} onChange={(e) => setEditando((p) => p ? { ...p, descripcion: e.target.value } : p)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Orden</label>
                <input type="number" value={editando.orden} onChange={(e) => setEditando((p) => p ? { ...p, orden: Number(e.target.value) } : p)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditando(null)} disabled={guardando} className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
