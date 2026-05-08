/**
 * @file app/components/Sidebar.tsx
 * @description Barra lateral de navegación principal del sistema DRP-Platform.
 *
 * Client Component — requiere usePathname() para detectar la ruta activa
 * y resaltar visualmente el enlace correspondiente.
 *
 * Extraído de app/layout.tsx para permitir que el layout principal
 * permanezca como Server Component (necesario para metadata de Next.js).
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  hint: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/eventos',    label: 'Eventos',    hint: 'Gestión de eventos' },
  { href: '/dotaciones', label: 'Dotaciones', hint: 'Dotaciones y personal' },
  { href: '/uco',        label: 'UCO',        hint: 'Dashboard UCO' },
];

/**
 * Sidebar de navegación con indicador de ruta activa.
 * Usa usePathname() para comparar la ruta actual con cada enlace.
 * Un enlace se considera activo si la ruta actual empieza por su href.
 */
export default function Sidebar() {
  const pathname = usePathname();

  /**
   * Determina si un enlace de navegación está activo.
   * @param href - Ruta del enlace a evaluar.
   * @returns true si la ruta actual corresponde a este enlace.
   */
  function esActivo(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-200 text-slate-800 px-6 py-8 flex flex-col">
      <div className="mb-10">
        <Link href="/" className="block hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-semibold tracking-tight">TFG-DRP</h1>
          <p className="text-xs text-slate-500 mt-1">Dispositivos de Riesgos Previsibles</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const activo = esActivo(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 transition-colors ${
                activo
                  ? 'bg-slate-400 text-slate-900 font-semibold'
                  : 'hover:bg-slate-300 text-slate-700'
              }`}
            >
              <span className="block text-sm">{item.label}</span>
              <span className={`block text-xs ${activo ? 'text-slate-700' : 'text-slate-500'}`}>
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      <footer className="text-xs pt-4 border-t border-slate-300 text-slate-500">
        v4.1 · 2026
      </footer>
    </aside>
  );
}
