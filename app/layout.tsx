/**
 * @file app/layout.tsx
 * @description Root layout de la aplicación TFG-DRP.
 *
 * Define la estructura visual común a todas las rutas: barra lateral
 * fija a la izquierda (componente Sidebar) y área principal a la
 * derecha donde se renderiza la página activa.
 *
 * Server Component — no usa hooks de cliente. La lógica de ruta activa
 * está delegada al componente cliente Sidebar.tsx.
 */

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Sidebar from '@/app/components/Sidebar';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'TFG-DRP — Gestión de Dispositivos de Riesgos Previsibles',
  description: 'Sistema de gestión de eventos sanitarios, dotaciones y coordinación UCO.',
};

/**
 * RootLayout — envoltorio principal de la aplicación.
 * Renderiza el Sidebar (Client Component con ruta activa) y el
 * contenedor del contenido de la ruta activa.
 *
 * @param props.children - Subárbol React de la página activa.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 overflow-hidden`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 ml-64 min-w-0 h-screen overflow-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
