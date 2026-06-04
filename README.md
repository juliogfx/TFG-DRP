# 🚑 TFG-DRP

**Plataforma digital para gestión de Dispositivos de Riesgos Previsibles (DRP)**

Trabajo Fin de Grado - Ingeniería Informática  
Universidad Internacional de La Rioja (UNIR)  
Convocatoria: Julio 2026

---

## 📋 Descripción

Sistema web que digitaliza la gestión operativa de Dispositivos de Riesgos Previsibles (DRP) en eventos de concurrencia masiva. Sustituye el modelo actual basado en 27 hojas de cálculo Excel por una plataforma integrada accesible desde cualquier dispositivo sin instalación.

Un DRP es el conjunto de recursos humanos y materiales sanitarios desplegados en un evento para atender emergencias médicas. La plataforma cubre:

- 📊 Gestión centralizada de eventos y recursos sanitarios
- 👥 Asignación y seguimiento de personal sanitario por dotación
- 🚑 Control del estado operativo de dotaciones en tiempo real
- 📡 Dashboard UCO con actualización automática cada 30 segundos
- 📱 Acceso multiplataforma sin instalación (web, móvil, tablet)
- 🔒 Control de acceso basado en roles

---

## 🛠️ Stack Tecnológico

### Frontend & Backend
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Lenguaje:** TypeScript
- **Styling:** Tailwind CSS

### Base de Datos
- **Motor:** PostgreSQL
- **ORM:** Prisma 7
- **Hosting:** Supabase (región eu-west-1 — Irlanda)
- **Schema:** v4.3 — 25 modelos, 4 migraciones aplicadas

### Deploy & CI/CD
- **Frontend:** Vercel (free tier) — https://tfg-drp.vercel.app
- **Database:** Supabase (free tier)
- **Control de versiones:** GitHub
- **CI/CD:** Despliegue automático en cada push a main

---

## 📁 Estructura del Proyecto

```
TFG-DRP/
├── app/
│   ├── api/                  # API Routes (17 endpoints)
│   │   ├── eventos/          # CRUD eventos + soft-delete
│   │   ├── dotaciones/       # CRUD dotaciones + asignaciones
│   │   ├── personal/         # Catálogo personal sanitario
│   │   ├── uco/              # Dashboard UCO
│   │   ├── ubicaciones/      # Catálogo ubicaciones
│   │   ├── tipos-evento/     # Catálogo tipos de evento
│   │   ├── empresas/         # Catálogo empresas
│   │   ├── equipos/          # Catálogo equipos deportivos
│   │   └── titulaciones/     # Catálogo titulaciones sanitarias
│   ├── components/           # Componentes React (Sidebar)
│   ├── eventos/              # Páginas módulo eventos
│   ├── dotaciones/           # Páginas módulo dotaciones
│   └── uco/                  # Dashboard UCO
├── lib/
│   └── db/                   # Funciones de acceso a BD
├── types/                    # Tipos TypeScript compartidos
├── prisma/
│   ├── schema.prisma         # Schema BD v4.3 (25 modelos)
│   ├── seed.ts               # Datos de prueba
│   └── migrations/           # 4 migraciones aplicadas
│       ├── 20260503221121_init
│       ├── 20260504202805_v4_empresas_plantillas
│       ├── 20260509211605_add_equipo_catalogo
│       └── 20260XXX_add_titulacion_catalogo
├── prisma.config.ts          # Configuración Prisma 7
└── README.md
```

---

## ⚙️ Variables de Entorno

Copia `.env.example` a `.env` y rellena los valores:

| Variable | Descripción | Observaciones |
|----------|-------------|---------------|
| `DATABASE_URL` | Cadena de conexión al pool de Supabase (PgBouncer) | Puerto 6543. Incluir `?pgbouncer=true` |
| `DIRECT_URL` | Conexión directa a PostgreSQL sin pool | Puerto 5432. Solo para migraciones y seed |

```env
DATABASE_URL="postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

> ⚠️ Nunca subas `.env` al repositorio. El fichero ya está en `.gitignore`.

---

## 🔧 Instalación local para desarrollo

### Prerrequisitos

- **Node.js** v24 LTS o superior (`node --version`)
- **npm** v10 o superior (`npm --version`)
- Cuenta en [Supabase](https://supabase.com) (free tier suficiente)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/juliogfx/TFG-DRP.git
cd TFG-DRP

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 4. Generar cliente Prisma
npx prisma generate

# 5. Aplicar migraciones
npx prisma migrate deploy

# 6. Poblar BD con datos de prueba
npx prisma db seed

# 7. Arrancar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 🚀 Despliegue en producción (Vercel + Supabase)

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New project
2. Elige región **eu-west-1 (Ireland)**
3. En **Project Settings → Database** copia:
   - **Connection string (Transaction mode)** → valor de `DATABASE_URL` (puerto 6543)
   - **Connection string (Session mode)** → valor de `DIRECT_URL` (puerto 5432)

### 2. Aplicar el schema

```bash
# Con DIRECT_URL configurado en .env
npx prisma migrate deploy
npx prisma db seed
```

### 3. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → New Project → importa este repositorio
2. En **Settings → Environment Variables** añade `DATABASE_URL` y `DIRECT_URL` marcándolas como **Sensitive**
3. Vercel desplegará automáticamente en cada push a `main`

### 4. Verificar el despliegue

```bash
curl https://tfg-drp.vercel.app/api/eventos
```

---

## 🎯 Módulos Implementados (MVP)

### Módulo 1: Gestión de Eventos ✅
- CRUD completo con soft-delete
- Selección de equipo local y visitante desde catálogo (15 equipos)
- Filtrado de equipos por competición (LaLiga, Champions, Copa, ACB)
- Autocompletado del nombre del evento y temporada

### Módulo 2: Gestión de Dotaciones y Personal ✅
- Lista de dotaciones filtrada por evento
- Asignación de personal con roles predefinidos
- Cambio de estado operativo: DISPONIBLE / EN_INTERVENCIÓN / NO_OPERATIVA
- Indicador visual de cobertura de personal

### Módulo 3: Dashboard UCO ✅
- Vista operativa en tiempo real
- Tarjetas por dotación con estado y personal
- Contadores: intervenciones, traslados clínica, traslados hospital
- Polling automático cada 30 segundos

### Módulos post-MVP (diseñados, pendientes de implementar)
- Registro de intervenciones médicas
- Gestión de material e inventario con QR
- Plantillas de eventos
- Autenticación y control de acceso por roles
- Catálogo de titulaciones sanitarias
- Catálogo de equipos deportivos con importación API

---

## 🧑‍💻 Guía de Desarrollo

### Convenciones
- Componentes en `/app/components/`
- API routes en `/app/api/` — todas con `export const dynamic = 'force-dynamic'`
- Funciones de BD en `/lib/db/`
- Tipos TypeScript en `/types/`
- JSDoc obligatorio en todas las funciones

### Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npx prisma generate` | Regenerar cliente Prisma tras cambios en schema |
| `npx prisma migrate dev --name nombre` | Nueva migración en desarrollo |
| `npx prisma migrate deploy` | Aplicar migraciones en producción |
| `npx prisma db seed` | Poblar BD con datos iniciales |
| `npx prisma studio` | Explorador visual de BD (localhost:5555) |

### Schema de base de datos

Ver `prisma/schema.prisma` — v4.3, 25 modelos.

Migraciones aplicadas:
- `20260503221121_init`
- `20260504202805_v4_empresas_plantillas`
- `20260509211605_add_equipo_catalogo`
- `20260XXX_add_titulacion_catalogo` (pendiente)

---

## 📚 Documentación

- [Schema de Base de Datos](./prisma/schema.prisma)
- [Guía de desarrollo](./DEVELOPMENT.md)

---

## 👨‍💻 Autor

**Julio García Fernández**  
Estudiante de Ingeniería Informática - UNIR  
Director TFG: Luis Pedraza Gomar

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
