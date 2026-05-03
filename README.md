# 🚑 TFG-DRP

**Ecosistema digital para gestión de Dispositivos de Riesgos Previsibles (DRP)**

Trabajo Fin de Grado - Ingeniería Informática  
Universidad Internacional de La Rioja (UNIR)  
Convocatoria: Julio 2026

---

## 📋 Descripción

Aplicación web para la gestión integral de Dispositivos de Riesgos Previsibles en eventos multitudinarios. El sistema sustituye el modelo actual basado en hojas de cálculo Excel por una solución digital integrada, ofreciendo:

- 📊 Gestión centralizada de eventos y recursos
- 👥 Asignación y seguimiento de personal sanitario
- 🏥 Registro de intervenciones médicas
- 📈 Generación automática de informes y estadísticas
- 📱 Acceso multiplataforma (web, móvil, tablet)
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

### Deploy & CI/CD
- **Frontend:** Vercel (free tier)
- **Database:** Supabase (free tier)
- **Control de versiones:** GitHub
- **Asistente de código:** GitHub Copilot Chat

---

## 🚀 Estado del Proyecto

- ✅ **Capítulo 2 (Contexto y Estado del Arte):** Completado (8 abril 2026)
- ✅ **Capítulo 3 (Objetivos y Metodología):** Completado (3 mayo 2026)
- 🔄 **Capítulo 4 (Desarrollo):** En progreso
- ⏳ **Capítulo 5 (Resultados):** Pendiente
- ⏳ **Capítulo 6 (Conclusiones):** Pendiente

**Fecha depósito:** 15 julio 2026

---

## 📁 Estructura del Proyecto

```
TFG-DRP/
├── app/                  # Next.js App Router
│   ├── api/              # API Routes
│   └── components/       # Componentes React
├── lib/                  # Utilidades y helpers
│   └── db/               # Funciones de base de datos
├── prisma/
│   ├── schema.prisma     # Schema BD v3 (19 modelos, 40 relaciones)
│   └── migrations/       # Migraciones aplicadas
├── public/               # Archivos estáticos
├── types/                # Tipos TypeScript
├── prisma.config.ts      # Configuración Prisma 7
├── CLAUDE.md             # Contexto para asistentes IA
└── README.md
```

---

## 🎯 Funcionalidades Principales

### Módulo 1: Gestión de Eventos
- Crear y configurar eventos DRP
- Asignar ubicación, fecha y aforo
- Dimensionamiento de recursos

### Módulo 2: Gestión de Personal
- CRUD completo de personal sanitario
- Asignación a dotaciones por evento
- Control de disponibilidad y turnos

### Módulo 3: Gestión de Material
- Inventario de equipamiento médico
- Control de stock con alertas de caducidad
- Revisión por escaneo QR

### Módulo 4: Registro de Intervenciones (UCO)
- Captura de datos en tiempo real
- Clasificación por gravedad
- Trazabilidad completa del episodio

### Módulo 5: Reporting
- Estadísticas por evento y temporada
- Generación de informes operativos
- Exportación de datos

---

## 🔧 Instalación y Uso

> **Nota:** Este proyecto está en desarrollo activo como parte de un TFG.

### Prerrequisitos
- Node.js 24+
- npm
- Cuenta Supabase (o PostgreSQL local)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/juliogfx/TFG-DRP.git
cd TFG-DRP

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear .env con las credenciales de Supabase:
# DATABASE_URL=...
# DIRECT_URL=...

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar servidor desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 📚 Documentación

- [Setup del entorno de desarrollo](./docs/SETUP_ENTORNO_DEV.md)
- [Schema de Base de Datos](./prisma/schema.prisma)
- [Contexto del proyecto para IA](./CLAUDE.md)

---

## 👨‍💻 Autor

**Julio García Fernández**  
Estudiante de Ingeniería Informática - UNIR  
Director TFG: Luis Pedraza Gomar

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- UNIR - Universidad Internacional de La Rioja
- Director del TFG: Luis Pedraza Gomar
- Usuarios reales del sector que participaron en los cuestionarios de validación

---

## 📊 Progreso del Desarrollo

```
Fase 1: Análisis y Diseño           ██████████ 100%
Fase 2: Implementación Backend      █░░░░░░░░░  10%
Fase 3: Implementación Frontend     ░░░░░░░░░░   0%
Fase 4: Testing y Validación        ░░░░░░░░░░   0%
Fase 5: Documentación               ██████░░░░  60%
```

---

## 🗓️ Roadmap

- [x] Investigación y Estado del Arte
- [x] Definición de requisitos
- [x] Diseño de base de datos (schema v3 — 19 modelos)
- [x] Setup entorno (Next.js 14 + Prisma 7 + Supabase + Vercel)
- [ ] Implementación módulo gestión eventos
- [ ] Implementación módulo gestión personal y dotaciones
- [ ] Implementación módulo intervenciones (UCO)
- [ ] Sistema de autenticación y roles
- [ ] Dashboard y reportes
- [ ] Testing y validación con usuarios reales
- [ ] Despliegue en producción
- [ ] Defensa TFG

---

**Última actualización:** Mayo 2026
