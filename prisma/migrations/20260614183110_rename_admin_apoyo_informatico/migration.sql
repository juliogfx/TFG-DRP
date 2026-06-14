-- AlterEnum
BEGIN;
CREATE TYPE "RolUsuario_new" AS ENUM ('UCO', 'COORDINADOR', 'VOLUNTARIO', 'FACULTATIVO', 'ALMACEN', 'APOYO_INFORMATICO', 'PROMOTOR', 'EMPRESA_CONTRATADA', 'EMPRESA_FACULTATIVOS');
ALTER TABLE "usuario_sistema" ALTER COLUMN "rol" TYPE "RolUsuario_new" USING ("rol"::text::"RolUsuario_new");
ALTER TYPE "RolUsuario" RENAME TO "RolUsuario_old";
ALTER TYPE "RolUsuario_new" RENAME TO "RolUsuario";
DROP TYPE "public"."RolUsuario_old";
COMMIT;
