-- AlterTable
ALTER TABLE "persona" DROP COLUMN "titulacion",
ADD COLUMN     "titulacion_id" INTEGER;

-- CreateTable
CREATE TABLE "titulacion_catalogo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(300),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titulacion_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "titulacion_catalogo_nombre_key" ON "titulacion_catalogo"("nombre");

-- CreateIndex
CREATE INDEX "titulacion_catalogo_activo_idx" ON "titulacion_catalogo"("activo");

-- CreateIndex
CREATE INDEX "titulacion_catalogo_orden_idx" ON "titulacion_catalogo"("orden");

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_titulacion_id_fkey" FOREIGN KEY ("titulacion_id") REFERENCES "titulacion_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
