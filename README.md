# 🚑 TFG-DRP

**Ecosistema digital para gestión de Dispositivos de Riesgos Previsibles (DRP)**

Trabajo Fin de Grado - Ingeniería Informática  
Universidad Internacional de La Rioja (UNIR)  
Convocatoria: Julio 2026

---

## 📋 Descripción

Aplicación web progresiva (PWA) para la gestión integral de Dispositivos de Riesgos Previsibles en eventos multitudinarios. El sistema sustituye el modelo actual basado en hojas de cálculo Excel por una solución digital integrada, ofreciendo:

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
- **PWA:** next-pwa

### Base de Datos
- **Motor:** PostgreSQL
- **ORM:** Prisma
- **Hosting:** Supabase

### Deploy & CI/CD
- **Frontend:** Vercel
- **Database:** Supabase
- **Control de versiones:** GitHub
- **CI/CD:** GitHub Actions

---

## 🚀 Estado del Proyecto

- ✅ **Capítulo 2 (Contexto y Estado del Arte):** Completado (8 abril 2026)
- 🔄 **Capítulo 3 (Objetivos y Metodología):** En progreso
- ⏳ **Capítulo 4 (Desarrollo):** Pendiente
- ⏳ **Capítulo 5 (Resultados):** Pendiente
- ⏳ **Capítulo 6 (Conclusiones):** Pendiente

**Fecha depósito:** 15 julio 2026

---

## 📁 Estructura del Proyecto

```
TFG-DRP/
├── docs/              # Documentación técnica
│   ├── arquitectura.md
│   ├── requisitos.md
│   └── base-datos.md
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # Componentes React
│   ├── lib/          # Utilidades y helpers
│   └── prisma/       # Schema y migraciones
├── tests/            # Tests unitarios y E2E
├── public/           # Archivos estáticos
└── README.md
```

---

## 🎯 Funcionalidades Principales

### Módulo 1: Gestión de Eventos
- Crear y configurar eventos DRP
- Asignar ubicación, fecha y aforo
- Dimensionamiento automático de recursos

### Módulo 2: Gestión de Personal
- CRUD completo de personal sanitario
- Asignación a eventos
- Control de disponibilidad

### Módulo 3: Gestión de Material
- Inventario de equipamiento médico
- Control de stock
- Alertas de reposición

### Módulo 4: Registro de Intervenciones
- Captura de datos en tiempo real
- Clasificación por gravedad
- Historial médico

### Módulo 5: Reporting
- Estadísticas por evento
- Reportes automáticos
- Exportación PDF/Excel

---

## 🔧 Instalación y Uso

> **Nota:** Este proyecto está en desarrollo activo como parte de un TFG.

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- PostgreSQL (o cuenta Supabase)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/juliogfx/TFG-DRP.git
cd TFG-DRP

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar servidor desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 📚 Documentación

- [Análisis de Requisitos](./docs/requisitos.md)
- [Arquitectura del Sistema](./docs/arquitectura.md)
- [Modelo de Base de Datos](./docs/base-datos.md)
- [Guía de Contribución](./CONTRIBUTING.md)

---

## 👨‍💻 Autor

**Julio García Fernández**  
Estudiante de Ingeniería Informática - UNIR  
📧 [email@ejemplo.com](mailto:email@ejemplo.com)  
🔗 [LinkedIn](https://linkedin.com/in/tu-perfil)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- UNIR - Universidad Internacional de La Rioja
- Director del TFG: [Nombre del Director]
- Organizaciones colaboradoras: organizaciones de emergencias, SAMUR
- Usuarios y stakeholders que participaron en las entrevistas

---

## 📊 Progreso del Desarrollo

```
Fase 1: Análisis y Diseño          ████████░░ 80%
Fase 2: Implementación Backend      ░░░░░░░░░░  0%
Fase 3: Implementación Frontend     ░░░░░░░░░░  0%
Fase 4: Testing y Validación        ░░░░░░░░░░  0%
Fase 5: Documentación               ████░░░░░░ 40%
```

---

## 🗓️ Roadmap

- [x] Investigación y Estado del Arte
- [x] Definición de requisitos
- [ ] Diseño de base de datos
- [ ] Implementación módulo gestión eventos
- [ ] Implementación módulo gestión personal
- [ ] Implementación módulo intervenciones
- [ ] Sistema de autenticación y roles
- [ ] Dashboard y reportes
- [ ] Testing completo
- [ ] Despliegue en producción
- [ ] Defensa TFG

---

**Última actualización:** Abril 2026
