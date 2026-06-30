-- Opción B — Migración manual:
--  · plaza_dotacion          (N plazas por dotación, asignables a Persona)
--  · dimensionamiento_evento (RRHH + RRMM por dotación dentro de un evento)

-- CreateTable
CREATE TABLE "plaza_dotacion" (
    "id" SERIAL NOT NULL,
    "dotacion_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "rol_requerido" VARCHAR(50),
    "persona_id" INTEGER,
    "incorporacion" VARCHAR(20),
    "observaciones" TEXT,

    CONSTRAINT "plaza_dotacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plaza_dotacion_dotacion_id_numero_key" ON "plaza_dotacion"("dotacion_id", "numero");

-- CreateIndex
CREATE INDEX "plaza_dotacion_dotacion_id_idx" ON "plaza_dotacion"("dotacion_id");

-- CreateIndex
CREATE INDEX "plaza_dotacion_persona_id_idx" ON "plaza_dotacion"("persona_id");

-- AddForeignKey
ALTER TABLE "plaza_dotacion" ADD CONSTRAINT "plaza_dotacion_dotacion_id_fkey" FOREIGN KEY ("dotacion_id") REFERENCES "dotacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaza_dotacion" ADD CONSTRAINT "plaza_dotacion_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "dimensionamiento_evento" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "dotacion_id" INTEGER,
    "nombre" VARCHAR(50) NOT NULL,
    "incluida" BOOLEAN NOT NULL DEFAULT true,
    "med" INTEGER NOT NULL DEFAULT 0,
    "due" INTEGER NOT NULL DEFAULT 0,
    "cond" INTEGER NOT NULL DEFAULT 0,
    "tec" INTEGER NOT NULL DEFAULT 0,
    "soc_tec" INTEGER NOT NULL DEFAULT 0,
    "otr" INTEGER NOT NULL DEFAULT 0,
    "vehiculo" BOOLEAN NOT NULL DEFAULT false,
    "camillas" INTEGER NOT NULL DEFAULT 0,
    "silla" BOOLEAN NOT NULL DEFAULT false,
    "b_basico" INTEGER NOT NULL DEFAULT 0,
    "b_due" INTEGER NOT NULL DEFAULT 0,
    "b_ox_med" INTEGER NOT NULL DEFAULT 0,
    "oxig" INTEGER NOT NULL DEFAULT 0,
    "ampul" INTEGER NOT NULL DEFAULT 0,
    "morfico" INTEGER NOT NULL DEFAULT 0,
    "monitor" BOOLEAN NOT NULL DEFAULT false,
    "p_pantalla" INTEGER NOT NULL DEFAULT 0,
    "portatil" INTEGER NOT NULL DEFAULT 0,
    "observ" VARCHAR(200),

    CONSTRAINT "dimensionamiento_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dimensionamiento_evento_evento_id_idx" ON "dimensionamiento_evento"("evento_id");

-- CreateIndex
CREATE INDEX "dimensionamiento_evento_dotacion_id_idx" ON "dimensionamiento_evento"("dotacion_id");

-- AddForeignKey
ALTER TABLE "dimensionamiento_evento" ADD CONSTRAINT "dimensionamiento_evento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimensionamiento_evento" ADD CONSTRAINT "dimensionamiento_evento_dotacion_id_fkey" FOREIGN KEY ("dotacion_id") REFERENCES "dotacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
