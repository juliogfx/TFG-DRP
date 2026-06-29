/**
 * Script puntual: backfill del campo Intervencion.estado tras la
 * migración 20260629071608_add_campos_intervencion_f2x.
 *
 * Reglas:
 *   horaFinal IS NOT NULL                              → CERRADA
 *   horaFinal IS NULL AND horaLlegada IS NOT NULL      → EN_CURSO
 *   horaFinal IS NULL AND horaLlegada IS NULL          → PENDIENTE_DOTACION
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const cerradas = await prisma.$executeRaw`
    UPDATE intervencion
    SET estado = 'CERRADA'
    WHERE hora_final IS NOT NULL
  `;

  const enCurso = await prisma.$executeRaw`
    UPDATE intervencion
    SET estado = 'EN_CURSO'
    WHERE hora_final IS NULL AND hora_llegada IS NOT NULL
  `;

  const pendDot = await prisma.$executeRaw`
    UPDATE intervencion
    SET estado = 'PENDIENTE_DOTACION'
    WHERE hora_final IS NULL AND hora_llegada IS NULL
  `;

  console.log('CERRADA:', cerradas, 'EN_CURSO:', enCurso, 'PENDIENTE_DOTACION:', pendDot);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
