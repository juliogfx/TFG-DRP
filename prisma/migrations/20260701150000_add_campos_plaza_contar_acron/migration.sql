-- Campos nuevos en PlazaDotacion: contar (bool default true) y acron (varchar 10).
-- Reflejan las columnas CONTAR y ACRON del Excel Asistentes.

ALTER TABLE "plaza_dotacion"
    ADD COLUMN "contar" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "acron"  VARCHAR(10);
