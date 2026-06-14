/**
 * @file prisma/seed.ts
 * @description Seed de datos de prueba para el entorno de desarrollo del TFG-DRP.
 *
 * Pobla la base de datos con datos realistas basados en el contexto operativo
 * del Estadio Santiago Bernabéu (Real Madrid), incluyendo ubicaciones, empresas,
 * tipos de evento, puestos, sintomatologías, usuarios de prueba, personal
 * sanitario y dos eventos completos con sus dotaciones.
 *
 * Ejecutar con: npx prisma db seed
 * (requiere "prisma.seed" configurado en package.json)
 */

import 'dotenv/config';
import { PrismaClient, TipoEmpresa, RolUsuario, TipoPersona, TipoDotacion, EstadoDotacion } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

/**
 * Función principal del seed. Ejecuta todos los bloques en orden,
 * respetando las dependencias entre tablas (FK constraints).
 *
 * Orden de inserción:
 * 1. Ubicaciones, Empresas, TipoEventoCatalogo, Puestos, Sintomatologías (sin deps)
 * 2. UsuarioSistema (depende de Empresa)
 * 3. Personas (independientes)
 * 4. Eventos (dependen de Ubicacion, TipoEventoCatalogo, Empresa)
 * 5. Dotaciones (dependen de Evento)
 */
async function main() {
  console.log('🌱 Iniciando seed TFG-DRP v4.1...');

  const [bernabeu, metropolitano, wizink] = await Promise.all([
    prisma.ubicacion.upsert({
      where: { codigo: 'BER' },
      update: {},
      create: {
        nombre: 'Estadio Santiago Bernabéu',
        codigo: 'BER',
        direccion: 'Av. de Concha Espina, 1',
        cp: '28036',
        poblacion: 'Madrid',
        aforoMaximo: 81044,
      },
    }),
    prisma.ubicacion.upsert({
      where: { codigo: 'MET' },
      update: {},
      create: {
        nombre: 'Estadio Metropolitano',
        codigo: 'MET',
        direccion: 'Av. de Luis Aragonés, 4',
        cp: '28022',
        poblacion: 'Madrid',
        aforoMaximo: 68456,
      },
    }),
    prisma.ubicacion.upsert({
      where: { codigo: 'PAL' },
      update: {},
      create: {
        nombre: 'WiZink Center',
        codigo: 'PAL',
        direccion: 'Av. de Felipe II, s/n',
        cp: '28009',
        poblacion: 'Madrid',
        aforoMaximo: 17500,
      },
    }),
  ]);
  console.log('✓ Ubicaciones creadas');

  const [empresaContratada, realMadrid] = await Promise.all([
    prisma.empresa.upsert({
      where: { codigo: 'ECE' },
      update: {},
      create: {
        nombre: 'Empresa Contratada Ejemplo',
        codigo: 'ECE',
        tipo: TipoEmpresa.CONTRATADA,
        telefono: '900 22 11 00',
        email: 'contacto@empresa-ejemplo.com',
        contacto: 'Coordinación DRP Madrid',
      },
    }),
    prisma.empresa.upsert({
      where: { codigo: 'RMD' },
      update: {},
      create: {
        nombre: 'Real Madrid C.F.',
        codigo: 'RMD',
        tipo: TipoEmpresa.PROMOTOR,
        telefono: '91 398 43 00',
        email: 'eventos@realmadrid.com',
        contacto: 'Departamento de Eventos',
      },
    }),
  ]);
  console.log('✓ Empresas creadas');

  const [tipoLiga, tipoCha, tipoCon] = await Promise.all([
    prisma.tipoEventoCatalogo.upsert({
      where: { codigo: 'PLA' },
      update: {},
      create: {
        nombre: 'Partido Liga',
        codigo: 'PLA',
        descripcion: 'Partido de LaLiga EA Sports',
      },
    }),
    prisma.tipoEventoCatalogo.upsert({
      where: { codigo: 'CHA' },
      update: {},
      create: {
        nombre: 'Champions League',
        codigo: 'CHA',
        descripcion: 'Partido de UEFA Champions League',
      },
    }),
    prisma.tipoEventoCatalogo.upsert({
      where: { codigo: 'CON' },
      update: {},
      create: {
        nombre: 'Concierto',
        codigo: 'CON',
        descripcion: 'Evento musical o espectáculo',
      },
    }),
  ]);
  console.log('✓ Tipos de evento creados');

  const [puestoBotiquin, puestoUvi, puestoAmb] = await Promise.all([
    prisma.puesto.upsert({
      where: { nombre: 'Botiquín' },
      update: {},
      create: {
        nombre: 'Botiquín',
        descripcion: 'Puesto fijo de atención sanitaria básica',
        requiereVehiculo: false,
      },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'UVI Móvil' },
      update: {},
      create: {
        nombre: 'UVI Móvil',
        descripcion: 'Unidad de Vigilancia Intensiva móvil para emergencias críticas',
        requiereVehiculo: true,
      },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'Ambulancia' },
      update: {},
      create: {
        nombre: 'Ambulancia',
        descripcion: 'Unidad de transporte sanitario urgente',
        requiereVehiculo: true,
      },
    }),
  ]);
  console.log('✓ Puestos creados');

  const sintomatologias = [
    { tipo: 'Traumatismo', descripcion: 'Lesión física por golpe, caída o impacto' },
    { tipo: 'Pérdida de conocimiento', descripcion: 'Síncope o lipotimia' },
    { tipo: 'Dolor torácico', descripcion: 'Dolor en zona pectoral, posible origen cardíaco' },
    { tipo: 'Intoxicación etílica', descripcion: 'Ingesta excesiva de alcohol' },
    { tipo: 'Crisis epiléptica', descripcion: 'Episodio convulsivo de origen neurológico' },
  ];

  for (const s of sintomatologias) {
    await prisma.sintomatologia.upsert({
      where: { tipo: s.tipo },
      update: {},
      create: s,
    });
  }
  console.log('✓ Sintomatologías creadas');

  // -------------------------------------------------------------------------
  // CATÁLOGO DE EQUIPOS DEPORTIVOS
  // Equipos para seleccionar en eventos deportivos en lugar de texto libre.
  // -------------------------------------------------------------------------

  const equipos = [
    // Fútbol - LaLiga
    { codigo: 'RMD', nombre: 'Real Madrid C.F.',      deporte: 'Fútbol - LaLiga' },
    { codigo: 'ATM', nombre: 'Atlético de Madrid',    deporte: 'Fútbol - LaLiga' },
    { codigo: 'FCB', nombre: 'FC Barcelona',          deporte: 'Fútbol - LaLiga' },
    { codigo: 'SEV', nombre: 'Sevilla F.C.',          deporte: 'Fútbol - LaLiga' },
    { codigo: 'VAL', nombre: 'Valencia C.F.',         deporte: 'Fútbol - LaLiga' },
    { codigo: 'BET', nombre: 'Real Betis',            deporte: 'Fútbol - LaLiga' },
    // Fútbol - Champions/Europa
    { codigo: 'BAY', nombre: 'Bayern München',        deporte: 'Fútbol - Europa' },
    { codigo: 'PSG', nombre: 'Paris Saint-Germain',   deporte: 'Fútbol - Europa' },
    { codigo: 'MCI', nombre: 'Manchester City',       deporte: 'Fútbol - Europa' },
    { codigo: 'LIV', nombre: 'Liverpool F.C.',        deporte: 'Fútbol - Europa' },
    { codigo: 'JUV', nombre: 'Juventus F.C.',         deporte: 'Fútbol - Europa' },
    // Fútbol - Selecciones
    { codigo: 'SEF', nombre: 'Selección Española Fútbol', deporte: 'Fútbol - Selecciones' },
    // Baloncesto
    { codigo: 'RMB', nombre: 'Real Madrid Baloncesto', deporte: 'Baloncesto' },
    { codigo: 'BAR', nombre: 'FC Barcelona Bàsquet',  deporte: 'Baloncesto' },
    { codigo: 'UNI', nombre: 'Valencia Basket',       deporte: 'Baloncesto' },
  ];

  for (const eq of equipos) {
    await prisma.equipoCatalogo.upsert({
      where: { codigo: eq.codigo },
      update: {},
      create: { ...eq, activo: true },
    });
  }
  console.log('✓ Equipos deportivos creados');

  const passwordHash = await bcrypt.hash('drp2026test', 10);

  const usuarioUco = await prisma.usuarioSistema.upsert({
    where: { email: 'uco@drp.test' },
    update: {},
    create: {
      email: 'uco@drp.test',
      passwordHash,
      nombreCompleto: 'Usuario UCO Test',
      rol: RolUsuario.UCO,
      empresaId: empresaContratada.id,
      activo: true,
    },
  });
  console.log('✓ Usuario UCO creado');

  const titTES = await prisma.titulacionCatalogo.upsert({
    where: { nombre: 'Técnico en Emergencias Sanitarias' },
    update: {},
    create: { nombre: 'Técnico en Emergencias Sanitarias', orden: 1 },
  });
  const titMedico = await prisma.titulacionCatalogo.upsert({
    where: { nombre: 'Médico' },
    update: {},
    create: { nombre: 'Médico', orden: 2 },
  });

  const personas = [
    {
      email: 'voluntario1@drp.test',
      nombreCompleto: 'Voluntario Uno Test',
      tipo: TipoPersona.VOLUNTARIO,
      titulacionId: titTES.id,
      telefono: '600 000 001',
    },
    {
      email: 'voluntario2@drp.test',
      nombreCompleto: 'Voluntario Dos Test',
      tipo: TipoPersona.VOLUNTARIO,
      titulacionId: titTES.id,
      telefono: '600 000 002',
    },
    {
      email: 'facultativo1@drp.test',
      nombreCompleto: 'Facultativo Uno Test',
      tipo: TipoPersona.FACULTATIVO,
      titulacionId: titMedico.id,
      telefono: '600 000 003',
    },
    {
      email: 'facultativo2@drp.test',
      nombreCompleto: 'Facultativo Dos Test',
      tipo: TipoPersona.FACULTATIVO,
      titulacionId: titMedico.id,
      telefono: '600 000 004',
    },
  ];

  for (const p of personas) {
    await prisma.persona.upsert({
      where: { email: p.email },
      update: { titulacionId: p.titulacionId },
      create: { ...p, activo: true },
    });
  }
  console.log('✓ Personal sanitario creado');

  const eventoBase = {
    ubicacionId: bernabeu.id,
    temporada: '2025-26',
    empresaPromotorId: realMadrid.id,
    empresaContratadaId: empresaContratada.id,
    coordinadorUcoId: usuarioUco.id,
    aforoPrevisto: 81044,
  };

  const evento1 = await prisma.evento.upsert({
    where: { id: 1 },
    update: {},
    create: {
      ...eventoBase,
      nombre: 'Real Madrid vs FC Barcelona',
      fecha: new Date('2026-05-17'),
      tipoEventoId: tipoLiga.id,
      rival: 'FC Barcelona',
    },
  });

  const evento2 = await prisma.evento.upsert({
    where: { id: 2 },
    update: {},
    create: {
      ...eventoBase,
      nombre: 'Real Madrid vs Atlético de Madrid',
      fecha: new Date('2026-05-24'),
      tipoEventoId: tipoCha.id,
      rival: 'Atlético de Madrid',
    },
  });
  console.log('✓ Eventos creados');

  /**
   * Crea las 4 dotaciones estándar para un evento dado.
   * @param eventoId - ID del evento al que pertenecen las dotaciones.
   */
  async function crearDotaciones(eventoId: number) {
    const dotaciones = [
      { codigo: 'B01', tipo: TipoDotacion.BOTIQUIN, personalMinimo: 2 },
      { codigo: 'B02', tipo: TipoDotacion.BOTIQUIN, personalMinimo: 2 },
      { codigo: 'AMB01', tipo: TipoDotacion.AMBULANCIA, personalMinimo: 2 },
      { codigo: 'UVI01', tipo: TipoDotacion.UVI, personalMinimo: 3 },
    ];

    for (const d of dotaciones) {
      await prisma.dotacion.upsert({
        where: { eventoId_codigo: { eventoId, codigo: d.codigo } },
        update: {},
        create: {
          eventoId,
          ...d,
          estado: EstadoDotacion.DISPONIBLE,
          posicionId: null,
        },
      });
    }
  }

  await crearDotaciones(evento1.id);
  await crearDotaciones(evento2.id);
  console.log('✓ Dotaciones creadas');

  console.log('\n✅ Seed completado. Datos de prueba listos en Supabase.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
