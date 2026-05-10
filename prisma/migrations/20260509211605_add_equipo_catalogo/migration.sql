-- AlterTable
ALTER TABLE "evento" ADD COLUMN     "equipo_local_id" INTEGER,
ADD COLUMN     "equipo_visitante_id" INTEGER;

-- CreateTable
CREATE TABLE "equipo_catalogo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "codigo" VARCHAR(5) NOT NULL,
    "deporte" VARCHAR(50) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "equipo_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipo_catalogo_codigo_key" ON "equipo_catalogo"("codigo");

-- CreateIndex
CREATE INDEX "equipo_catalogo_deporte_idx" ON "equipo_catalogo"("deporte");

-- CreateIndex
CREATE INDEX "equipo_catalogo_activo_idx" ON "equipo_catalogo"("activo");

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_equipo_local_id_fkey" FOREIGN KEY ("equipo_local_id") REFERENCES "equipo_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_equipo_visitante_id_fkey" FOREIGN KEY ("equipo_visitante_id") REFERENCES "equipo_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
