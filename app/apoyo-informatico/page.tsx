'use client';

import Link from 'next/link';

const CATALOGOS = [
  {
    href: '/apoyo-informatico/titulaciones',
    titulo: 'Titulaciones sanitarias',
    descripcion: 'Gestiona el catálogo de titulaciones del personal sanitario (Médico, DUE, TES, Socorrista, etc.).',
    icono: '🎓',
    implementado: true,
  },
  {
    href: '/apoyo-informatico/tipos-evento',
    titulo: 'Tipos de evento',
    descripcion: 'Gestiona los tipos de evento disponibles (Liga, Champions, Concierto, Maratón, etc.).',
    icono: '📅',
    implementado: false,
  },
  {
    href: '/apoyo-informatico/ubicaciones',
    titulo: 'Ubicaciones y recintos',
    descripcion: 'Gestiona los recintos donde se celebran los eventos (Bernabéu, Metropolitano, WiZink, etc.).',
    icono: '📍',
    implementado: false,
  },
  {
    href: '/apoyo-informatico/empresas',
    titulo: 'Empresas',
    descripcion: 'Gestiona las empresas promotoras, contratadas y de facultativos vinculadas a los eventos.',
    icono: '🏢',
    implementado: false,
  },
  {
    href: '/apoyo-informatico/puestos',
    titulo: 'Puestos operativos',
    descripcion: 'Gestiona los puestos de trabajo del operativo (Botiquín, UVI Móvil, Ambulancia, Banquillo, etc.).',
    icono: '🚑',
    implementado: false,
  },
  {
    href: '/apoyo-informatico/sintomatologias',
    titulo: 'Sintomatologías',
    descripcion: 'Gestiona el catálogo de sintomatologías para el registro de intervenciones médicas.',
    icono: '🏥',
    implementado: false,
  },
  {
    href: '/apoyo-informatico/material',
    titulo: 'Material',
    descripcion: 'Gestiona el catálogo de material sanitario (botiquín, DESA, camilla, oxígeno, etc.).',
    icono: '🧰',
    implementado: false,
  },
  {
    href: '/apoyo-informatico/walkies',
    titulo: 'Walkies',
    descripcion: 'Gestiona el inventario de equipos de radiocomunicación disponibles para los operativos.',
    icono: '📻',
    implementado: false,
  },
];

export default function ApoyoInformaticoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Apoyo Informático
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestión de catálogos y configuración del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CATALOGOS.map((cat) => (
          <div key={cat.href} className="relative">
            {cat.implementado ? (
              <Link
                href={cat.href}
                className="block p-5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="text-3xl mb-3">{cat.icono}</div>
                <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 mb-1">
                  {cat.titulo}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.descripcion}
                </p>
              </Link>
            ) : (
              <div className="block p-5 bg-slate-50 border border-slate-200 rounded-lg opacity-60 cursor-not-allowed">
                <div className="text-3xl mb-3 grayscale">{cat.icono}</div>
                <h2 className="text-sm font-semibold text-slate-500 mb-1">
                  {cat.titulo}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {cat.descripcion}
                </p>
                <span className="inline-block mt-2 text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                  Próximamente
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
