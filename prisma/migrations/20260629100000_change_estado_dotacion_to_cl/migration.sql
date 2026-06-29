-- F1.1 — Migración de claves CL0-CL6 en enum EstadoDotacion
-- Estrategia: ADD VALUE + UPDATE (sin DROP) para preservar datos existentes.
-- IMPORTANTE: en PostgreSQL los valores nuevos de un enum no pueden usarse
-- dentro de la misma transacción en que fueron añadidos. Por eso este SQL
-- se aplica fuera de la transacción de migración de Prisma usando un
-- script Node que ejecuta cada sentencia individualmente con auto-commit
-- (ver scripts/apply_estado_dotacion_cl.ts). Después se marca esta
-- migración como aplicada con `prisma migrate resolve --applied`.

-- Primero añadir nuevos valores al enum
ALTER TYPE "EstadoDotacion" ADD VALUE IF NOT EXISTS 'CL0_DISPONIBLE';
ALTER TYPE "EstadoDotacion" ADD VALUE IF NOT EXISTS 'CL1_EN_CAMINO';
ALTER TYPE "EstadoDotacion" ADD VALUE IF NOT EXISTS 'CL2_EN_INTERVENCION';
ALTER TYPE "EstadoDotacion" ADD VALUE IF NOT EXISTS 'CL3_NO_DISPONIBLE';
ALTER TYPE "EstadoDotacion" ADD VALUE IF NOT EXISTS 'CL5_SOLICITUD_AYUDA';
ALTER TYPE "EstadoDotacion" ADD VALUE IF NOT EXISTS 'CL6_SITUACION_CONFLICTIVA';

-- Sustituir default a los valores antiguos antes de migrar datos
ALTER TABLE "dotacion" ALTER COLUMN "estado" DROP DEFAULT;

-- Migrar datos existentes (dotacion)
UPDATE "dotacion" SET "estado" = 'CL0_DISPONIBLE'      WHERE "estado" = 'DISPONIBLE';
UPDATE "dotacion" SET "estado" = 'CL2_EN_INTERVENCION' WHERE "estado" = 'EN_INTERVENCION';
UPDATE "dotacion" SET "estado" = 'CL3_NO_DISPONIBLE'   WHERE "estado" = 'NO_OPERATIVA';

-- Migrar datos existentes (estado_dotacion_log)
UPDATE "estado_dotacion_log" SET "estado_anterior" = 'CL0_DISPONIBLE'      WHERE "estado_anterior" = 'DISPONIBLE';
UPDATE "estado_dotacion_log" SET "estado_anterior" = 'CL2_EN_INTERVENCION' WHERE "estado_anterior" = 'EN_INTERVENCION';
UPDATE "estado_dotacion_log" SET "estado_anterior" = 'CL3_NO_DISPONIBLE'   WHERE "estado_anterior" = 'NO_OPERATIVA';
UPDATE "estado_dotacion_log" SET "estado_nuevo"    = 'CL0_DISPONIBLE'      WHERE "estado_nuevo"    = 'DISPONIBLE';
UPDATE "estado_dotacion_log" SET "estado_nuevo"    = 'CL2_EN_INTERVENCION' WHERE "estado_nuevo"    = 'EN_INTERVENCION';
UPDATE "estado_dotacion_log" SET "estado_nuevo"    = 'CL3_NO_DISPONIBLE'   WHERE "estado_nuevo"    = 'NO_OPERATIVA';

-- Restaurar default con el nuevo valor
ALTER TABLE "dotacion" ALTER COLUMN "estado" SET DEFAULT 'CL0_DISPONIBLE';

-- Nota: los valores antiguos del enum (DISPONIBLE, EN_INTERVENCION, NO_OPERATIVA)
-- permanecen en el tipo pero ya no se usan. PostgreSQL no permite eliminar
-- valores de enum directamente; eliminarlos requeriría recrear el tipo, lo
-- que no es necesario porque Prisma sólo genera código para los 6 valores
-- declarados en schema.prisma.
