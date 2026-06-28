-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('PENDIENTE', 'ACTIVO', 'FINALIZADO');

-- AlterTable
ALTER TABLE "evento" ADD COLUMN     "estado" "EstadoEvento" NOT NULL DEFAULT 'PENDIENTE';
