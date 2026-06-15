-- CreateTable
CREATE TABLE "asignacion_material_dotacion" (
    "id" SERIAL NOT NULL,
    "dotacion_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "observaciones" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignacion_material_dotacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asignacion_material_dotacion_dotacion_id_idx" ON "asignacion_material_dotacion"("dotacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_material_dotacion_dotacion_id_material_id_key" ON "asignacion_material_dotacion"("dotacion_id", "material_id");

-- AddForeignKey
ALTER TABLE "asignacion_material_dotacion" ADD CONSTRAINT "asignacion_material_dotacion_dotacion_id_fkey" FOREIGN KEY ("dotacion_id") REFERENCES "dotacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_material_dotacion" ADD CONSTRAINT "asignacion_material_dotacion_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
