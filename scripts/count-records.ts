/**
 * @file scripts/count-records.ts
 * @description Script de diagnóstico: imprime el número de filas de cada
 * modelo principal tras el seed. Útil para verificar la carga inicial.
 *
 * Ejecutar con: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/count-records.ts
 */

import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

async function main() {
  const counts = {
    Ubicacion:           await prisma.ubicacion.count(),
    Empresa:             await prisma.empresa.count(),
    TipoEventoCatalogo:  await prisma.tipoEventoCatalogo.count(),
    Puesto:              await prisma.puesto.count(),
    Sintomatologia:      await prisma.sintomatologia.count(),
    UsuarioSistema:      await prisma.usuarioSistema.count(),
    Persona:             await prisma.persona.count(),
    Evento:              await prisma.evento.count(),
    Dotacion:            await prisma.dotacion.count(),
  };

  console.log('\n📊 Conteo de registros tras seed:\n');
  for (const [model, n] of Object.entries(counts)) {
    console.log(`  ${model.padEnd(22)} ${n}`);
  }
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
