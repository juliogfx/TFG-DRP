/**
 * Aplica la migración 20260629100000_change_estado_dotacion_to_cl
 * sentencia a sentencia (auto-commit entre cada una) porque PostgreSQL
 * no permite usar valores nuevos de un enum dentro de la misma
 * transacción en la que fueron añadidos.
 *
 * Tras ejecutar este script, marcar la migración como aplicada con:
 *   npx prisma migrate resolve --applied 20260629100000_change_estado_dotacion_to_cl
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const NUEVOS_VALORES = [
  'CL0_DISPONIBLE',
  'CL1_EN_CAMINO',
  'CL2_EN_INTERVENCION',
  'CL3_NO_DISPONIBLE',
  'CL5_SOLICITUD_AYUDA',
  'CL6_SITUACION_CONFLICTIVA',
];

const MAPEO: Array<[string, string]> = [
  ['DISPONIBLE', 'CL0_DISPONIBLE'],
  ['EN_INTERVENCION', 'CL2_EN_INTERVENCION'],
  ['NO_OPERATIVA', 'CL3_NO_DISPONIBLE'],
];

async function main() {
  console.log('1/4 Añadiendo valores nuevos al enum EstadoDotacion...');
  for (const valor of NUEVOS_VALORES) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "EstadoDotacion" ADD VALUE IF NOT EXISTS '${valor}'`
    );
    console.log(`   + ${valor}`);
  }

  console.log('2/4 Quitando default temporalmente de dotacion.estado...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "dotacion" ALTER COLUMN "estado" DROP DEFAULT`);

  console.log('3/4 Migrando filas existentes...');
  for (const [viejo, nuevo] of MAPEO) {
    const dot = await prisma.$executeRawUnsafe(
      `UPDATE "dotacion" SET "estado" = '${nuevo}' WHERE "estado" = '${viejo}'`
    );
    const logAnt = await prisma.$executeRawUnsafe(
      `UPDATE "estado_dotacion_log" SET "estado_anterior" = '${nuevo}' WHERE "estado_anterior" = '${viejo}'`
    );
    const logNue = await prisma.$executeRawUnsafe(
      `UPDATE "estado_dotacion_log" SET "estado_nuevo" = '${nuevo}' WHERE "estado_nuevo" = '${viejo}'`
    );
    console.log(`   ${viejo} → ${nuevo}: dotacion=${dot} log_ant=${logAnt} log_nue=${logNue}`);
  }

  console.log('4/4 Restaurando default a CL0_DISPONIBLE...');
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "dotacion" ALTER COLUMN "estado" SET DEFAULT 'CL0_DISPONIBLE'`
  );

  console.log('Hecho. Ahora marca la migración como aplicada:');
  console.log('  npx prisma migrate resolve --applied 20260629100000_change_estado_dotacion_to_cl');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
