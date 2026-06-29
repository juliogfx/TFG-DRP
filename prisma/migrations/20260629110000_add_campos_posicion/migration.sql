-- F1.2 — Posiciones por evento: añadir zona, renombrar capacidad_personas
-- a componentes_maximo y añadir componentes_minimo.
-- Migración manual: `prisma migrate dev` no se puede usar en este entorno
-- por la deriva del enum EstadoDotacion (F1.1 ADD VALUE sin DROP).

ALTER TABLE "posicion" RENAME COLUMN "capacidad_personas" TO "componentes_maximo";
ALTER TABLE "posicion" ADD COLUMN "componentes_minimo" INTEGER;
ALTER TABLE "posicion" ADD COLUMN "zona" VARCHAR(20);
