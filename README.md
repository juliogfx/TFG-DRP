# 🚑 TFG-DRP

**Plataforma digital para gestión de Dispositivos de Riesgos Previsibles (DRP)**

Trabajo Fin de Grado - Ingeniería Informática  
Universidad Internacional de La Rioja (UNIR)  
Convocatoria: Julio 2026

---

## 📋 Descripción

Aplicación web para la gestión integral de Dispositivos de Riesgos Previsibles en eventos multitudinarios. El sistema sustituye el modelo actual basado en hojas de cálculo Excel por una solución digital integrada, ofreciendo:

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

## 🚀 Estado del Proyecto

- ✅ **Capítulo 2 (Contexto y Estado del Arte):** Completado
- ✅ **Capítulo 3 (Objetivos y Metodología):** Completado
- 🔄 **Capítulo 4 (Desarrollo):** En progreso
- ⏳ **Capítulo 5 (Resultados):** Pendiente
- ⏳ **Capítulo 6 (Conclusiones):** Pendiente

**Fecha depósito:** 15 julio 2026

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
│   └── migrations/           # 4 migraciones (3 aplicadas + 1 pendiente)
│       ├── 20260503221121_init
│       ├── 20260504202805_v4_empresas_plantillas
│       ├── 20260509211605_add_equipo_catalogo
│       └── 20260XXX_add_titulacion_catalogo
├── prisma.config.ts          # Configuración Prisma 7
└── README.md
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
- Catálogo de titulaciones sanitarias (RF-28)
- Catálogo de equipos deportivos con importación API (RF-29)

---

## 🔧 Instalación y Uso

### Prerrequisitos
- Node.js 24+
- npm
- Cuenta Supabase (o PostgreSQL local)

### Instalación

```bash
git clone https://github.com/juliogfx/TFG-DRP.git
cd TFG-DRP
npm install

# Crear .env con credenciales Supabase (ver .env.example)

npx prisma migrate dev
npx prisma db seed
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 🧑‍💻 Guía de Desarrollo

### Convenciones
- Componentes en `/app/components/`
- API routes en `/app/api/` — todas con `export const dynamic = 'force-dynamic'`
- Funciones de BD en `/lib/db/`
- Tipos TypeScript en `/types/`

### Schema de base de datos
Ver `prisma/schema.prisma` — v4.3, 25 modelos.
Migraciones: `20260503221121_init`, `20260504202805_v4_empresas_plantillas`,
`20260509211605_add_equipo_catalogo`,
`20260XXX_add_titulacion_catalogo` (pendiente)

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

---

## 🙏 Agradecimientos

- UNIR - Universidad Internacional de La Rioja
- Director del TFG: Luis Pedraza Gomar
- Usuarios reales del sector que participaron en los cuestionarios de validación

---

```
Fase 1: Análisis y Diseño           ██████████ 100%
Fase 2: Implementación Backend      █████████░  90%
Fase 3: Implementación Frontend     ███████░░░  70%
Fase 4: Testing y Validación        ████░░░░░░  40%
Fase 5: Documentación               ███████░░░  70%
```

---

## 🗓️ Roadmap

- [x] Investigación y Estado del Arte
- [x] Definición de requisitos (30 RF + 8 RNF)
- [x] Diseño de base de datos (schema v4.3 — 25 modelos)
- [x] Setup entorno (Next.js 14 + Prisma 7 + Supabase + Vercel)
- [x] Módulo gestión de eventos (CRUD + catálogo equipos)
- [x] Módulo gestión de dotaciones y personal
- [x] Dashboard UCO con polling en tiempo real
- [x] Despliegue en producción (tfg-drp.vercel.app)
- [ ] Registro de intervenciones médicas — Entrega 3 (17 jun)
- [ ] Autenticación y control de acceso por roles — Entrega 3 (17 jun)
- [ ] Catálogo titulaciones sanitarias (RF-28) — Entrega 3
- [ ] Gestión de material e inventario — si hay tiempo (jul)
- [ ] Testing y validación con usuarios reales — jun/jul
- [ ] Gestión de walkies — post-TFG
- [ ] Defensa TFG

---

**Última actualización:** Mayo 2026
