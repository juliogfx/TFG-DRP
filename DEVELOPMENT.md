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
- Schema v4.6 — 25 modelos, 10 migraciones aplicadas
- Snake_case via @@map/@map — no modificar los mapeos
- Soft-delete via deletedAt en Evento y Dotacion — filtrar siempre deletedAt: null
- Codigos cortos VarChar en Empresa (5), TipoEventoCatalogo (3), Ubicacion (3), EquipoCatalogo (5)

## Patrones obligatorios
- Singleton Prisma en lib/db/prisma.ts — importar siempre desde ahí
- Tipos de API en types/ — nunca exponer tipos @prisma/client fuera de lib/db/
- JSDoc completo en todas las funciones (descripción, @param, @returns, @throws)
- Comentario de cabecera en cada fichero
- export const dynamic = 'force-dynamic' en todas las API routes de catálogo

## Estructura
- app/api/          → API routes (Route Handlers)
- app/components/   → Componentes React reutilizables (Sidebar.tsx)
- app/eventos/      → Páginas módulo eventos
- app/dotaciones/   → Páginas módulo dotaciones
- app/uco/          → Dashboard UCO
- lib/db/           → Acceso a BD con Prisma (eventos.ts, dotaciones.ts)
- types/            → Tipos TypeScript compartidos (evento.ts, dotacion.ts, uco.ts)
- prisma/           → Schema y migraciones
- scripts/          → Utilidades de desarrollo (count-records.ts)
- docs/             → Generado localmente (ERD.svg) — gitignored

## Comandos
- npm run dev           → servidor desarrollo
- npx prisma generate   → regenerar cliente tras cambios en schema
- npx prisma migrate dev --name <nombre> → nueva migración
- npx prisma migrate deploy → aplicar migraciones pendientes
- npx prisma db seed    → poblar BD con datos de prueba
- npm run docs          → generar documentación TypeDoc
- npm run build         → build producción (verificar antes de push)

## Estado actual (Día 9 — 10 mayo 2026)

### Módulos implementados
- **Eventos** — CRUD completo con soft-delete, formulario crear/editar
- **Dotaciones** — lista por evento, detalle, asignación personal, cambio estado
- **Dashboard UCO** — estado tiempo real, polling 30s, contadores intervenciones

### API Routes (17 rutas)
- GET/POST /api/eventos
- GET/PUT/DELETE /api/eventos/[id]
- GET/POST /api/dotaciones
- GET/PUT/DELETE /api/dotaciones/[id]
- POST/DELETE /api/dotaciones/[id]/asignaciones
- GET /api/personal
- GET /api/uco/estado
- GET /api/ubicaciones (force-dynamic)
- GET /api/tipos-evento (force-dynamic)
- GET /api/empresas (force-dynamic)
- GET /api/equipos (force-dynamic)

### Funcionalidades del formulario de eventos
- Selección equipo local/visitante para eventos deportivos
- Filtrado de equipos por competición (PLA→LaLiga, CHA→Europa+LaLiga, etc.)
- Exclusión mutua local/visitante
- Autocompletado de nombre: "[Local] vs [Visitante] - DD/MM/YYYY"
- Autocompletado de temporada según fecha y deporte
- Campo Artista/Grupo para eventos no deportivos

### Seed data
- 2 eventos, 8 dotaciones, 4 personas, 3 ubicaciones
- 2 empresas (RMD promotor, ECE contratada)
- 3 tipos de evento (PLA, CHA, CON)
- 15 equipos deportivos (fútbol LaLiga, Europa, selecciones, baloncesto)

### Fuera del alcance del PoC
- Registro de intervenciones médicas
- Módulo QR material
- Gestión inventario
- Plantillas de eventos
- Autenticación y control de acceso
- AlertaMaterial, EstadoDotacionLog (post-MVP)

## Dominio (mantener en español)
Evento, DRP, Dotacion, Posicion, Puesto, Intervencion, UCO, Plantilla, Empresa, EquipoCatalogo
