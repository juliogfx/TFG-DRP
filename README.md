# TFG-DRP — Plataforma de Gestión de Dispositivos de Riesgos Previsibles

Plataforma web para la gestión operativa de Dispositivos de Riesgos
Previsibles (DRP) en eventos de concurrencia masiva. Desarrollada como
Trabajo Fin de Grado en Ingeniería Informática (UNIR, 2026).

## Stack técnico
- Next.js 14 + TypeScript
- Prisma 7 + PostgreSQL (Supabase)
- Vercel (despliegue)

## Módulos implementados
1. **Gestión de eventos** — con plantillas reutilizables y dimensionamiento RRHH/RRMM
2. **Gestión de dotaciones** — personal, plazas y estado CL0-CL6
3. **Dashboard UCO** — tiempo real, claves CL0-CL6, intervenciones
4. **Registro de intervenciones** — resolución, parte, dotación
5. **Control de fichajes** — asistencia y horas entrada/salida
6. **Control de material** — entrega/devolución por dotación
7. **Plantillas de evento** — reutilizables con dimensionamiento
8. **Asignación de asistentes** — plazas por dotación y titulación

## Instalación
```bash
git clone https://github.com/juliogfx/TFG-DRP.git
cd TFG-DRP
npm install
cp .env.example .env  # completar con tus credenciales
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

## Variables de entorno requeridas
```
DATABASE_URL=     # Connection string Supabase (puerto 6543, pgbouncer)
DIRECT_URL=       # Connection string directa Supabase (puerto 5432)
```

## Despliegue
https://tfg-drp.vercel.app

## Licencia
AGPL-3.0 — ver fichero LICENSE
