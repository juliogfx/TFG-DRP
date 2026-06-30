-- Campos nuevos en Evento: aforoTotal e personalRiesgo (texto libre).
-- aforoEstimado y Dotacion.indicativo ya existen, no se tocan.

ALTER TABLE "evento"
    ADD COLUMN "aforo_total"     INTEGER,
    ADD COLUMN "personal_riesgo" TEXT;
