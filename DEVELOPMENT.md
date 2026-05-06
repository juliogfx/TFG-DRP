# TFG-DRP — Guía de Desarrollo

## Stack
- Next.js 14 (App Router) + TypeScript strict
- Prisma 7 + @prisma/adapter-pg (obligatorio en v7)
- PostgreSQL via Supabase (eu-west-1)
- Tailwind CSS
- Node 24+

## Variables de entorno
- DATABASE_URL → pooler Supabase puerto 6543 (runtime)
- DIRECT_URL → conexión directa puerto 5432 (migraciones/seed)

## Base de datos
- Schema v4.1 — 23 modelos, 2 migraciones aplicadas
- Snake_case via @@map/@map — no modificar los mapeos
- Soft-delete via deletedAt en Evento y Dotacion — filtrar siempre deletedAt: null
- Codigos cortos VarChar(3) en Empresa, TipoEventoCatalogo, Ubicacion

## Patrones obligatorios
- Singleton Prisma en lib/db/prisma.ts — importar siempre desde ahí
- Tipos de API en types/ — nunca exponer tipos @prisma/client fuera de lib/db/
- JSDoc completo en todas las funciones (descripción, @param, @returns, @throws)
- Comentario de cabecera en cada fichero

## Estructura
- app/api/          → API routes (Route Handlers)
- app/components/   → Componentes React reutilizables
- app/eventos/      → Páginas módulo eventos
- app/dotaciones/   → Páginas módulo dotaciones
- app/uco/          → Dashboard UCO
- lib/db/           → Acceso a BD con Prisma
- types/            → Tipos TypeScript compartidos
- prisma/           → Schema y migraciones
- scripts/          → Utilidades de desarrollo

## Comandos
- npm run dev       → servidor desarrollo
- npx prisma generate → regenerar cliente tras cambios en schema
- npx prisma migrate deploy → aplicar migraciones pendientes
- npx prisma db seed → poblar BD con datos de prueba
- npm run docs      → generar documentación TypeDoc

## Estado actual (Día 2 completado)
- Seed: 31 registros en 9 tablas (Supabase)
- API Eventos: GET/POST /api/eventos, GET/PUT/DELETE /api/eventos/[id]
- API Catálogos: GET /api/ubicaciones, /api/tipos-evento, /api/empresas (sin commitear)
- Páginas: pendientes (Día 3)

## Dominio (mantener en español)
Evento, DRP, Dotacion, Posicion, Puesto, Intervencion, UCO, Plantilla, Empresa
