/**
 * @file lib/db/prisma.ts
 * @description Singleton del cliente Prisma para toda la aplicación TFG-DRP.
 *
 * Prisma 7 obliga a inyectar un Driver Adapter en tiempo de ejecución
 * (el campo `url` del bloque `datasource` ya no se lee en runtime).
 * Este módulo construye un único `PrismaClient` con `@prisma/adapter-pg`
 * apuntando al pooler de Supabase (`DATABASE_URL`, puerto 6543, pgbouncer=true).
 *
 * En desarrollo se cachea en `globalThis` para evitar que el hot-reload
 * de Next.js cree clientes nuevos en cada cambio (lo que agotaría el pool).
 *
 * Uso:
 *   import { prisma } from '@/lib/db/prisma';
 *   const eventos = await prisma.evento.findMany();
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/** Tipo auxiliar para guardar el cliente en `globalThis` durante desarrollo. */
type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

/**
 * Construye un PrismaClient nuevo usando el adapter de node-postgres.
 * Se prefiere `DATABASE_URL` (pooler) en runtime; `DIRECT_URL` queda
 * reservado para migraciones y scripts one-shot (seed, jobs).
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL,
  });
  return new PrismaClient({ adapter });
}

/**
 * Cliente Prisma compartido. Importar siempre desde aquí en API routes,
 * funciones de `lib/db/*` y server components.
 */
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
