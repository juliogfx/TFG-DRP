/**
 * @file app/page.tsx
 * @description Página de inicio del sistema DRP-Platform.
 *
 * Muestra una bienvenida al sistema y cards de acceso rápido
 * a los módulos principales. Componente estático — no requiere
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
    titulo: 'Eventos',
    descripcion: 'Crea y gestiona eventos con plantillas y dimensionamiento de recursos humanos y materiales (RRHH/RRMM).',
    icono: '📅',
    color: 'border-blue-500',
  },
  {
    href: '/plantillas',
    titulo: 'Plantillas',
    descripcion: 'Define plantillas reutilizables con dotaciones, personal y material para distintos tipos de eventos.',
    icono: '📋',
    color: 'border-indigo-500',
  },
  {
    href: '/dotaciones',
    titulo: 'Dotaciones',
    descripcion: 'Gestiona las dotaciones del evento, asigna personal a cada plaza y controla el estado operativo con claves CL0-CL6.',
    icono: '🚑',
    color: 'border-green-500',
  },
  {
    href: '/uco',
    titulo: 'UCO',
    descripcion: 'Vista operativa en tiempo real. Estado de dotaciones, gestión de intervenciones y comunicaciones radio.',
    icono: '📡',
    color: 'border-orange-500',
  },
  {
    href: '/uco/intervenciones',
    titulo: 'Intervenciones',
    descripcion: 'Registro y seguimiento de intervenciones médicas. Historial completo con resolución, parte y dotación responsable.',
    icono: '🏥',
    color: 'border-red-500',
  },
  {
    href: '/eventos',
    titulo: 'Fichajes',
    descripcion: 'Control de asistencia y registro de horas de entrada y salida del personal del evento.',
    icono: '⏱️',
    color: 'border-teal-500',
  },
  {
    href: '/eventos',
    titulo: 'Material',
    descripcion: 'Entrega y devolución de material sanitario y walkies por dotación.',
    icono: '📦',
    color: 'border-amber-500',
  },
  {
    href: '/eventos',
    titulo: 'Asignación',
    descripcion: 'Asigna asistentes a las plazas de cada dotación según su titulación y disponibilidad.',
    icono: '👥',
    color: 'border-cyan-500',
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
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Plataforma DRP</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Sistema de gestión digital para{' '}
          <span className="font-semibold text-slate-800">Dispositivos de Riesgos Previsibles</span>.
          Coordinación operativa de eventos de concurrencia masiva.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            v1.0 — Beta
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Temporada 2025-26
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
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
            <p>Supabase (eu-west-1) · Schema v4.6</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Versión</p>
            <p>v1.0 · TFG UNIR 2025-26</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Módulos activos</p>
            <p>Eventos · Plantillas · Dotaciones · UCO · Intervenciones · Fichajes · Material · Asignación</p>
          </div>
        </div>
      </div>
    </div>
  );
}
