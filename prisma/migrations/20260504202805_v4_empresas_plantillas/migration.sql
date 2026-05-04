/*
  Warnings:

  - The values [EMPRESA_CONTRATANTE] on the enum `RolUsuario` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `tipo` on the `evento` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[codigo]` on the table `ubicacion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigo` to the `ubicacion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoEmpresa" AS ENUM ('PROMOTOR', 'CONTRATADA', 'FACULTATIVOS');

-- AlterEnum
BEGIN;
CREATE TYPE "RolUsuario_new" AS ENUM ('UCO', 'COORDINADOR', 'VOLUNTARIO', 'FACULTATIVO', 'ALMACEN', 'ADMIN', 'PROMOTOR', 'EMPRESA_CONTRATADA', 'EMPRESA_FACULTATIVOS');
ALTER TABLE "usuario_sistema" ALTER COLUMN "rol" TYPE "RolUsuario_new" USING ("rol"::text::"RolUsuario_new");
ALTER TYPE "RolUsuario" RENAME TO "RolUsuario_old";
ALTER TYPE "RolUsuario_new" RENAME TO "RolUsuario";
DROP TYPE "public"."RolUsuario_old";
COMMIT;

-- DropIndex
DROP INDEX "evento_tipo_idx";

-- AlterTable
ALTER TABLE "evento" DROP COLUMN "tipo",
ADD COLUMN     "empresa_contratada_id" INTEGER,
ADD COLUMN     "empresa_promotor_id" INTEGER,
ADD COLUMN     "evento_origen_id" INTEGER,
ADD COLUMN     "plantilla_origen_id" INTEGER,
ADD COLUMN     "tipo_evento_id" INTEGER;

-- AlterTable
ALTER TABLE "ubicacion" ADD COLUMN     "codigo" VARCHAR(3) NOT NULL;

-- AlterTable
ALTER TABLE "usuario_sistema" ADD COLUMN     "empresa_id" INTEGER;

-- DropEnum
DROP TYPE "TipoEvento";

-- CreateTable
CREATE TABLE "empresa" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "codigo" VARCHAR(3) NOT NULL,
    "tipo" "TipoEmpresa" NOT NULL,
    "telefono" VARCHAR(20),
    "email" VARCHAR(255),
    "contacto" VARCHAR(150),
    "direccion" VARCHAR(300),
    "cif" VARCHAR(20),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_evento_catalogo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(3) NOT NULL,
    "descripcion" VARCHAR(300),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_evento_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_evento" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(20) NOT NULL,
    "codigo_loc" VARCHAR(3) NOT NULL,
    "codigo_evt" VARCHAR(3) NOT NULL,
    "codigo_ctr" VARCHAR(3) NOT NULL,
    "texto_libre" VARCHAR(6) NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "tipo_evento_id" INTEGER,
    "ubicacion_id" INTEGER,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_posicion" (
    "id" SERIAL NOT NULL,
    "plantilla_id" INTEGER NOT NULL,
    "puesto_id" INTEGER NOT NULL,
    "nombre_sugerido" VARCHAR(100),
    "personal_minimo" INTEGER NOT NULL DEFAULT 2,
    "sector" VARCHAR(100),
    "observaciones" VARCHAR(300),

    CONSTRAINT "plantilla_posicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_codigo_key" ON "empresa"("codigo");

-- CreateIndex
CREATE INDEX "empresa_tipo_idx" ON "empresa"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_evento_catalogo_nombre_key" ON "tipo_evento_catalogo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_evento_catalogo_codigo_key" ON "tipo_evento_catalogo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "plantilla_evento_nombre_key" ON "plantilla_evento"("nombre");

-- CreateIndex
CREATE INDEX "plantilla_evento_empresa_id_idx" ON "plantilla_evento"("empresa_id");

-- CreateIndex
CREATE INDEX "plantilla_evento_tipo_evento_id_idx" ON "plantilla_evento"("tipo_evento_id");

-- CreateIndex
CREATE INDEX "plantilla_evento_ubicacion_id_idx" ON "plantilla_evento"("ubicacion_id");

-- CreateIndex
CREATE INDEX "plantilla_posicion_plantilla_id_idx" ON "plantilla_posicion"("plantilla_id");

-- CreateIndex
CREATE INDEX "evento_tipo_evento_id_idx" ON "evento"("tipo_evento_id");

-- CreateIndex
CREATE INDEX "evento_empresa_contratada_id_idx" ON "evento"("empresa_contratada_id");

-- CreateIndex
CREATE UNIQUE INDEX "ubicacion_codigo_key" ON "ubicacion"("codigo");

-- CreateIndex
CREATE INDEX "usuario_sistema_empresa_id_idx" ON "usuario_sistema"("empresa_id");

-- AddForeignKey
ALTER TABLE "plantilla_evento" ADD CONSTRAINT "plantilla_evento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_evento" ADD CONSTRAINT "plantilla_evento_tipo_evento_id_fkey" FOREIGN KEY ("tipo_evento_id") REFERENCES "tipo_evento_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_evento" ADD CONSTRAINT "plantilla_evento_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_posicion" ADD CONSTRAINT "plantilla_posicion_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantilla_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_posicion" ADD CONSTRAINT "plantilla_posicion_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "puesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_sistema" ADD CONSTRAINT "usuario_sistema_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_tipo_evento_id_fkey" FOREIGN KEY ("tipo_evento_id") REFERENCES "tipo_evento_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_empresa_promotor_id_fkey" FOREIGN KEY ("empresa_promotor_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_empresa_contratada_id_fkey" FOREIGN KEY ("empresa_contratada_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_plantilla_origen_id_fkey" FOREIGN KEY ("plantilla_origen_id") REFERENCES "plantilla_evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_evento_origen_id_fkey" FOREIGN KEY ("evento_origen_id") REFERENCES "evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
