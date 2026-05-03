-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('UCO', 'COORDINADOR', 'VOLUNTARIO', 'FACULTATIVO', 'ALMACEN', 'ADMIN', 'EMPRESA_CONTRATANTE', 'EMPRESA_FACULTATIVOS');

-- CreateEnum
CREATE TYPE "TipoDotacion" AS ENUM ('AMBULANCIA', 'BOTIQUIN', 'UVI', 'SVB', 'CLINICA', 'AVANZADA', 'BANQUILLO', 'LIMA', 'UCO_UNIT');

-- CreateEnum
CREATE TYPE "EstadoDotacion" AS ENUM ('DISPONIBLE', 'EN_INTERVENCION', 'NO_OPERATIVA');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('VOLUNTARIO', 'FACULTATIVO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('LIGA', 'CHAMPIONS', 'COPA', 'AMISTOSO', 'CONCIERTO', 'EVENTO_CORPORATIVO');

-- CreateEnum
CREATE TYPE "GravedadIntervencion" AS ENUM ('LEVE', 'MODERADA', 'GRAVE', 'CRITICA');

-- CreateEnum
CREATE TYPE "EstadoWalkie" AS ENUM ('DISPONIBLE', 'ASIGNADO', 'AVERIADO', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('CONSUMIBLE', 'REUTILIZABLE', 'MEDICAMENTO', 'EQUIPO');

-- CreateEnum
CREATE TYPE "EstadoRevisionItem" AS ENUM ('OK', 'FALTA', 'DANADO', 'CADUCADO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('STOCK_BAJO', 'CADUCIDAD_PROXIMA', 'MATERIAL_DANADO');

-- CreateTable
CREATE TABLE "ubicacion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "direccion" VARCHAR(300) NOT NULL,
    "cp" VARCHAR(10) NOT NULL,
    "poblacion" VARCHAR(100) NOT NULL,
    "aforo_maximo" INTEGER,
    "observaciones" TEXT,

    CONSTRAINT "ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puesto" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(500),
    "requiere_vehiculo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "puesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sintomatologia" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(500),

    CONSTRAINT "sintomatologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "promotor" VARCHAR(200) NOT NULL,
    "temporada" VARCHAR(20) NOT NULL,
    "ubicacion_id" INTEGER,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_sistema" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "ubicacion_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoEvento" NOT NULL DEFAULT 'LIGA',
    "rival" VARCHAR(200),
    "aforo_previsto" INTEGER,
    "aforo_estimado" INTEGER,
    "contrato_id" INTEGER,
    "temporada" VARCHAR(20),
    "hora_incorporacion_sspp" TIMESTAMP(3),
    "hora_finalizacion_sspp" TIMESTAMP(3),
    "hora_inicio_uco" TIMESTAMP(3),
    "director_medico" VARCHAR(150),
    "promotor" VARCHAR(200),
    "coordinador_uco_id" INTEGER,
    "temperatura_clinica" DECIMAL(4,1),
    "observaciones" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posicion" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "codigo_qr" VARCHAR(100) NOT NULL,
    "puesto_id" INTEGER NOT NULL,
    "sector" VARCHAR(100),
    "capacidad_personas" INTEGER,

    CONSTRAINT "posicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dotacion" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "posicion_id" INTEGER,
    "tipo" "TipoDotacion" NOT NULL,
    "personal_minimo" INTEGER NOT NULL DEFAULT 2,
    "estado" "EstadoDotacion" NOT NULL DEFAULT 'DISPONIBLE',
    "indicativo" VARCHAR(50),
    "num_dues" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona" (
    "id" SERIAL NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(20),
    "tipo" "TipoPersona" NOT NULL,
    "titulacion" VARCHAR(100) NOT NULL,
    "acreditacion" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_personal_dotacion" (
    "id" SERIAL NOT NULL,
    "dotacion_id" INTEGER NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "rol_en_dotacion" VARCHAR(60) NOT NULL,
    "turno_inicio_prev" TIMESTAMP(3),
    "turno_fin_prev" TIMESTAMP(3),
    "asiste" BOOLEAN,
    "turno_inicio_real" TIMESTAMP(3),
    "turno_fin_real" TIMESTAMP(3),
    "observaciones" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignacion_personal_dotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervencion" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "numero_intervencion" INTEGER NOT NULL,
    "hora_aviso" TIMESTAMP(3),
    "hora_llegada" TIMESTAMP(3),
    "hora_final" TIMESTAMP(3),
    "dotacion_activa_id" INTEGER NOT NULL,
    "dotacion_apoyo_id" INTEGER,
    "sintomatologia_id" INTEGER NOT NULL,
    "gravedad" "GravedadIntervencion" NOT NULL DEFAULT 'LEVE',
    "lugar" VARCHAR(100),
    "alta_en_lugar" BOOLEAN NOT NULL DEFAULT false,
    "traslado_clinica" BOOLEAN NOT NULL DEFAULT false,
    "clinica_destino_id" INTEGER,
    "alta_en_clinica" BOOLEAN NOT NULL DEFAULT false,
    "traslado_hospital" BOOLEAN NOT NULL DEFAULT false,
    "hospital_destino" VARCHAR(150),
    "dotacion_traslado_id" INTEGER,
    "usuario_uco_id" INTEGER,
    "observaciones" TEXT,
    "parte" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intervencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walkie" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "estado" "EstadoWalkie" NOT NULL DEFAULT 'DISPONIBLE',
    "observaciones" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walkie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_walkie" (
    "id" SERIAL NOT NULL,
    "walkie_id" INTEGER NOT NULL,
    "dotacion_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_devolucion" TIMESTAMP(3),
    "devuelto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "asignacion_walkie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tipo" "TipoMaterial" NOT NULL,
    "unidad_medida" VARCHAR(30) NOT NULL DEFAULT 'unidades',
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "precio_unitario" DECIMAL(10,2),
    "codigo_almacen" VARCHAR(100),
    "ubicacion_almacen" VARCHAR(100),
    "referencia_base" VARCHAR(50),
    "proveedor" VARCHAR(200),
    "fecha_caducidad" DATE,
    "lote" VARCHAR(100),
    "es_critico" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_material_posicion" (
    "id" SERIAL NOT NULL,
    "posicion_id" INTEGER,
    "material_id" INTEGER NOT NULL,
    "cantidad_esperada" INTEGER NOT NULL,
    "es_obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "puesto_id" INTEGER,

    CONSTRAINT "asignacion_material_posicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_material" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "posicion_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "porcentaje_operatividad" INTEGER NOT NULL DEFAULT 100,
    "observaciones" TEXT,

    CONSTRAINT "revision_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_revision_material" (
    "id" SERIAL NOT NULL,
    "revision_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad_esperada" INTEGER NOT NULL,
    "cantidad_real" INTEGER NOT NULL,
    "estado" "EstadoRevisionItem" NOT NULL,
    "observaciones" VARCHAR(300),

    CONSTRAINT "detalle_revision_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta_material" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "tipo_alerta" "TipoAlerta" NOT NULL,
    "descripcion" VARCHAR(300),
    "fecha_generada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "fecha_resolucion" TIMESTAMP(3),
    "usuario_resuelve_id" INTEGER,

    CONSTRAINT "alerta_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_dotacion_log" (
    "id" SERIAL NOT NULL,
    "dotacion_id" INTEGER NOT NULL,
    "estado_anterior" "EstadoDotacion" NOT NULL,
    "estado_nuevo" "EstadoDotacion" NOT NULL,
    "fecha_hora_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" VARCHAR(300),
    "usuario_id" INTEGER,

    CONSTRAINT "estado_dotacion_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "puesto_nombre_key" ON "puesto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "sintomatologia_tipo_key" ON "sintomatologia"("tipo");

-- CreateIndex
CREATE INDEX "contrato_temporada_idx" ON "contrato"("temporada");

-- CreateIndex
CREATE INDEX "contrato_promotor_idx" ON "contrato"("promotor");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_sistema_email_key" ON "usuario_sistema"("email");

-- CreateIndex
CREATE INDEX "usuario_sistema_rol_idx" ON "usuario_sistema"("rol");

-- CreateIndex
CREATE INDEX "evento_fecha_idx" ON "evento"("fecha");

-- CreateIndex
CREATE INDEX "evento_tipo_idx" ON "evento"("tipo");

-- CreateIndex
CREATE INDEX "evento_ubicacion_id_idx" ON "evento"("ubicacion_id");

-- CreateIndex
CREATE INDEX "evento_contrato_id_idx" ON "evento"("contrato_id");

-- CreateIndex
CREATE INDEX "evento_temporada_idx" ON "evento"("temporada");

-- CreateIndex
CREATE UNIQUE INDEX "posicion_codigo_qr_key" ON "posicion"("codigo_qr");

-- CreateIndex
CREATE INDEX "posicion_evento_id_idx" ON "posicion"("evento_id");

-- CreateIndex
CREATE INDEX "posicion_codigo_qr_idx" ON "posicion"("codigo_qr");

-- CreateIndex
CREATE INDEX "posicion_puesto_id_idx" ON "posicion"("puesto_id");

-- CreateIndex
CREATE UNIQUE INDEX "dotacion_posicion_id_key" ON "dotacion"("posicion_id");

-- CreateIndex
CREATE INDEX "dotacion_evento_id_idx" ON "dotacion"("evento_id");

-- CreateIndex
CREATE INDEX "dotacion_estado_idx" ON "dotacion"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "dotacion_evento_id_codigo_key" ON "dotacion"("evento_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "persona_email_key" ON "persona"("email");

-- CreateIndex
CREATE INDEX "persona_tipo_idx" ON "persona"("tipo");

-- CreateIndex
CREATE INDEX "persona_activo_idx" ON "persona"("activo");

-- CreateIndex
CREATE INDEX "asignacion_personal_dotacion_dotacion_id_idx" ON "asignacion_personal_dotacion"("dotacion_id");

-- CreateIndex
CREATE INDEX "asignacion_personal_dotacion_persona_id_idx" ON "asignacion_personal_dotacion"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_personal_dotacion_dotacion_id_persona_id_key" ON "asignacion_personal_dotacion"("dotacion_id", "persona_id");

-- CreateIndex
CREATE INDEX "intervencion_evento_id_idx" ON "intervencion"("evento_id");

-- CreateIndex
CREATE INDEX "intervencion_dotacion_activa_id_idx" ON "intervencion"("dotacion_activa_id");

-- CreateIndex
CREATE INDEX "intervencion_sintomatologia_id_idx" ON "intervencion"("sintomatologia_id");

-- CreateIndex
CREATE INDEX "intervencion_created_at_idx" ON "intervencion"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "intervencion_evento_id_numero_intervencion_key" ON "intervencion"("evento_id", "numero_intervencion");

-- CreateIndex
CREATE UNIQUE INDEX "walkie_numero_key" ON "walkie"("numero");

-- CreateIndex
CREATE INDEX "asignacion_walkie_dotacion_id_evento_id_idx" ON "asignacion_walkie"("dotacion_id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_walkie_walkie_id_evento_id_key" ON "asignacion_walkie"("walkie_id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_codigo_key" ON "material"("codigo");

-- CreateIndex
CREATE INDEX "material_tipo_idx" ON "material"("tipo");

-- CreateIndex
CREATE INDEX "material_fecha_caducidad_idx" ON "material"("fecha_caducidad");

-- CreateIndex
CREATE INDEX "material_es_critico_idx" ON "material"("es_critico");

-- CreateIndex
CREATE INDEX "asignacion_material_posicion_material_id_idx" ON "asignacion_material_posicion"("material_id");

-- CreateIndex
CREATE INDEX "asignacion_material_posicion_puesto_id_idx" ON "asignacion_material_posicion"("puesto_id");

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_material_posicion_posicion_id_material_id_key" ON "asignacion_material_posicion"("posicion_id", "material_id");

-- CreateIndex
CREATE INDEX "revision_material_evento_id_posicion_id_idx" ON "revision_material"("evento_id", "posicion_id");

-- CreateIndex
CREATE INDEX "revision_material_fecha_hora_idx" ON "revision_material"("fecha_hora");

-- CreateIndex
CREATE INDEX "detalle_revision_material_revision_id_idx" ON "detalle_revision_material"("revision_id");

-- CreateIndex
CREATE INDEX "alerta_material_material_id_resuelta_idx" ON "alerta_material"("material_id", "resuelta");

-- CreateIndex
CREATE INDEX "estado_dotacion_log_dotacion_id_idx" ON "estado_dotacion_log"("dotacion_id");

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_coordinador_uco_id_fkey" FOREIGN KEY ("coordinador_uco_id") REFERENCES "usuario_sistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicion" ADD CONSTRAINT "posicion_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicion" ADD CONSTRAINT "posicion_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "puesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dotacion" ADD CONSTRAINT "dotacion_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dotacion" ADD CONSTRAINT "dotacion_posicion_id_fkey" FOREIGN KEY ("posicion_id") REFERENCES "posicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_personal_dotacion" ADD CONSTRAINT "asignacion_personal_dotacion_dotacion_id_fkey" FOREIGN KEY ("dotacion_id") REFERENCES "dotacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_personal_dotacion" ADD CONSTRAINT "asignacion_personal_dotacion_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_sintomatologia_id_fkey" FOREIGN KEY ("sintomatologia_id") REFERENCES "sintomatologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_dotacion_activa_id_fkey" FOREIGN KEY ("dotacion_activa_id") REFERENCES "dotacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_dotacion_apoyo_id_fkey" FOREIGN KEY ("dotacion_apoyo_id") REFERENCES "dotacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_dotacion_traslado_id_fkey" FOREIGN KEY ("dotacion_traslado_id") REFERENCES "dotacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_clinica_destino_id_fkey" FOREIGN KEY ("clinica_destino_id") REFERENCES "posicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_usuario_uco_id_fkey" FOREIGN KEY ("usuario_uco_id") REFERENCES "usuario_sistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_walkie" ADD CONSTRAINT "asignacion_walkie_walkie_id_fkey" FOREIGN KEY ("walkie_id") REFERENCES "walkie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_walkie" ADD CONSTRAINT "asignacion_walkie_dotacion_id_fkey" FOREIGN KEY ("dotacion_id") REFERENCES "dotacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_walkie" ADD CONSTRAINT "asignacion_walkie_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_material_posicion" ADD CONSTRAINT "asignacion_material_posicion_posicion_id_fkey" FOREIGN KEY ("posicion_id") REFERENCES "posicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_material_posicion" ADD CONSTRAINT "asignacion_material_posicion_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_material_posicion" ADD CONSTRAINT "asignacion_material_posicion_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_material" ADD CONSTRAINT "revision_material_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_material" ADD CONSTRAINT "revision_material_posicion_id_fkey" FOREIGN KEY ("posicion_id") REFERENCES "posicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_material" ADD CONSTRAINT "revision_material_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario_sistema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_revision_material" ADD CONSTRAINT "detalle_revision_material_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "revision_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_revision_material" ADD CONSTRAINT "detalle_revision_material_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_material" ADD CONSTRAINT "alerta_material_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_dotacion_log" ADD CONSTRAINT "estado_dotacion_log_dotacion_id_fkey" FOREIGN KEY ("dotacion_id") REFERENCES "dotacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_dotacion_log" ADD CONSTRAINT "estado_dotacion_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario_sistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
