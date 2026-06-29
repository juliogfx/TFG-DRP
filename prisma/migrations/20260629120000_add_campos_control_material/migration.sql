-- F1.7 — Control de material por evento: añade columna JSON a dotacion.
-- Aplicación manual (prisma migrate dev no se puede usar aquí por la deriva
-- del enum EstadoDotacion heredada de F1.1).

ALTER TABLE "dotacion" ADD COLUMN "control_material" JSONB;
