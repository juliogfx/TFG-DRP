-- Opción B — Persistencia del dimensionamiento dentro de una plantilla.

-- CreateTable
CREATE TABLE "plantilla_dimensionamiento" (
    "id" SERIAL NOT NULL,
    "plantilla_id" INTEGER NOT NULL,
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

    CONSTRAINT "plantilla_dimensionamiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plantilla_dimensionamiento_plantilla_id_idx" ON "plantilla_dimensionamiento"("plantilla_id");

-- AddForeignKey
ALTER TABLE "plantilla_dimensionamiento" ADD CONSTRAINT "plantilla_dimensionamiento_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantilla_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
