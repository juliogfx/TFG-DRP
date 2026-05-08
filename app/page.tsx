/**
 * @file app/page.tsx
 * @description Página de inicio del sistema DRP-Platform.
 *
 * Muestra una bienvenida al sistema y cards de acceso rápido
 * a los tres módulos principales. Componente estático — no requiere
 * fetch ni estado. Se renderiza en el servidor (Server Component).
 */

import Link from 'next/link';

interface ModuloCard {
  href: string;
  titulo: string;
  descripcion: string;
  icono: string;
  color: string;
}

const MODULOS: ModuloCard[] = [
  {
    href: '/eventos',
    titulo: 'Gestión de Eventos',
    descripcion: 'Crea y gestiona los Dispositivos de Riesgos Previsibles. Define el evento, ubicación, tipo y empresas responsables.',
    icono: '📅',
    color: 'border-blue-500',
  },
  {
    href: '/dotaciones',
    titulo: 'Dotaciones y Personal',
    descripcion: 'Asigna personal sanitario a las dotaciones de cada evento. Gestiona el estado operativo de cada recurso desplegado.',
    icono: '🚑',
    color: 'border-green-500',
  },
  {
    href: '/uco',
    titulo: 'Dashboard UCO',
    descripcion: 'Vista operativa en tiempo real para el Coordinador de Operaciones. Estado de todas las dotaciones con refresco automático.',
    icono: '📡',
    color: 'border-orange-500',
  },
];

/**
 * Página de inicio del sistema DRP-Platform.
 * Renderiza la bienvenida y las cards de acceso rápido a los módulos.
 */
export default function HomePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">DRP-Platform</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Sistema de gestión digital para{' '}
          <span className="font-semibold text-slate-800">Dispositivos de Riesgos Previsibles</span>.
          Coordinación operativa de eventos de concurrencia masiva para Cruz Roja Madrid.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            PoC — Prueba de Concepto
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Temporada 2025-26
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {MODULOS.map((modulo) => (
          <Link
            key={modulo.href}
            href={modulo.href}
            className={`block bg-white rounded-lg border-t-4 ${modulo.color} border border-slate-200 p-6 hover:shadow-md transition-shadow`}
          >
            <div className="text-3xl mb-3">{modulo.icono}</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{modulo.titulo}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{modulo.descripcion}</p>
          </Link>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Sobre el sistema</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-700">Stack tecnológico</p>
            <p>Next.js 14 · TypeScript · Prisma · PostgreSQL</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Base de datos</p>
            <p>Supabase (eu-west-1) · Schema v4.1</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Metodología</p>
            <p>SAMUR-Protección Civil · Plan Arán (Arán Ediciones, 2024)</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Versión</p>
            <p>PoC v0.1 · TFG UNIR 2025-26</p>
          </div>
        </div>
      </div>
    </div>
  );
}
