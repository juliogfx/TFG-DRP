/**
 * @file app/layout.tsx
 * @description Root layout de la aplicación TFG-DRP.
 *
 * Define la estructura visual común a todas las rutas: una barra lateral
 * fija a la izquierda con los tres ejes funcionales del proyecto
 * (Eventos, Dotaciones, UCO) y un área principal a la derecha donde se
 * renderiza la página activa.
 *
 * Estilado con Tailwind CSS. Se conservan las fuentes Geist locales para
 * mantener la coherencia tipográfica del scaffolding original de Next.js.
 */

import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TFG-DRP — Gestión de Dispositivos de Riesgos Previsibles",
  description:
    "Sistema de gestión de eventos sanitarios, dotaciones y coordinación UCO.",
};

/**
 * Entrada de navegación de la barra lateral.
 * @property href     Ruta destino (App Router).
 * @property label    Texto principal mostrado al usuario.
 * @property hint     Descripción corta secundaria (opcional).
 */
interface NavItem {
  href: string;
  label: string;
  hint?: string;
}

const navItems: NavItem[] = [
  { href: "/eventos",    label: "Eventos",    hint: "Gestión de eventos" },
  { href: "/dotaciones", label: "Dotaciones", hint: "Dotaciones y personal" },
  { href: "/uco",        label: "UCO",        hint: "Dashboard UCO" },
];

/**
 * RootLayout — envoltorio principal de la aplicación.
 *
 * Renderiza la barra lateral fija (ancho 64) y el contenedor del contenido
 * de la ruta activa. Aplica las variables CSS de las fuentes Geist al
 * `<body>` para que estén disponibles en toda la árbol React.
 *
 * @param props.children Subárbol React de la página activa, inyectado por
 *                       Next.js App Router.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <div className="flex min-h-screen">
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-700 text-slate-100 px-6 py-8 flex flex-col">
            <div className="mb-10">
              <h1 className="text-xl font-semibold tracking-tight">TFG-DRP</h1>
              <p className="text-xs text-slate-300 mt-1">
                Dispositivos de Riesgos Previsibles
              </p>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 hover:bg-slate-600 transition-colors"
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  {item.hint && (
                    <span className="block text-xs text-slate-300">
                      {item.hint}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            <footer className="text-xs text-slate-500 pt-4 border-t border-slate-600">
              v4.1 · 2026
            </footer>
          </aside>

          <main className="flex-1 ml-64 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
