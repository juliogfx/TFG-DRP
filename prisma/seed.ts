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
 * Actualizado para schema v4.6.
 */

import 'dotenv/config';
import { PrismaClient, TipoEmpresa, RolUsuario, TipoPersona, TipoDotacion, EstadoDotacion, EstadoEvento } from '@prisma/client';
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
  console.log('🌱 Iniciando seed TFG-DRP v4.6...');

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
    prisma.puesto.upsert({
      where: { nombre: 'DELTA' },
      update: {},
      create: { nombre: 'DELTA', descripcion: 'Dotación con enfermero/DUE', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'MIKE' },
      update: {},
      create: { nombre: 'MIKE', descripcion: 'Dotación tipo UVI sin traslado hospitalario', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'LIMA' },
      update: {},
      create: { nombre: 'LIMA', descripcion: 'Logística de apoyo — recaderos', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'PAPA' },
      update: {},
      create: { nombre: 'PAPA', descripcion: 'Psicosocial', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'Z95' },
      update: {},
      create: { nombre: 'Z95', descripcion: 'Coordinadores', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'ZULU' },
      update: {},
      create: { nombre: 'ZULU', descripcion: 'Dotación asistencial', requiereVehiculo: false },
    }),
    prisma.puesto.upsert({
      where: { nombre: 'Camilla de campo' },
      update: {},
      create: { nombre: 'Camilla de campo', descripcion: 'Camilla fija en el campo — 4 componentes', requiereVehiculo: false },
    }),
  ]);
  console.log('✓ Puestos creados');

  await prisma.sintomatologia.deleteMany({
    where: {
      tipo: {
        in: [
          'Traumatismo',
          'Pérdida de conocimiento',
          'Dolor torácico',
          'Intoxicación etílica',
          'Crisis epiléptica',
        ],
      },
    },
  });

  const sintomatologias = [
    { tipo: 'HERIDAS',                descripcion: 'Heridas y hemorragias' },
    { tipo: 'TRAUMATISMOS',           descripcion: 'Traumatismos y fracturas' },
    { tipo: 'INTOXICACIONES',         descripcion: 'Intoxicaciones y envenenamientos' },
    { tipo: 'PATOLOGIA CARDIACA',     descripcion: 'Patología cardíaca' },
    { tipo: 'PATOLOGIA RESPIRATORIA', descripcion: 'Patología respiratoria' },
    { tipo: 'PATOLOGIA DIGESTIVA',    descripcion: 'Patología digestiva' },
    { tipo: 'PERDIDA DE CONSCIENCIA', descripcion: 'Pérdida de consciencia o síncope' },
    { tipo: 'QUEMADURAS',             descripcion: 'Quemaduras térmicas o químicas' },
    { tipo: 'MALESTAR GENERAL',       descripcion: 'Malestar general inespecífico' },
    { tipo: 'CEFALEAS',               descripcion: 'Cefaleas y migrañas' },
    { tipo: 'FIEBRE',                 descripcion: 'Fiebre y procesos febriles' },
    { tipo: 'GRIPE',                  descripcion: 'Síndrome gripal' },
    { tipo: 'MAREOS',                 descripcion: 'Mareos y vértigos' },
    { tipo: 'VARIOS',                 descripcion: 'Varios / Sin clasificar' },
    { tipo: 'OTROS',                  descripcion: 'Otros procesos' },
    { tipo: 'SIMULACRO',              descripcion: 'Intervención de simulacro' },
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

  const passwordHash = await bcrypt.hash(
    process.env.SEED_PASSWORD ?? 'dev-only-cambiar-en-produccion',
    10
  );

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
    update: { estado: EstadoEvento.ACTIVO },
    create: {
      ...eventoBase,
      nombre: 'Real Madrid vs FC Barcelona',
      fecha: new Date('2026-05-17'),
      tipoEventoId: tipoLiga.id,
      rival: 'FC Barcelona',
      estado: EstadoEvento.ACTIVO,
    },
  });

  const evento2 = await prisma.evento.upsert({
    where: { id: 2 },
    update: { estado: EstadoEvento.ACTIVO },
    create: {
      ...eventoBase,
      nombre: 'Real Madrid vs Atlético de Madrid',
      fecha: new Date('2026-05-24'),
      tipoEventoId: tipoCha.id,
      rival: 'Atlético de Madrid',
      estado: EstadoEvento.ACTIVO,
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
          estado: EstadoDotacion.CL0_DISPONIBLE,
          posicionId: null,
        },
      });
    }
  }

  await crearDotaciones(evento1.id);
  await crearDotaciones(evento2.id);
  console.log('✓ Dotaciones creadas');

  /**
   * Opción B — Genera las plazas estándar de cada dotación según su tipo.
   * El número de plazas depende del tipo (UVI=4, AMB=4, LIMA/PAPA=2, etc.).
   * El rol requerido se pre-asigna en posiciones canónicas (conductor en 1,
   * técnico en 2, médico en 3, enfermero en 4) cuando aplica. Idempotente:
   * usa upsert por (dotacionId, numero).
   */
  async function crearPlazasDotaciones(eventoId: number) {
    const dotaciones = await prisma.dotacion.findMany({
      where: { eventoId, deletedAt: null },
      select: { id: true, codigo: true, tipo: true },
    });

    function plantillaPorTipo(tipo: TipoDotacion): { numPlazas: number; roles: Record<number, string | null> } {
      switch (tipo) {
        case TipoDotacion.UVI:
          return { numPlazas: 4, roles: { 1: 'CONDUCTOR', 2: 'TECNICO', 3: 'MEDICO', 4: 'ENFERMERO' } };
        case TipoDotacion.AMBULANCIA:
        case TipoDotacion.SVB:
          return { numPlazas: 4, roles: { 1: 'CONDUCTOR', 2: 'TECNICO', 3: null, 4: null } };
        case TipoDotacion.AVANZADA:
        case TipoDotacion.CLINICA:
          return { numPlazas: 4, roles: { 1: null, 2: null, 3: 'MEDICO', 4: 'ENFERMERO' } };
        case TipoDotacion.BANQUILLO:
          return { numPlazas: 4, roles: {} };
        case TipoDotacion.LIMA:
        case TipoDotacion.UCO_UNIT:
          return { numPlazas: 2, roles: {} };
        case TipoDotacion.BOTIQUIN:
        default:
          return { numPlazas: 4, roles: {} };
      }
    }

    for (const d of dotaciones) {
      const { numPlazas, roles } = plantillaPorTipo(d.tipo);
      for (let numero = 1; numero <= numPlazas; numero++) {
        await prisma.plazaDotacion.upsert({
          where: { dotacionId_numero: { dotacionId: d.id, numero } },
          update: {},
          create: {
            dotacionId: d.id,
            numero,
            nombre: `${d.codigo}-${numero}`,
            rolRequerido: roles[numero] ?? null,
          },
        });
      }
    }
  }

  await crearPlazasDotaciones(evento1.id);
  await crearPlazasDotaciones(evento2.id);
  console.log('✓ Plazas de dotación creadas');

  /**
   * Crea las 53 posiciones del Bernabéu (F1.2) para un evento dado.
   * 25 en PISTA + 28 en GRADA. Todas con componentesMinimo=2 y
   * componentesMaximo=4. El puesto se deduce del nombre de la posición
   * (clínica/UVI/SVB/banquillo/etc.) — ver mapearPuestoPorNombre abajo.
   * Las posiciones sin patrón conocido caen a ZULU (dotación asistencial).
   */
  async function crearPosicionesEvento(eventoId: number) {
    const puestos = await prisma.puesto.findMany({ select: { id: true, nombre: true } });
    const puestoPorNombre = new Map(puestos.map((p) => [p.nombre, p.id]));
    function idDe(nombre: string): number | null {
      return puestoPorNombre.get(nombre) ?? null;
    }
    function mapearPuestoPorNombre(nombrePos: string): number | null {
      if (nombrePos.startsWith('CL.'))                       return idDe('Clínica de campaña');
      if (nombrePos.startsWith('UVI'))                       return idDe('UVI Móvil');
      if (nombrePos.startsWith('SVB'))                       return idDe('SVB');
      if (nombrePos === 'CAMNOR' || nombrePos === 'CAMSUR')  return idDe('Camilla de campo');
      if (nombrePos === 'BANQ.')                             return idDe('Banquillo');
      if (nombrePos === 'UCO' || nombrePos === 'UCO1')       return idDe('UCO');
      if (nombrePos.startsWith('DELTA'))                     return idDe('DELTA');
      if (nombrePos.startsWith('MIKE'))                      return idDe('MIKE');
      if (nombrePos.startsWith('LIMA'))                      return idDe('LIMA');
      if (nombrePos.startsWith('PAPA'))                      return idDe('PAPA');
      if (nombrePos === 'Z95-1' || nombrePos === 'Z95-1G')   return idDe('Z95');
      // Resto: ZULU (Z0.x, Z200, Z217, Z218, Z30, Z50, Z443, Z501, Z520,
      // Z529, Z710, Z.20, Z.40, etc.)
      return idDe('ZULU');
    }

    const fallback = idDe('Botiquín') ?? puestos[0]?.id ?? null;
    if (!fallback) {
      console.warn('  ⚠ No hay puestos en el catálogo — saltando posiciones');
      return;
    }

    const PISTA = [
      'BANQ.', 'CAMNOR', 'CAMSUR', 'UVI3', 'UVI4',
      'Z0.1', 'Z0.2', 'Z0.3', 'Z0.4', 'Z0.5', 'Z0.6', 'Z0.7', 'Z0.8', 'Z0.9',
      'Z0.10', 'Z0.11', 'Z0.12', 'DELTA2', 'MIKE2',
      'Z.20', 'Z.40', 'LIMA2', 'Z95-1', 'UCO', 'PAPA2',
    ];
    const GRADA = [
      'UVI1', 'UVI2', 'Z200', 'Z217', 'Z218', 'SVB1Z318', 'SVB2Z317',
      'Z443', 'Z501', 'Z520', 'Z529', 'Z710',
      'CL.AV.', 'CL.P18', 'CL.P19', 'CL.T.A', 'CL.T.C', 'CL.T.D',
      'CL.NV6', 'CL.PALCO', 'DELTA1', 'MIKE1', 'Z30', 'Z50',
      'LIMA1', 'UCO1', 'Z95-1G', 'PAPA1',
    ];

    const filas = [
      ...PISTA.map((nombre) => ({ nombre, zona: 'PISTA' as const })),
      ...GRADA.map((nombre) => ({ nombre, zona: 'GRADA' as const })),
    ];

    for (const f of filas) {
      const codigoQr = `${eventoId}-${f.nombre}`;
      const puestoId = mapearPuestoPorNombre(f.nombre) ?? fallback;
      await prisma.posicion.upsert({
        where: { codigoQr },
        update: { puestoId, zona: f.zona, componentesMinimo: 2, componentesMaximo: 4 },
        create: {
          eventoId,
          nombre: f.nombre,
          codigoQr,
          puestoId,
          zona: f.zona,
          componentesMinimo: 2,
          componentesMaximo: 4,
        },
      });
    }
  }

  await crearPosicionesEvento(evento1.id);
  await crearPosicionesEvento(evento2.id);
  console.log('✓ Posiciones creadas (53 por evento)');

  /**
   * F1.3 — Plantilla reutilizable "partido de fútbol en el Bernabéu".
   * Es la única plantilla canónica del MVP — el resto de eventos se crean
   * a medida. La plantilla recopila las 53 posiciones estándar; al
   * aplicarse a un evento concreto, se clonan como Posicion + Dotacion.
   *
   * Idempotencia: upsert por nombre. Las PlantillaPosicion no tienen
   * unique constraint, así que las borramos y recreamos para evitar
   * duplicados al re-ejecutar el seed.
   */
  async function crearPlantillaFutbolBernabeu() {
    const puestos = await prisma.puesto.findMany({ select: { id: true, nombre: true } });
    const puestoPorNombre = new Map(puestos.map((p) => [p.nombre, p.id]));
    const idDe = (n: string) => puestoPorNombre.get(n) ?? null;
    function puestoParaPosicion(nombrePos: string): number | null {
      if (nombrePos.startsWith('CL.'))                       return idDe('Clínica de campaña');
      if (nombrePos.startsWith('UVI'))                       return idDe('UVI Móvil');
      if (nombrePos.startsWith('SVB'))                       return idDe('SVB');
      if (nombrePos === 'CAMNOR' || nombrePos === 'CAMSUR')  return idDe('Camilla de campo');
      if (nombrePos === 'BANQ.')                             return idDe('Banquillo');
      if (nombrePos === 'UCO' || nombrePos === 'UCO1')       return idDe('UCO');
      if (nombrePos.startsWith('DELTA'))                     return idDe('DELTA');
      if (nombrePos.startsWith('MIKE'))                      return idDe('MIKE');
      if (nombrePos.startsWith('LIMA'))                      return idDe('LIMA');
      if (nombrePos.startsWith('PAPA'))                      return idDe('PAPA');
      if (nombrePos === 'Z95-1' || nombrePos === 'Z95-1G')   return idDe('Z95');
      return idDe('ZULU');
    }
    const fallback = idDe('Botiquín') ?? puestos[0]?.id ?? null;
    if (!fallback) {
      console.warn('  ⚠ No hay puestos en el catálogo — saltando plantilla');
      return;
    }

    const PISTA = [
      'BANQ.', 'CAMNOR', 'CAMSUR', 'UVI3', 'UVI4',
      'Z0.1', 'Z0.2', 'Z0.3', 'Z0.4', 'Z0.5', 'Z0.6', 'Z0.7', 'Z0.8', 'Z0.9',
      'Z0.10', 'Z0.11', 'Z0.12', 'DELTA2', 'MIKE2',
      'Z.20', 'Z.40', 'LIMA2', 'Z95-1', 'UCO', 'PAPA2',
    ];
    const GRADA = [
      'UVI1', 'UVI2', 'Z200', 'Z217', 'Z218', 'SVB1Z318', 'SVB2Z317',
      'Z443', 'Z501', 'Z520', 'Z529', 'Z710',
      'CL.AV.', 'CL.P18', 'CL.P19', 'CL.T.A', 'CL.T.C', 'CL.T.D',
      'CL.NV6', 'CL.PALCO', 'DELTA1', 'MIKE1', 'Z30', 'Z50',
      'LIMA1', 'UCO1', 'Z95-1G', 'PAPA1',
    ];
    const todas = [
      ...PISTA.map((n) => ({ nombre: n, sector: 'Pista'  as const })),
      ...GRADA.map((n) => ({ nombre: n, sector: 'Grada'  as const })),
    ];

    const plantilla = await prisma.plantillaEvento.upsert({
      where: { nombre: 'BER-PLA-RMD-FUTBOL' },
      update: {
        empresaId: empresaContratada.id,
        tipoEventoId: tipoLiga.id,
        ubicacionId: bernabeu.id,
        descripcion: 'Plantilla estándar partido de fútbol Bernabéu',
        activa: true,
      },
      create: {
        nombre: 'BER-PLA-RMD-FUTBOL',
        codigoLoc: 'BER',
        codigoEvt: 'PLA',
        codigoCtr: 'RMD',
        textoLibre: 'FUTBOL',
        empresaId: empresaContratada.id,
        tipoEventoId: tipoLiga.id,
        ubicacionId: bernabeu.id,
        descripcion: 'Plantilla estándar partido de fútbol Bernabéu',
        activa: true,
      },
    });

    // Borrar y recrear PlantillaPosicion (no hay unique para hacer upsert).
    await prisma.plantillaPosicion.deleteMany({ where: { plantillaId: plantilla.id } });
    await prisma.plantillaPosicion.createMany({
      data: todas.map((p) => ({
        plantillaId: plantilla.id,
        puestoId: puestoParaPosicion(p.nombre) ?? fallback,
        nombreSugerido: p.nombre,
        personalMinimo: 2,
        sector: p.sector,
      })),
    });

    // Opción B — Dimensionamiento real de la plantilla (datos del Excel).
    // Una fila por posición/dotación. Filas no listadas se rellenan con NO+0.
    type DimRow = {
      nombre: string;
      incluida?: boolean;
      med?: number; due?: number; cond?: number; tec?: number; socTec?: number; otr?: number;
      vehiculo?: boolean; camillas?: number; silla?: boolean;
      bBasico?: number; bDue?: number; bOxMed?: number;
      oxig?: number; ampul?: number; morfico?: number;
      monitor?: boolean; pPantalla?: number; portatil?: number;
      observ?: string | null;
    };
    const dimReales: DimRow[] = [
      // PISTA — operativas
      { nombre: 'BANQ.',  incluida: true, med: 1, due: 1, bDue: 1, bOxMed: 1, oxig: 1, ampul: 1, morfico: 1, monitor: true, portatil: 1 },
      { nombre: 'CAMNOR', incluida: true, socTec: 4, camillas: 1, bBasico: 1, portatil: 2 },
      { nombre: 'CAMSUR', incluida: true, socTec: 4, camillas: 1, bBasico: 1, portatil: 2 },
      { nombre: 'Z95-1',  incluida: true, cond: 1, portatil: 1 },
      // GRADA — clínicas y SVBs operativas, resto NO
      { nombre: 'SVB1Z318', incluida: true, cond: 1, tec: 1, vehiculo: true, bBasico: 1 },
      { nombre: 'SVB2Z317', incluida: true, cond: 1, tec: 1, vehiculo: true, bBasico: 1 },
      { nombre: 'CL.AV.',  incluida: true, med: 1, due: 1, bDue: 1, bOxMed: 1, oxig: 1, monitor: true, portatil: 1 },
      { nombre: 'CL.P18',  incluida: true, med: 1, due: 1, bDue: 1, bOxMed: 1 },
      { nombre: 'CL.P19',  incluida: true, med: 1, due: 1, bDue: 1, bOxMed: 1 },
      { nombre: 'CL.T.A',  incluida: true, med: 1, due: 1, bDue: 1 },
      { nombre: 'CL.T.C',  incluida: true, med: 1, due: 1, bDue: 1 },
      { nombre: 'CL.T.D',  incluida: true, med: 1, due: 1, bDue: 1 },
      { nombre: 'CL.NV6',  incluida: true, med: 1, due: 1, bDue: 1 },
      { nombre: 'CL.PALCO', incluida: true, med: 1, due: 1, bDue: 1 },
      { nombre: 'Z95-1G',  incluida: true, cond: 1, portatil: 1 },
    ];
    const dimPorNombre = new Map<string, DimRow>(dimReales.map((r) => [r.nombre, r]));
    const todasFilasDim: DimRow[] = todas.map((p) => {
      const real = dimPorNombre.get(p.nombre);
      if (real) return real;
      return { nombre: p.nombre, incluida: false };
    });

    await prisma.plantillaDimensionamiento.deleteMany({ where: { plantillaId: plantilla.id } });
    await prisma.plantillaDimensionamiento.createMany({
      data: todasFilasDim.map((f) => ({
        plantillaId: plantilla.id,
        nombre: f.nombre,
        incluida: f.incluida ?? false,
        med: f.med ?? 0, due: f.due ?? 0, cond: f.cond ?? 0, tec: f.tec ?? 0,
        socTec: f.socTec ?? 0, otr: f.otr ?? 0,
        vehiculo: f.vehiculo ?? false, camillas: f.camillas ?? 0, silla: f.silla ?? false,
        bBasico: f.bBasico ?? 0, bDue: f.bDue ?? 0, bOxMed: f.bOxMed ?? 0,
        oxig: f.oxig ?? 0, ampul: f.ampul ?? 0, morfico: f.morfico ?? 0,
        monitor: f.monitor ?? false, pPantalla: f.pPantalla ?? 0, portatil: f.portatil ?? 0,
        observ: f.observ ?? null,
      })),
    });
  }

  await crearPlantillaFutbolBernabeu();
  console.log('✓ Plantilla BER-PLA-RMD-FUTBOL creada (53 posiciones + dimensionamiento)');

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
