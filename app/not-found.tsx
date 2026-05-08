/**
 * @file app/not-found.tsx
 * @description Página 404 personalizada del sistema DRP-Platform.
 *
 * Se renderiza automáticamente por Next.js App Router cuando una ruta
 * no existe o cuando se llama a notFound() desde un Server Component.
 * Mantiene el layout con sidebar para coherencia visual con el resto
 * de la aplicación.
 *
 * Server Component — no requiere 'use client'.
 */

import Link from 'next/link';

/**
 * Página de error 404 personalizada.
 * Muestra un mensaje claro de página no encontrada y enlaces
 * para volver al inicio o ir a Eventos.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-8xl font-bold text-slate-200 mb-4 select-none">404</div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Página no encontrada</h1>
      <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
        La página que buscas no existe o ha sido eliminada.
        Usa la navegación lateral o vuelve al inicio.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
          Volver al inicio
        </Link>
        <Link href="/eventos" className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-5 py-2 rounded-md transition-colors">
          Ir a Eventos
        </Link>
      </div>
    </div>
  );
}
