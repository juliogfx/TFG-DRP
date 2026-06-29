-- CreateEnum
CREATE TYPE "EstadoIntervencion" AS ENUM ('PENDIENTE_DOTACION', 'EN_CURSO', 'CERRADA');

-- CreateEnum
CREATE TYPE "ResolucionIntervencion" AS ENUM ('ALTA_EN_LUGAR', 'TRASLADO_CLINICA', 'ALTA_EN_CLINICA', 'TRASLADO_HOSPITALARIO');

-- DropForeignKey
ALTER TABLE "intervencion" DROP CONSTRAINT "intervencion_dotacion_activa_id_fkey";

-- AlterTable
ALTER TABLE "intervencion" ADD COLUMN     "estado" "EstadoIntervencion" NOT NULL DEFAULT 'PENDIENTE_DOTACION',
ADD COLUMN     "resolucion" "ResolucionIntervencion",
ADD COLUMN     "sector" VARCHAR(100),
ADD COLUMN     "uco" VARCHAR(10) NOT NULL DEFAULT 'UCO1',
ALTER COLUMN "dotacion_activa_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_dotacion_activa_id_fkey" FOREIGN KEY ("dotacion_activa_id") REFERENCES "dotacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
