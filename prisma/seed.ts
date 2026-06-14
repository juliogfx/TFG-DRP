/**
 * @file prisma/seed.ts
 * @description Seed de datos de prueba para el entorno de desarrollo del TFG-DRP.
 *
 * Pobla la base de datos con datos realistas basados en el contexto operativo
 * del Estadio Santiago Bernabéu (Real Madrid), incluyendo ubicaciones, empresas,
 * tipos de evento, puestos, sintomatologías, usuarios de prueba, personal
 * sanitario, walkies, material y dos eventos completos con sus dotaciones.
 *
 * Ejecutar con: npx prisma db seed
 * (requiere "prisma.seed" configurado en package.json)
 *
 * Actualizado para schema v4.3.
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
 * 0. TitulacionCatalogo (sin deps — antes de Persona)
 * 1. Ubicaciones, Empresas, TipoEventoCatalogo, Puestos, Sintomatologías (sin deps)
 * 2. UsuarioSistema (depende de Empresa)
 * 3. Personas (independientes)
 * 4. Eventos (dependen de Ubicacion, TipoEventoCatalogo, Empresa)
 * 5. Dotaciones (dependen de Evento)
 * 6. Walkies y Material (sin deps — antes de Eventos)
 */
async function main() {
  console.log('🌱 Iniciando seed TFG-DRP v4.3...');

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
    prisma.empresa.upsert({
      where: { codigo: 'MED' },
      update: {},
      create: {
        nombre: 'Servicios Médicos Externos S.L.',
        codigo: 'MED',
        tipo: TipoEmpresa.FACULTATIVOS,
        telefono: '91 000 00 00',
        email: 'coordinacion@sme.test',
        contacto: 'Coordinación Facultativos',
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
    prisma.tipoEventoCatalogo.upsert({
      where: { codigo: 'COP' },
      update: {},
      create: { nombre: 'Copa del Rey', codigo: 'COP', descripcion: 'Partido de Copa del Rey' },
    }),
    prisma.tipoEventoCatalogo.upsert({
      where: { codigo: 'MAR' },
      update: {},
      create: { nombre: 'Maratón', codigo: 'MAR', descripcion: 'Carrera popular o maratón urbana' },
    }),
    prisma.tipoEventoCatalogo.upsert({
      where: { codigo: 'REL' },
      update: {},
      create: { nombre: 'Acto religioso', codigo: 'REL', descripcion: 'Acto religioso o procesión multitudinaria' },
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
    prisma.puesto.upsert({
      where: { nombre: 'UCO' },
      update: {},
      create: { nombre: 'UCO', descripcion: 'Unidad de Coordinación Operativa — puesto de mando', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'Clínica de campaña' },
      update: {},
      create: { nombre: 'Clínica de campaña', descripcion: 'Puesto médico avanzado con capacidad de tratamiento', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'Banquillo' },
      update: {},
      create: { nombre: 'Banquillo', descripcion: 'Puesto sanitario en banquillo de campo deportivo', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'SVB' },
      update: {},
      create: { nombre: 'SVB', descripcion: 'Soporte Vital Básico — ambulancia ligera', requiereVehiculo: true },
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

  const [usuarioUco] = await Promise.all([
    prisma.usuarioSistema.upsert({
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
    }),
    prisma.usuarioSistema.upsert({
      where: { email: 'apoyo@drp.test' },
      update: {},
      create: {
        email: 'apoyo@drp.test',
        passwordHash,
        nombreCompleto: 'Apoyo Informático Test',
        rol: RolUsuario.APOYO_INFORMATICO,
        empresaId: empresaContratada.id,
        activo: true,
      },
    }),
  ]);
  console.log('✓ Usuarios creados');

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
  const titDUE = await prisma.titulacionCatalogo.upsert({
    where: { nombre: 'DUE / Enfermero/a' },
    update: {},
    create: { nombre: 'DUE / Enfermero/a', orden: 3 },
  });
  const titSocorrista = await prisma.titulacionCatalogo.upsert({
    where: { nombre: 'Socorrista' },
    update: {},
    create: { nombre: 'Socorrista', orden: 4 },
  });
  const titVoluntario = await prisma.titulacionCatalogo.upsert({
    where: { nombre: 'Voluntario básico' },
    update: {},
    create: { nombre: 'Voluntario básico', orden: 5 },
  });
  console.log('✓ Titulaciones creadas:', titTES.nombre, titMedico.nombre, titDUE.nombre, titSocorrista.nombre, titVoluntario.nombre);

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

  const walkieNumeros = [
    'W-01','W-02','W-03','W-04','W-05','W-06',
    'W-07','W-08','W-09','W-10','W-11','W-12',
  ];
  for (const numero of walkieNumeros) {
    await prisma.walkie.upsert({
      where: { numero },
      update: {},
      create: { numero },
    });
  }
  console.log('✓ Walkies creados');

  const materiales = [
    { codigo: 'BOT-B',  nombre: 'Botiquín básico',           tipo: 'CONSUMIBLE',   esCritico: true  },
    { codigo: 'DESA-1', nombre: 'Desfibrilador DESA',         tipo: 'EQUIPO',       esCritico: true  },
    { codigo: 'CAM-1',  nombre: 'Camilla de tijera',          tipo: 'REUTILIZABLE', esCritico: false },
    { codigo: 'OXI-1',  nombre: 'Botella oxígeno 3L',         tipo: 'EQUIPO',       esCritico: true  },
    { codigo: 'TOR-1',  nombre: 'Torniquete CAT',             tipo: 'CONSUMIBLE',   esCritico: true  },
    { codigo: 'SIL-1',  nombre: 'Silla de ruedas plegable',   tipo: 'REUTILIZABLE', esCritico: false },
    { codigo: 'INM-1',  nombre: 'Collarín cervical',          tipo: 'CONSUMIBLE',   esCritico: false },
    { codigo: 'MED-1',  nombre: 'Maletín médico avanzado',    tipo: 'EQUIPO',       esCritico: true  },
  ];
  for (const mat of materiales) {
    await prisma.material.upsert({
      where: { codigo: mat.codigo },
      update: {},
      create: {
        ...mat,
        tipo: mat.tipo as any,
        stockActual: 5,
        stockMinimo: 2,
        activo: true,
      },
    });
  }
  console.log('✓ Material creado');

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
