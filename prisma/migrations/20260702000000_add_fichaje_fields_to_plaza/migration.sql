-- F1.5 — Campos de fichaje sobre PlazaDotacion.
-- Sustituyen a AsignacionPersonalDotacion como fuente del control de
-- entrada/salida ahora que la asignación de personal es por plaza.
--
-- Todos nullable: asiste=null significa "aún no marcado"; hora null = sin fichaje.

ALTER TABLE "plaza_dotacion"
    ADD COLUMN "asiste"            BOOLEAN,
    ADD COLUMN "turno_inicio_real" TIMESTAMP(3),
    ADD COLUMN "turno_fin_real"    TIMESTAMP(3);
