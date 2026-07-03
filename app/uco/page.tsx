/**
 * @file app/uco/page.tsx
 * @description Dashboard UCO — vista operativa en tiempo real del evento DRP.
 *
 * Pantalla principal del Coordinador de Operaciones durante el evento.
 * Muestra el estado de todas las dotaciones, contadores clicables y
 * tabla de intervenciones EN CURSO, con actualización automática cada 30s.
 *
 * Tarjetas de dotación: el UCO elige nº de columnas (2/4/6/8) desde el
 * separador "Estado de dotaciones". La preferencia se guarda en localStorage.
 *   2 y 4 columnas → tarjeta con toda la información (personal, teléfonos, footer)
 *   6 y 8 columnas → tarjeta reducida (código + tipo + badge + ratio)
 *
 * Para gestión completa de intervenciones navegar a /uco/intervenciones.
 */

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EstadoUCO, DotacionEstado } from '@/types/uco';
import type { EventoListItem } from '@/types/evento';
import type {
  IntervencionListItem,
  CreateIntervencionInput,
  UpdateIntervencionInput,
  GravedadIntervencion,
  EstadoIntervencion,
  ResolucionIntervencion,
  SintomatologiaItem,
} from '@/types/intervencion';
import DateTimeInput from '@/app/components/DateTimeInput';

type ModoTarjeta = 'normal' | 'compacto';

const COLUMN_OPTIONS = [2, 4, 6, 8] as const;
type NumColumnas = typeof COLUMN_OPTIONS[number];

const LOCALSTORAGE_KEY_COLUMNAS = 'uco-dashboard-columnas';

const TIPO_LABELS: Record<string, string> = {
  AMBULANCIA: 'Ambulancia', BOTIQUIN: 'Botiquín', UVI: 'UVI Móvil',
  SVB: 'SVB', CLINICA: 'Clínica', AVANZADA: 'Avanzada',
  BANQUILLO: 'Banquillo', LIMA: 'LIMA', UCO_UNIT: 'UCO',
};

const CARD_STYLES: Record<string, string> = {
  CL0_DISPONIBLE:           'border-green-200 bg-green-50',
  CL1_EN_CAMINO:            'border-blue-200 bg-blue-50',
  CL2_EN_INTERVENCION:      'border-red-300 bg-red-50',
  CL3_NO_DISPONIBLE:        'border-gray-200 bg-gray-50',
  CL5_SOLICITUD_AYUDA:      'border-orange-300 bg-orange-50',
  CL6_SITUACION_CONFLICTIVA:'border-purple-300 bg-purple-50',
};

const ESTADO_LABELS: Record<string, string> = {
  CL0_DISPONIBLE:           'Disponible',
  CL1_EN_CAMINO:            'En camino',
  CL2_EN_INTERVENCION:      'En intervención',
  CL3_NO_DISPONIBLE:        'No disponible',
  CL5_SOLICITUD_AYUDA:      'Solicitud ayuda',
  CL6_SITUACION_CONFLICTIVA:'Sit. conflictiva',
};

const ESTADO_CLAVE: Record<string, string> = {
  CL0_DISPONIBLE:           'CL0',
  CL1_EN_CAMINO:            'CL1',
  CL2_EN_INTERVENCION:      'CL2',
  CL3_NO_DISPONIBLE:        'CL3',
  CL5_SOLICITUD_AYUDA:      'CL5',
  CL6_SITUACION_CONFLICTIVA:'CL6',
};

const PILL_STYLES: Record<string, string> = {
  CL0_DISPONIBLE:           'bg-green-100 text-green-700',
  CL1_EN_CAMINO:            'bg-blue-100 text-blue-700',
  CL2_EN_INTERVENCION:      'bg-red-100 text-red-700',
  CL3_NO_DISPONIBLE:        'bg-gray-100 text-gray-600',
  CL5_SOLICITUD_AYUDA:      'bg-orange-100 text-orange-700',
  CL6_SITUACION_CONFLICTIVA:'bg-purple-100 text-purple-700',
};

const ESTADO_EVENTO_COLOR: Record<string, string> = {
  PENDIENTE: 'text-amber-700 font-semibold',
  ACTIVO: 'text-green-700 font-semibold',
  FINALIZADO: 'text-slate-600 font-semibold',
};

const GRAVEDAD_STYLES: Record<string, string> = {
  LEVE:     'bg-green-100 text-green-700',
  MODERADA: 'bg-yellow-100 text-yellow-700',
  GRAVE:    'bg-orange-100 text-orange-700',
  CRITICA:  'bg-red-100 text-red-700',
};

const GRID_BY_COLS: Record<NumColumnas, string> = {
  2: 'grid grid-cols-2 gap-4',
  4: 'grid grid-cols-4 gap-3',
  6: 'grid grid-cols-6 gap-3',
  8: 'grid grid-cols-8 gap-2',
};

const FORM_INTERVENCION_INICIAL = {
  dotacionActivaId: '' as number | '',
  sintomatologiaId: '' as number | '',
  gravedad: 'LEVE' as GravedadIntervencion,
  uco: 'UCO1',
  sector: '',
  lugar: '',
  horaAviso: null as string | null,
  dotacionApoyoId: '' as number | '',
  resolucion: null as ResolucionIntervencion | null,
  hospitalDestino: '',
  clinicaDestinoId: null as number | null,
};

const RESOLUCION_LABEL: Record<ResolucionIntervencion, string> = {
  ALTA_EN_LUGAR:         'Alta en el lugar',
  TRASLADO_CLINICA:      'Traslado a clínica',
  ALTA_EN_CLINICA:       'Alta en clínica',
  TRASLADO_HOSPITALARIO: 'Traslado hospitalario',
};

const POLLING_INTERVAL_MS = 30_000;

function calcularModo(numColumnas: NumColumnas): ModoTarjeta {
  return numColumnas <= 4 ? 'normal' : 'compacto';
}

interface ClinicaOpcion { id: number; nombre: string; sector: string | null }

/**
 * Selector de "Clínica de destino" (F2.4). Aparece bajo el selector de
 * resolución cuando la resolución es TRASLADO_CLINICA o ALTA_EN_CLINICA.
 * Si el evento tiene clínicas (posiciones con "CL." o "CLINICA" en el
 * nombre) ofrece un select; si no, cae a input de texto libre guardado en
 * hospitalDestino (mapeo dictado por el spec a falta de campo dedicado).
 */
function SelectorClinicaDestino({
  clinicas,
  clinicaDestinoId,
  onSelectClinica,
  textoFallback,
  onChangeTexto,
}: {
  clinicas: ClinicaOpcion[];
  clinicaDestinoId: number | null;
  onSelectClinica: (id: number | null) => void;
  textoFallback: string;
  onChangeTexto: (v: string) => void;
}) {
  if (clinicas.length === 0) {
    return (
      <input
        type="text"
        placeholder="Clínica de destino (texto libre)"
        value={textoFallback}
        onChange={(e) => onChangeTexto(e.target.value)}
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-2"
      />
    );
  }
  return (
    <select
      value={clinicaDestinoId ?? ''}
      onChange={(e) => onSelectClinica(e.target.value ? Number(e.target.value) : null)}
      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-2"
    >
      <option value="">Selecciona clínica de destino...</option>
      {clinicas.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}{c.sector ? ` · ${c.sector}` : ''}
        </option>
      ))}
    </select>
  );
}

/**
 * Aviso F2.6: cuando el UCO selecciona en un formulario una dotación que
 * NO está en CL0_DISPONIBLE, se muestra un mensaje informativo bajo el
 * selector. Si la dotación es la misma que ya estaba asignada (caso del
 * modal de editar al abrir) no se muestra: no estamos reasignando.
 * No bloquea — el UCO puede asignarla igualmente; backend la pondrá en CL1.
 */
function AvisoDotacionNoDisponible({
  dotacionId,
  dotaciones,
  dotacionAnteriorId,
}: {
  dotacionId: number | null;
  dotaciones: Array<{ id: number; codigo: string; estado: string }>;
  dotacionAnteriorId?: number | null;
}) {
  if (!dotacionId) return null;
  if (dotacionAnteriorId != null && dotacionId === dotacionAnteriorId) return null;
  const dot = dotaciones.find((d) => d.id === dotacionId);
  if (!dot || dot.estado === 'CL0_DISPONIBLE') return null;
  const clave = ESTADO_CLAVE[dot.estado] ?? '';
  const label = ESTADO_LABELS[dot.estado] ?? dot.estado;
  return (
    <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
      ⚠ La dotación <span className="font-mono font-semibold">{dot.codigo}</span> está en{' '}
      <span className="font-medium">{clave} {label}</span> — asignarla igualmente la pondrá en{' '}
      <span className="font-medium">CL1 En camino</span>.
    </p>
  );
}

/**
 * Tarjeta de dotación con tamaño y contenido adaptativos al modo.
 * Si la dotación está EN_INTERVENCION, la tarjeta entera es clicable
 * hacia /uco/intervenciones con filtro de dotación activa.
 * Si no, muestra un enlace pequeño "Ver historial →".
 */
function TarjetaDotacion({
  dotacion,
  eventoId,
  modo,
  intervencionActiva,
  onLiberar,
}: {
  dotacion: DotacionEstado;
  eventoId: number;
  modo: ModoTarjeta;
  intervencionActiva: { id: number; numeroIntervencion: number } | null;
  /** Callback para liberar la dotación (CL2 → CL0). Solo se muestra el
   *  botón si el padre pasa el callback. */
  onLiberar?: (dotacionId: number) => void;
}) {
  const router = useRouter();
  const personalCubierto = dotacion.numeroPersonasAsignadas >= dotacion.personalMinimo;
  const enIntervencion = dotacion.estado === 'CL2_EN_INTERVENCION';
  const enCamino = dotacion.estado === 'CL1_EN_CAMINO';
  const puedeLiberar = !!onLiberar && (enIntervencion || enCamino);

  function clickLiberar(e: React.MouseEvent) {
    e.stopPropagation();
    onLiberar?.(dotacion.id);
  }
  // Responsable de la dotación: persona con rolEnDotacion que contenga
  // "responsable"; si no hay tal rol formal aún, fallback al primer asignado.
  const responsable =
    dotacion.personal.find((p) => /responsable/i.test(p.rolEnDotacion)) ??
    dotacion.personal[0] ??
    null;
  // Segundo responsable: rol que contenga "segundo", o el primero disponible
  // que no sea el responsable principal. null si la dotación tiene ≤1 persona.
  const responsable2 =
    dotacion.personal.find((p) => /segundo/i.test(p.rolEnDotacion) && p !== responsable) ??
    dotacion.personal.find((p) => p !== responsable) ??
    null;

  // Click en el cuerpo: SIEMPRE intervenciones filtradas por esa dotación, sin
  // filtro de estado. Para la intervención activa concreta se usa el enlace
  // del pie con stopPropagation.
  function navegarBody() {
    router.push(`/uco/intervenciones?eventoId=${eventoId}&dotacionId=${dotacion.id}`);
  }

  function navegarPieActiva(e: React.MouseEvent) {
    e.stopPropagation();
    if (intervencionActiva) {
      router.push(`/uco/intervenciones?eventoId=${eventoId}&abrirIntervencion=${intervencionActiva.id}`);
    } else {
      router.push(`/uco/intervenciones?eventoId=${eventoId}&dotacionId=${dotacion.id}&filtro=activa`);
    }
  }

  function navegarPieHistorial(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/uco/intervenciones?eventoId=${eventoId}&dotacionId=${dotacion.id}`);
  }

  const pillClase = PILL_STYLES[dotacion.estado] ?? 'bg-slate-100 text-slate-600';
  const pillTexto = `${ESTADO_CLAVE[dotacion.estado] ?? ''} ${ESTADO_LABELS[dotacion.estado] ?? dotacion.estado}`.trim();
  const tituloHover = `${dotacion.codigo} — ${pillTexto}`;

  const botonLiberar = puedeLiberar ? (
    <button
      onClick={clickLiberar}
      title="Liberar dotación (CL0 Disponible)"
      className="bg-green-100 hover:bg-green-200 text-green-700 font-medium text-[10px] px-2 py-0.5 rounded-md transition-colors whitespace-nowrap"
    >
      ↩ Liberar
    </button>
  ) : null;

  // COMPACTO — versión reducida para 6/8 columnas: código + tipo + badge + ratio
  // (sin lista de personas ni teléfonos, no caben). Mantenemos el botón Liberar
  // porque es una acción operativa, no información.
  if (modo === 'compacto') {
    return (
      <div
        onClick={navegarBody}
        className={`rounded-lg border-2 ${CARD_STYLES[dotacion.estado]} p-3 cursor-pointer hover:ring-2 ${enIntervencion ? 'hover:ring-red-300' : 'hover:ring-slate-300'}`}
        title={tituloHover}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-mono font-bold text-slate-900">{dotacion.codigo}</span>
          <span className={`text-xs font-semibold ${personalCubierto ? 'text-green-700' : 'text-red-600'}`}>
            👤 {dotacion.numeroPersonasAsignadas}/{dotacion.personalMinimo}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-1">{TIPO_LABELS[dotacion.tipo] ?? dotacion.tipo}</p>
        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${pillClase}`}>
          {pillTexto}
        </span>
        {botonLiberar && <div className="mt-2">{botonLiberar}</div>}
      </div>
    );
  }

  // NORMAL — versión completa para 2/4 columnas: todo el detalle operativo.
  // Personal completo (sin truncar), rol de cada persona, teléfono para
  // responsables 1 y 2, footer con enlace a intervención/historial.
  return (
    <div
      onClick={navegarBody}
      className={`rounded-lg border-2 ${CARD_STYLES[dotacion.estado]} p-3 cursor-pointer hover:ring-2 ${enIntervencion ? 'hover:ring-red-300' : 'hover:ring-slate-300'}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-mono font-bold text-slate-900">{dotacion.codigo}</span>
          {dotacion.indicativo && (
            <span className="ml-1.5 text-xs text-slate-500 font-mono">{dotacion.indicativo}</span>
          )}
          <p className="text-xs text-slate-500 mt-0.5">{TIPO_LABELS[dotacion.tipo] ?? dotacion.tipo}</p>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pillClase}`}>
          {pillTexto}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs mb-1">
        <span className={`font-semibold ${personalCubierto ? 'text-green-700' : 'text-red-600'}`}>
          👤 {dotacion.numeroPersonasAsignadas}/{dotacion.personalMinimo}
        </span>
      </div>
      {dotacion.personal.length > 0 && (
        <div className="border-t border-slate-200 pt-1 mt-1 space-y-0.5">
          {dotacion.personal.map((p) => (
            <div key={p.id}>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-xs text-slate-700 truncate" title={p.nombreCompleto}>
                  {p.nombreCompleto}
                </span>
                {p.rolEnDotacion && (
                  <span className="text-[10px] text-slate-400 truncate">· {p.rolEnDotacion}</span>
                )}
              </div>
              {(p === responsable || p === responsable2) && p.telefono && (
                <div className="text-[10px] text-slate-400">📞 {p.telefono}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {enIntervencion && intervencionActiva ? (
        <button onClick={navegarPieActiva} className="block w-full text-left text-xs text-red-700 mt-2 font-medium hover:underline">
          Ver intervención activa (#{intervencionActiva.numeroIntervencion}) →
        </button>
      ) : (
        <button onClick={navegarPieHistorial} className="block w-full text-left text-xs text-slate-400 mt-2 hover:underline">
          Ver historial →
        </button>
      )}
      {botonLiberar && <div className="mt-2">{botonLiberar}</div>}
    </div>
  );
}

const ESTADO_INTERV_STYLES: Record<EstadoIntervencion, string> = {
  EN_CURSO:           'bg-blue-100 text-blue-700',
  PENDIENTE_DOTACION: 'bg-orange-100 text-orange-700',
  CERRADA:            'bg-slate-100 text-slate-600',
};

const ESTADO_INTERV_LABEL: Record<EstadoIntervencion, string> = {
  EN_CURSO:           'EN CURSO',
  PENDIENTE_DOTACION: 'PEND. DOT.',
  CERRADA:            'CERRADA',
};

function TablaIntervenciones({
  intervenciones,
  estadoDotacionPorId,
  onRowClick,
  onLlegada,
  onLlegadaApoyo,
}: {
  intervenciones: IntervencionListItem[];
  /** Mapa dotacionId → estado actual de la dotación, para decidir si mostrar
   *  el botón "Llegada" (solo si la dotación activa está en CL1_EN_CAMINO). */
  estadoDotacionPorId: Map<number, string>;
  onRowClick?: (i: IntervencionListItem) => void;
  onLlegada?: (i: IntervencionListItem) => void;
  /** Confirma llegada de la dotación de apoyo (F2.4). */
  onLlegadaApoyo?: (i: IntervencionListItem) => void;
}) {
  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[400px] rounded-lg border border-slate-200">
      <table className="w-full table-fixed text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <tr>
            <th className="w-[5%]  text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Nº</th>
            <th className="w-[10%] text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Dotación</th>
            <th className="w-[14%] text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Sintomatología</th>
            <th className="w-[11%] text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Estado</th>
            <th className="w-[9%]  text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Gravedad</th>
            <th className="w-[6%]  text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Aviso</th>
            <th className="w-[12%] text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Llegada</th>
            <th className="w-[15%] text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Apoyo</th>
            <th className="w-[18%] text-left px-3 py-2 font-medium text-slate-600 bg-slate-50">Resolución</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {intervenciones.map((i) => {
            const sufijoDestino =
              i.resolucion === 'TRASLADO_HOSPITALARIO' && i.hospitalDestino ? i.hospitalDestino :
              (i.resolucion === 'TRASLADO_CLINICA' || i.resolucion === 'ALTA_EN_CLINICA')
                ? (i.clinicaDestino?.nombre ?? i.hospitalDestino ?? '')
              : '';
            const resolucion = i.resolucion
              ? (sufijoDestino ? `${RESOLUCION_LABEL[i.resolucion]} · ${sufijoDestino}` : RESOLUCION_LABEL[i.resolucion])
              : '—';
            const sintomatologia = i.sintomatologia?.tipo ?? '—';
            const apoyoCodigos = [i.dotacionApoyo?.codigo, i.dotacionTraslado?.codigo].filter(Boolean).join(', ') || '—';
            const estadoDot = i.dotacionActiva ? estadoDotacionPorId.get(i.dotacionActiva.id) : undefined;
            const puedeMarcarLlegada =
              !!onLlegada &&
              i.estado === 'EN_CURSO' &&
              !!i.dotacionActiva &&
              estadoDot === 'CL1_EN_CAMINO' &&
              !i.horaLlegada;
            const estadoApoyo = i.dotacionApoyo ? estadoDotacionPorId.get(i.dotacionApoyo.id) : undefined;
            const puedeMarcarLlegadaApoyo =
              !!onLlegadaApoyo &&
              !!i.dotacionApoyo &&
              estadoApoyo === 'CL1_EN_CAMINO';
            return (
              <tr
                key={i.id}
                onClick={() => onRowClick?.(i)}
                className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                <td className="px-3 py-2 font-mono font-bold text-slate-900 truncate">#{i.numeroIntervencion}</td>
                <td className="px-3 py-2 font-mono text-slate-700 truncate">{i.dotacionActiva?.codigo ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600 truncate" title={sintomatologia}>{sintomatologia}</td>
                <td className="px-3 py-2 truncate">
                  <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${ESTADO_INTERV_STYLES[i.estado]}`}>
                    {ESTADO_INTERV_LABEL[i.estado]}
                  </span>
                </td>
                <td className="px-3 py-2 truncate">
                  <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${GRAVEDAD_STYLES[i.gravedad]}`}>
                    {i.gravedad}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500 font-mono truncate">
                  {i.horaAviso
                    ? new Date(i.horaAviso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
                <td className="px-3 py-2 text-slate-500 font-mono truncate">
                  {i.horaLlegada
                    ? new Date(i.horaLlegada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : puedeMarcarLlegada ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onLlegada?.(i); }}
                        title="Confirmar llegada al lugar"
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium text-[10px] px-2 py-0.5 rounded-md transition-colors whitespace-nowrap"
                      >
                        📍 Llegada
                      </button>
                    ) : '—'}
                </td>
                <td className="px-3 py-2 truncate" title={apoyoCodigos}>
                  <span className="font-mono text-slate-600">{apoyoCodigos}</span>
                  {puedeMarcarLlegadaApoyo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onLlegadaApoyo?.(i); }}
                      title="Confirmar llegada de la dotación de apoyo"
                      className="ml-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium text-[10px] px-1.5 py-0.5 rounded-md transition-colors whitespace-nowrap"
                    >
                      📍 Apoyo
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500 truncate" title={resolucion}>{resolucion}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface CeldaContador {
  etiqueta: string;
  valor: number;
  color: string;
  onClick: () => void;
}

function BloqueContadores({ titulo, celdas }: { titulo: string; celdas: CeldaContador[] }) {
  return (
    <div className="rounded-[10px] border border-slate-200/60 bg-white">
      <div className="text-[11px] uppercase tracking-wider text-slate-600 text-center py-1.5 border-b border-slate-200/60">
        {titulo}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${celdas.length}, 1fr)` }}>
        {celdas.map((c, i) => (
          <button
            key={c.etiqueta}
            onClick={c.onClick}
            className={`px-2 py-[10px] text-center transition hover:bg-slate-50 ${i > 0 ? 'border-l border-slate-200/60' : ''}`}
          >
            <p className={`text-[24px] font-semibold leading-tight ${c.color}`}>{c.valor}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{c.etiqueta}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function UCOContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventoIdParam = searchParams.get('eventoId');
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<number | null>(
    eventoIdParam ? Number(eventoIdParam) : null
  );
  const [estadoUCO, setEstadoUCO] = useState<EstadoUCO | null>(null);
  const [intervenciones, setIntervenciones] = useState<IntervencionListItem[]>([]);
  const [sintomatologias, setSintomatologias] = useState<SintomatologiaItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModalIntervencion, setShowModalIntervencion] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errorIntervencion, setErrorIntervencion] = useState<string | null>(null);
  const [formIntervencion, setFormIntervencion] = useState(FORM_INTERVENCION_INICIAL);

  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  // Filtro por estado de evento (afecta a /api/eventos). Default ACTIVO.
  const [filtroEstadoEvento, setFiltroEstadoEvento] = useState<'TODOS' | 'PENDIENTE' | 'ACTIVO' | 'FINALIZADO'>('ACTIVO');
  // Filtro por UCO operativa (TODOS por defecto: el coordinador ve ambos UCOs).
  // Solo afecta a la tabla de intervenciones; las dotaciones se ven todas.
  const [filtroUco, setFiltroUco] = useState<'TODOS' | 'UCO1' | 'UCO2'>('TODOS');

  const [modalEditar, setModalEditar] = useState<IntervencionListItem | null>(null);
  const [formEditar, setFormEditar] = useState<UpdateIntervencionInput>({});
  const [guardando, setGuardando] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  // Indicador discreto: el polling acaba de fallar. Se borra en cuanto un refresco
  // vuelve a tener éxito. No reemplaza al error de carga inicial — el polling NO
  // debe pintar el banner rojo, solo loguear y marcar este flag.
  const [sinConexion, setSinConexion] = useState(false);

  // Nº de columnas del grid de dotaciones (2/4/6/8). El default es 4 y se
  // rehidrata desde localStorage en el effect de más abajo — no en el lazy
  // initializer del useState porque el server no tiene window.
  const [numColumnas, setNumColumnas] = useState<NumColumnas>(4);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALSTORAGE_KEY_COLUMNAS);
      const n = saved !== null ? parseInt(saved, 10) : NaN;
      if ((COLUMN_OPTIONS as readonly number[]).includes(n)) {
        setNumColumnas(n as NumColumnas);
      }
    } catch {
      // localStorage no disponible (Safari private, iframe restringido) — ignorar
    }
  }, []);
  function seleccionarColumnas(n: NumColumnas) {
    setNumColumnas(n);
    try {
      window.localStorage.setItem(LOCALSTORAGE_KEY_COLUMNAS, String(n));
    } catch {
      // ignorar
    }
  }

  const fetchEstado = useCallback(async (esPolling = false) => {
    if (!eventoSeleccionado) return;
    if (esPolling) {
      setActualizando(true);
    } else {
      setCargando(true);
      setError(null);
    }
    try {
      const [resEstado, resInterv] = await Promise.all([
        fetch(`/api/uco/estado?eventoId=${eventoSeleccionado}`),
        // Dashboard solo opera con intervenciones activas (horaFinal null).
        // Las cerradas las consulta el usuario en /uco/intervenciones.
        fetch(`/api/intervenciones?eventoId=${eventoSeleccionado}&abierta=true`),
      ]);
      if (!resEstado.ok) { const json = await resEstado.json(); throw new Error(json.error ?? `Error ${resEstado.status}`); }
      const jsonEstado = await resEstado.json();
      const jsonInterv = await resInterv.json();
      setEstadoUCO(jsonEstado.data);
      setIntervenciones(jsonInterv.data ?? []);
      setSinConexion(false);
      setError(null);
    } catch (e) {
      if (esPolling) {
        // Polling fallido: mantener datos en pantalla, no pintar banner rojo.
        // Solo log + flag para indicador discreto.
        console.warn('[UCO polling] refresco automático falló:', e);
        setSinConexion(true);
      } else {
        setError(e instanceof Error ? e.message : 'Error al cargar el estado');
        setSinConexion(true);
      }
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [eventoSeleccionado]);

  useEffect(() => {
    async function cargarSintomatologias() {
      try {
        const resSint = await fetch('/api/sintomatologias');
        const jsonSint = await resSint.json();
        setSintomatologias(jsonSint.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar sintomatologías');
      }
    }
    cargarSintomatologias();
  }, []);

  useEffect(() => {
    async function cargarEventos() {
      try {
        const url = filtroEstadoEvento === 'TODOS'
          ? '/api/eventos'
          : `/api/eventos?estado=${filtroEstadoEvento}`;
        const resEventos = await fetch(url);
        if (!resEventos.ok) throw new Error(`Error ${resEventos.status}`);
        const jsonEventos = await resEventos.json();
        setEventos(jsonEventos.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar eventos');
      }
    }
    cargarEventos();
  }, [filtroEstadoEvento]);

  useEffect(() => {
    if (!eventoSeleccionado) return;
    fetchEstado(false);
    const intervalo = setInterval(() => fetchEstado(true), POLLING_INTERVAL_MS);
    return () => clearInterval(intervalo);
  }, [eventoSeleccionado, fetchEstado]);

  async function handleRegistrarIntervencion() {
    setErrorIntervencion(null);
    if (!formIntervencion.sintomatologiaId) return setErrorIntervencion('Selecciona la sintomatología.');
    if (!eventoSeleccionado) return;
    setRegistrando(true);
    try {
      // Si el coordinador asigna la dotación al registrar, la intervención
      // arranca EN_CURSO y el backend pone la dotación en CL1_EN_CAMINO.
      // Sin dotación, queda en PENDIENTE_DOTACION (estado lo calcula el
      // backend). horaLlegada NO se pre-rellena: la confirma después el UCO.
      const dotActivaId = formIntervencion.dotacionActivaId ? Number(formIntervencion.dotacionActivaId) : null;
      const esHospital = formIntervencion.resolucion === 'TRASLADO_HOSPITALARIO';
      const esClinica = formIntervencion.resolucion === 'TRASLADO_CLINICA' || formIntervencion.resolucion === 'ALTA_EN_CLINICA';
      const body: CreateIntervencionInput = {
        eventoId: eventoSeleccionado,
        dotacionActivaId: dotActivaId,
        sintomatologiaId: Number(formIntervencion.sintomatologiaId),
        gravedad: formIntervencion.gravedad,
        uco: formIntervencion.uco,
        sector: formIntervencion.sector.trim() || null,
        lugar: formIntervencion.lugar.trim() || null,
        horaAviso: formIntervencion.horaAviso,
        dotacionApoyoId: formIntervencion.dotacionApoyoId ? Number(formIntervencion.dotacionApoyoId) : undefined,
        resolucion: formIntervencion.resolucion,
        // hospitalDestino se reutiliza también para clínica como texto libre
        // cuando no hay clinicaDestinoId — mapeo dictado por el spec F2.4.
        hospitalDestino: (esHospital || (esClinica && !formIntervencion.clinicaDestinoId))
          ? (formIntervencion.hospitalDestino || null)
          : null,
        clinicaDestinoId: esClinica ? formIntervencion.clinicaDestinoId : null,
      };
      const res = await fetch('/api/intervenciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      // El backend deja la dotación en CL1_EN_CAMINO. La llegada la
      // confirma después el UCO con "Marcar llegada" (endpoint /llegada).
      await fetchEstado(true);
      setShowModalIntervencion(false);
      setFormIntervencion(FORM_INTERVENCION_INICIAL);
    } catch (e) {
      setErrorIntervencion(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setRegistrando(false);
    }
  }

  // F2.1 — Confirmar llegada al lugar:
  // marca horaLlegada y pone la dotación activa en CL2_EN_INTERVENCION.
  // Optimismo UI: actualizamos local antes del fetchEstado para evitar parpadeo.
  async function handleMarcarLlegada(i: IntervencionListItem) {
    try {
      const res = await fetch(`/api/intervenciones/${i.id}/llegada`, { method: 'PUT' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setIntervenciones((prev) => prev.map((x) => x.id === json.data.id ? json.data : x));
      if (i.dotacionActiva?.id) {
        const dotId = i.dotacionActiva.id;
        setEstadoUCO((prev) => prev ? {
          ...prev,
          dotaciones: prev.dotaciones.map((d) =>
            d.id === dotId ? { ...d, estado: 'CL2_EN_INTERVENCION' as const } : d
          ),
        } : prev);
      }
      await fetchEstado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar llegada');
    }
  }

  // F2.4 — Confirmar llegada de la dotación de apoyo:
  // pone la dotación de apoyo en CL2_EN_INTERVENCION. No registra hora
  // (el schema no la tiene) y no toca el estado de la intervención.
  async function handleMarcarLlegadaApoyo(i: IntervencionListItem) {
    if (!i.dotacionApoyo) return;
    try {
      const res = await fetch(`/api/intervenciones/${i.id}/llegada-apoyo`, { method: 'PUT' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setIntervenciones((prev) => prev.map((x) => x.id === json.data.id ? json.data : x));
      const apoyoId = i.dotacionApoyo.id;
      setEstadoUCO((prev) => prev ? {
        ...prev,
        dotaciones: prev.dotaciones.map((d) =>
          d.id === apoyoId ? { ...d, estado: 'CL2_EN_INTERVENCION' as const } : d
        ),
      } : prev);
      await fetchEstado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar llegada de apoyo');
    }
  }

  // F2.1 — Liberar dotación: la dotación vuelve a CL0_DISPONIBLE.
  // NO cierra la intervención asociada — son estados independientes.
  async function handleLiberarDotacion(dotacionId: number) {
    try {
      const res = await fetch(`/api/dotaciones/${dotacionId}/liberar`, { method: 'PUT' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setEstadoUCO((prev) => prev ? {
        ...prev,
        dotaciones: prev.dotaciones.map((d) =>
          d.id === dotacionId ? { ...d, estado: 'CL0_DISPONIBLE' as const } : d
        ),
      } : prev);
      await fetchEstado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al liberar dotación');
    }
  }

  async function handleGuardarEdicion() {
    if (!modalEditar) return;
    setErrorEditar(null);

    // Para cerrar (horaFinal) se exige parte + resolución.
    if (formEditar.horaFinal) {
      if (!formEditar.parte || formEditar.parte.trim() === '') {
        return setErrorEditar('Para registrar la hora final hay que seleccionar el parte (dotación que rellena el parte).');
      }
      if (!formEditar.resolucion) {
        return setErrorEditar('Para registrar la hora final hay que indicar la resolución.');
      }
    }

    setGuardando(true);
    try {
      const res = await fetch(
        `/api/intervenciones/${modalEditar.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formEditar),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(
        json.error ?? `Error ${res.status}`
      );
      setIntervenciones((prev) =>
        prev.map((i) => i.id === json.data.id ? json.data : i)
      );
      setModalEditar(null);
    } catch (e) {
      setErrorEditar(
        e instanceof Error ? e.message : 'Error al guardar'
      );
    } finally {
      setGuardando(false);
    }
  }

  const intervencionesFiltradasPorUco = filtroUco === 'TODOS'
    ? intervenciones
    : intervenciones.filter((i) => i.uco === filtroUco);
  const intervencionesAbiertas = intervencionesFiltradasPorUco.filter((i) => i.abierta);
  // Mapa dotacionId → intervención activa para mostrar #N en el footer de la tarjeta.
  const intervencionActivaPorDotacion = new Map<number, IntervencionListItem>();
  intervencionesAbiertas.forEach((i) => {
    if (i.dotacionActiva?.id) {
      intervencionActivaPorDotacion.set(i.dotacionActiva.id, i);
    }
  });
  // Mapa dotacionId → estado actual de la dotación, usado por la tabla para
  // decidir si mostrar el botón "Llegada" en la fila.
  const estadoDotacionPorId = new Map<number, string>();
  estadoUCO?.dotaciones.forEach((d) => estadoDotacionPorId.set(d.id, d.estado));

  // Clínicas del evento para el selector de "Clínica de destino" (F2.4).
  // Extraídas de las posiciones de las dotaciones cuyo nombre contiene
  // "CL." o "CLINICA"/"CLÍNICA"; dedupe por id de posición.
  const clinicasDelEvento: ClinicaOpcion[] = Array.from(
    new Map(
      (estadoUCO?.dotaciones ?? [])
        .map((d) => d.posicion)
        .filter((p): p is { id: number; nombre: string; sector: string | null } => p != null)
        .filter((p) => {
          const u = p.nombre.toUpperCase();
          return u.includes('CL.') || u.includes('CLINICA') || u.includes('CLÍNICA');
        })
        .map((p) => [p.id, p] as const)
    ).values()
  );

  const eventosFiltrados = eventos.filter((ev) => {
    if (busquedaEvento && !ev.nombre.toLowerCase().includes(busquedaEvento.toLowerCase())) return false;
    if (filtroFechaDesde && ev.fecha < filtroFechaDesde) return false;
    if (filtroFechaHasta && ev.fecha > filtroFechaHasta) return false;
    return true;
  });
  const ultimaActualizacion = estadoUCO
    ? new Date(estadoUCO.actualizadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  const numDotaciones = estadoUCO?.dotaciones.length ?? 0;
  const modoTarjeta: ModoTarjeta = calcularModo(numColumnas);

  function urlIntervenciones(filtro?: string) {
    const params = new URLSearchParams();
    if (eventoSeleccionado) params.set('eventoId', String(eventoSeleccionado));
    if (filtro) params.set('filtro', filtro);
    return `/uco/intervenciones?${params.toString()}`;
  }

  function urlDotaciones(estadoDot?: string) {
    const params = new URLSearchParams();
    if (eventoSeleccionado) params.set('eventoId', String(eventoSeleccionado));
    if (estadoDot) params.set('estadoDot', estadoDot);
    return `/dotaciones?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard UCO</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Vista operativa en tiempo real · Refresco cada {POLLING_INTERVAL_MS / 1000}s
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEstado(false)}
              disabled={!eventoSeleccionado || cargando || actualizando}
              title="Recargar estado del evento"
              className="px-3 py-2 rounded-md border border-slate-300 text-slate-600 text-sm hover:border-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando || actualizando ? 'Recargando…' : '↻ Recargar'}
            </button>
            <button
              onClick={() => setFiltrosAbiertos(v => !v)}
              title={filtrosAbiertos ? 'Ocultar filtros' : 'Buscar evento'}
              className={`p-2 rounded-md border transition-colors ${
                filtrosAbiertos
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700'
              }`}
            >
              🔍
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sinConexion ? 'bg-amber-400' : 'bg-green-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sinConexion ? 'bg-amber-500' : 'bg-green-500'}`} />
            </span>
            {sinConexion ? (
              <span className="text-xs text-amber-700 font-medium" title="El último refresco automático falló. Mostrando los últimos datos disponibles.">
                ⚠ Sin conexión — datos no actualizados
              </span>
            ) : actualizando ? (
              <span className="text-xs text-blue-600 font-medium animate-pulse">↻ Actualizando...</span>
            ) : ultimaActualizacion ? (
              <span className="text-xs text-slate-400">Actualizado a las {ultimaActualizacion}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-6">
        {!eventoSeleccionado && (
          <p className="text-sm text-slate-400 mb-2">Ningún evento seleccionado</p>
        )}

        {filtrosAbiertos && (
          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-end gap-4">
              <div className="w-[150px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Estado evento</label>
                <select
                  value={filtroEstadoEvento}
                  onChange={(e) => setFiltroEstadoEvento(e.target.value as typeof filtroEstadoEvento)}
                  className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="FINALIZADO">Finalizado</option>
                </select>
              </div>
              <input
                type="text"
                value={busquedaEvento}
                onChange={(e) => setBusquedaEvento(e.target.value)}
                placeholder="Buscar evento por nombre..."
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={eventoSeleccionado ?? ''}
                onChange={(e) => {
                  const nuevoEvento = e.target.value ? Number(e.target.value) : null;
                  setEventoSeleccionado(nuevoEvento);
                  setBusquedaEvento('');
                  if (!nuevoEvento) {
                    setEstadoUCO(null);
                    setIntervenciones([]);
                  }
                  if (nuevoEvento) setFiltrosAbiertos(false);
                }}
                className="w-[250px] border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un evento...</option>
                {eventosFiltrados.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre} — {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setBusquedaEvento('');
                  setFiltroFechaDesde('');
                  setFiltroFechaHasta('');
                  setFiltroEstadoEvento('ACTIVO');
                  setEventoSeleccionado(null);
                  setEstadoUCO(null);
                  setIntervenciones([]);
                  setFiltrosAbiertos(false);
                }}
                className="self-end text-xs text-blue-600 hover:text-blue-800 font-medium pb-1.5"
              >
                Limpiar
              </button>
              {eventos.length > 0 && (
                <span className="self-end text-xs text-slate-400 pb-1.5">
                  {eventosFiltrados.length} de {eventos.length} eventos
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {cargando && <div className="text-center py-12 text-slate-500">Cargando estado del evento...</div>}

      {!cargando && estadoUCO && (
        <>
          {/* Fila evento: nombre izq, fecha · recinto · estado a la derecha */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-200">
            <span className="text-lg font-semibold text-slate-900 truncate">{estadoUCO.nombreEvento}</span>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500 font-medium">UCO:</label>
                <select
                  value={filtroUco}
                  onChange={(e) => setFiltroUco(e.target.value as typeof filtroUco)}
                  title="Filtra las intervenciones por UCO operativa. Las dotaciones no se filtran."
                  className="border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">TODOS</option>
                  <option value="UCO1">UCO1</option>
                  <option value="UCO2">UCO2</option>
                </select>
              </div>
              <span className="text-sm text-slate-600">
                📅 {new Date(estadoUCO.fechaEvento + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })} · {estadoUCO.ubicacionEvento} ·{' '}
                <span className={ESTADO_EVENTO_COLOR[estadoUCO.estadoEvento] ?? 'text-slate-600'}>
                  {estadoUCO.estadoEvento}
                </span>
              </span>
            </div>
          </div>

          {/* Bloque dual de contadores (DOTACIONES 4fr · INTERVENCIONES 5fr para equilibrar visualmente) */}
          <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: '4fr 5fr' }}>
            <BloqueContadores
              titulo="DOTACIONES"
              celdas={[
                { etiqueta: 'Total',           valor: estadoUCO.resumen.total,         color: 'text-slate-800', onClick: () => router.push(urlDotaciones()) },
                { etiqueta: 'CL0 Disponibles', valor: estadoUCO.resumen.disponibles,   color: 'text-green-700', onClick: () => router.push(urlDotaciones('CL0_DISPONIBLE')) },
                { etiqueta: 'CL1 En camino',   valor: estadoUCO.resumen.enCamino,       color: 'text-blue-700',  onClick: () => router.push(urlDotaciones('CL1_EN_CAMINO')) },
                { etiqueta: 'CL2 En interv.',  valor: estadoUCO.resumen.enIntervencion, color: 'text-red-700',   onClick: () => router.push(urlDotaciones('CL2_EN_INTERVENCION')) },
                { etiqueta: 'CL3 No oper.',    valor: estadoUCO.resumen.noOperativas,   color: 'text-slate-500', onClick: () => router.push(urlDotaciones('CL3_NO_DISPONIBLE')) },
              ]}
            />
            <BloqueContadores
              titulo="INTERVENCIONES"
              celdas={[
                { etiqueta: 'Total',           valor: estadoUCO.contadores.totalIntervenciones, color: 'text-slate-800',   onClick: () => router.push(urlIntervenciones()) },
                { etiqueta: 'En curso',        valor: intervencionesAbiertas.length,            color: 'text-blue-700',    onClick: () => router.push(urlIntervenciones('activa')) },
                { etiqueta: 'Altas en lugar',  valor: estadoUCO.contadores.altasEnLugar,        color: 'text-green-700',   onClick: () => router.push(urlIntervenciones('alta')) },
                { etiqueta: 'Altas en clínica',valor: estadoUCO.contadores.altasEnClinica,      color: 'text-emerald-700', onClick: () => router.push(urlIntervenciones('alta-clinica')) },
                { etiqueta: 'Trasl. clínica',  valor: estadoUCO.contadores.trasladosClinica,    color: 'text-orange-700',  onClick: () => router.push(urlIntervenciones('clinica')) },
                { etiqueta: 'Trasl. hospital', valor: estadoUCO.contadores.trasladosHospital,   color: 'text-red-700',     onClick: () => router.push(urlIntervenciones('hospital')) },
              ]}
            />
          </div>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Intervenciones en curso</h2>
              <div className="flex gap-3 items-center">
                <Link
                  href={urlIntervenciones()}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver todas →
                </Link>
                <button
                  onClick={() => setShowModalIntervencion(true)}
                  disabled={!eventoSeleccionado}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  + Nueva intervención
                </button>
              </div>
            </div>

            {intervencionesAbiertas.length > 0 ? (
              <TablaIntervenciones
                intervenciones={intervencionesAbiertas}
                estadoDotacionPorId={estadoDotacionPorId}
                onLlegada={handleMarcarLlegada}
                onLlegadaApoyo={handleMarcarLlegadaApoyo}
                onRowClick={(i) => {
                  setFormEditar({
                    dotacionActivaId: i.dotacionActiva?.id ?? null,
                    sintomatologiaId: i.sintomatologia?.id,
                    gravedad: i.gravedad,
                    uco: i.uco,
                    sector: i.sector,
                    lugar: i.lugar,
                    resolucion: i.resolucion,
                    parte: i.parte,
                    horaAviso: i.horaAviso,
                    horaLlegada: i.horaLlegada,
                    horaFinal: i.horaFinal,
                    dotacionApoyoId: i.dotacionApoyo?.id ?? null,
                    hospitalDestino: i.hospitalDestino,
                    clinicaDestinoId: i.clinicaDestino?.id ?? null,
                  });
                  setModalEditar(i);
                  setErrorEditar(null);
                }}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                Sin intervenciones activas en este momento.
              </p>
            )}
          </div>

          <div className="mb-3 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Estado de dotaciones ({numDotaciones})
            </span>
            <div className="flex-1 border-t border-slate-300" />
            <div className="flex items-center gap-1 whitespace-nowrap" role="group" aria-label="Columnas del grid de dotaciones">
              {COLUMN_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => seleccionarColumnas(n)}
                  aria-pressed={numColumnas === n}
                  title={`Mostrar ${n} dotaciones por fila`}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                    numColumnas === n
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {n} col
                </button>
              ))}
            </div>
          </div>
              {estadoUCO.dotaciones.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No hay dotaciones activas para este evento.</div>
              ) : (
                <div className={GRID_BY_COLS[numColumnas]}>
                  {estadoUCO.dotaciones.map((dotacion) => {
                    const i = intervencionActivaPorDotacion.get(dotacion.id);
                    return (
                    <TarjetaDotacion
                      key={dotacion.id}
                      dotacion={dotacion}
                      eventoId={eventoSeleccionado!}
                      modo={modoTarjeta}
                      intervencionActiva={i ? { id: i.id, numeroIntervencion: i.numeroIntervencion } : null}
                      onLiberar={handleLiberarDotacion}
                    />
                    );
                  })}
                </div>
              )}
        </>
      )}

      {showModalIntervencion && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModalIntervencion(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nueva intervención</h2>

            {errorIntervencion && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                {errorIntervencion}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">UCO *</label>
                  <select
                    value={formIntervencion.uco}
                    onChange={(e) => setFormIntervencion((p) => ({ ...p, uco: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="UCO1">UCO1</option>
                    <option value="UCO2">UCO2</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                  <input
                    type="text"
                    value={formIntervencion.sector}
                    onChange={(e) => setFormIntervencion((p) => ({ ...p, sector: e.target.value }))}
                    placeholder="Ej: Sector A, Gol Sur, Acceso Norte..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lugar</label>
                <input
                  type="text"
                  value={formIntervencion.lugar}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, lugar: e.target.value }))}
                  placeholder="Ej: Puerta 7, Fila 3 Asiento 12..."
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación activada</label>
                <select
                  value={formIntervencion.dotacionActivaId}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, dotacionActivaId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Sin asignar (Pendiente dotación)</option>
                  {estadoUCO?.dotaciones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}
                    </option>
                  ))}
                </select>
                <AvisoDotacionNoDisponible
                  dotacionId={formIntervencion.dotacionActivaId === '' ? null : Number(formIntervencion.dotacionActivaId)}
                  dotaciones={estadoUCO?.dotaciones ?? []}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sintomatología *</label>
                <select
                  value={formIntervencion.sintomatologiaId}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, sintomatologiaId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar sintomatología...</option>
                  {sintomatologias.map((s) => (
                    <option key={s.id} value={s.id}>{s.tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gravedad *</label>
                <div className="flex gap-2">
                  {(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'] as GravedadIntervencion[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormIntervencion((p) => ({ ...p, gravedad: g }))}
                      className={`flex-1 text-xs py-1.5 rounded-md font-medium border transition-colors
                        ${formIntervencion.gravedad === g
                          ? GRAVEDAD_STYLES[g] + ' border-transparent'
                          : 'border-slate-300 text-slate-600'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <DateTimeInput
                label="Hora de aviso"
                value={formIntervencion.horaAviso}
                onChange={(v) => setFormIntervencion((p) => ({ ...p, horaAviso: v }))}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación de apoyo</label>
                <select
                  value={formIntervencion.dotacionApoyoId}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, dotacionApoyoId: Number(e.target.value) || '' }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Sin apoyo</option>
                  {estadoUCO?.dotaciones
                    .filter((d) => d.id !== Number(formIntervencion.dotacionActivaId))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}
                      </option>
                    ))}
                </select>
                <AvisoDotacionNoDisponible
                  dotacionId={formIntervencion.dotacionApoyoId === '' ? null : Number(formIntervencion.dotacionApoyoId)}
                  dotaciones={estadoUCO?.dotaciones ?? []}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resolución</label>
                <select
                  value={formIntervencion.resolucion ?? ''}
                  onChange={(e) => setFormIntervencion((p) => ({ ...p, resolucion: (e.target.value || null) as ResolucionIntervencion | null }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Sin definir</option>
                  <option value="ALTA_EN_LUGAR">Alta en el lugar</option>
                  <option value="TRASLADO_CLINICA">Traslado a clínica</option>
                  <option value="ALTA_EN_CLINICA">Alta en clínica</option>
                  <option value="TRASLADO_HOSPITALARIO">Traslado hospitalario</option>
                </select>
                {formIntervencion.resolucion === 'TRASLADO_HOSPITALARIO' && (
                  <input
                    type="text"
                    placeholder="Centro hospitalario de destino"
                    value={formIntervencion.hospitalDestino}
                    onChange={(e) => setFormIntervencion((p) => ({ ...p, hospitalDestino: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-2"
                  />
                )}
                {(formIntervencion.resolucion === 'TRASLADO_CLINICA' || formIntervencion.resolucion === 'ALTA_EN_CLINICA') && (
                  <SelectorClinicaDestino
                    clinicas={clinicasDelEvento}
                    clinicaDestinoId={formIntervencion.clinicaDestinoId}
                    onSelectClinica={(idClinica) => setFormIntervencion((p) => ({ ...p, clinicaDestinoId: idClinica }))}
                    textoFallback={formIntervencion.hospitalDestino}
                    onChangeTexto={(v) => setFormIntervencion((p) => ({ ...p, hospitalDestino: v }))}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowModalIntervencion(false)}
                disabled={registrando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarIntervencion}
                disabled={registrando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {registrando ? 'Registrando...' : 'Registrar intervención'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar intervención (acceso directo desde el dashboard) */}
      {modalEditar && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setModalEditar(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Editar intervención #{modalEditar.numeroIntervencion}
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_INTERV_STYLES[modalEditar.estado]}`}>
                  {ESTADO_INTERV_LABEL[modalEditar.estado]}
                </span>
              </h2>
            </div>

            {errorEditar && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{errorEditar}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">UCO</label>
                  <select value={formEditar.uco ?? 'UCO1'}
                    onChange={(e) => setFormEditar((p) => ({ ...p, uco: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                    <option value="UCO1">UCO1</option>
                    <option value="UCO2">UCO2</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                  <input type="text" value={formEditar.sector ?? ''}
                    onChange={(e) => setFormEditar((p) => ({ ...p, sector: e.target.value || null }))}
                    placeholder="Ej: Sector A, Gol Sur..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lugar</label>
                <input type="text" value={formEditar.lugar ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, lugar: e.target.value || null }))}
                  placeholder="Ej: Puerta 7, Fila 3 Asiento 12..."
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación activada</label>
                <select value={formEditar.dotacionActivaId ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, dotacionActivaId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Sin asignar</option>
                  {estadoUCO?.dotaciones.map((d) => <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>)}
                </select>
                <AvisoDotacionNoDisponible
                  dotacionId={formEditar.dotacionActivaId ?? null}
                  dotaciones={estadoUCO?.dotaciones ?? []}
                  dotacionAnteriorId={modalEditar?.dotacionActiva?.id ?? null}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sintomatología</label>
                <select value={formEditar.sintomatologiaId ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, sintomatologiaId: Number(e.target.value) || undefined }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  {sintomatologias.map((s) => <option key={s.id} value={s.id}>{s.tipo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gravedad</label>
                <div className="flex gap-2">
                  {(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'] as GravedadIntervencion[]).map((g) => (
                    <button key={g} type="button"
                      onClick={() => setFormEditar((p) => ({ ...p, gravedad: g }))}
                      className={`flex-1 text-xs py-1.5 rounded-md font-medium border transition-colors
                        ${formEditar.gravedad === g ? GRAVEDAD_STYLES[g] + ' border-transparent' : 'border-slate-300 text-slate-600'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <DateTimeInput
                  label="Hora aviso"
                  value={formEditar.horaAviso}
                  onChange={(v) => setFormEditar((p) => ({ ...p, horaAviso: v }))}
                />
                <DateTimeInput
                  label="Hora llegada"
                  value={formEditar.horaLlegada}
                  onChange={(v) => setFormEditar((p) => ({ ...p, horaLlegada: v }))}
                />
                <DateTimeInput
                  label="Hora final"
                  value={formEditar.horaFinal}
                  onChange={(v) => setFormEditar((p) => ({ ...p, horaFinal: v }))}
                />
              </div>
              <p className="text-xs text-slate-400 -mt-2">Para registrar &quot;Hora final&quot; deben estar definidos &quot;Parte&quot; y &quot;Resolución&quot;.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dotación de apoyo</label>
                <select value={formEditar.dotacionApoyoId ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, dotacionApoyoId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Sin apoyo</option>
                  {estadoUCO?.dotaciones.filter((d) => d.id !== formEditar.dotacionActivaId).map((d) => (
                    <option key={d.id} value={d.id}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>
                  ))}
                </select>
                <AvisoDotacionNoDisponible
                  dotacionId={formEditar.dotacionApoyoId ?? null}
                  dotaciones={estadoUCO?.dotaciones ?? []}
                  dotacionAnteriorId={modalEditar?.dotacionApoyo?.id ?? null}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Resolución {formEditar.horaFinal && <span className="text-red-600">*</span>}
                </label>
                <select value={formEditar.resolucion ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, resolucion: (e.target.value || null) as ResolucionIntervencion | null }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Sin definir</option>
                  <option value="ALTA_EN_LUGAR">Alta en el lugar</option>
                  <option value="TRASLADO_CLINICA">Traslado a clínica</option>
                  <option value="ALTA_EN_CLINICA">Alta en clínica</option>
                  <option value="TRASLADO_HOSPITALARIO">Traslado hospitalario</option>
                </select>
                {formEditar.resolucion === 'TRASLADO_HOSPITALARIO' && (
                  <input type="text" placeholder="Centro hospitalario de destino" value={formEditar.hospitalDestino ?? ''}
                    onChange={(e) => setFormEditar((p) => ({ ...p, hospitalDestino: e.target.value || null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-2" />
                )}
                {(formEditar.resolucion === 'TRASLADO_CLINICA' || formEditar.resolucion === 'ALTA_EN_CLINICA') && (
                  <SelectorClinicaDestino
                    clinicas={clinicasDelEvento}
                    clinicaDestinoId={formEditar.clinicaDestinoId ?? null}
                    onSelectClinica={(idClinica) => setFormEditar((p) => ({ ...p, clinicaDestinoId: idClinica }))}
                    textoFallback={formEditar.hospitalDestino ?? ''}
                    onChangeTexto={(v) => setFormEditar((p) => ({ ...p, hospitalDestino: v || null }))}
                  />
                )}
                {formEditar.horaFinal && !formEditar.resolucion && (
                  <p className="text-xs text-red-600 mt-1">La resolución es obligatoria para cerrar la intervención.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Parte {formEditar.horaFinal && <span className="text-red-600">*</span>}
                </label>
                <select value={formEditar.parte ?? ''}
                  onChange={(e) => setFormEditar((p) => ({ ...p, parte: e.target.value || null }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Seleccionar dotación que rellena el parte</option>
                  {estadoUCO?.dotaciones.map((d) => (
                    <option key={d.id} value={d.codigo}>{d.codigo} — {TIPO_LABELS[d.tipo] ?? d.tipo}</option>
                  ))}
                </select>
                {formEditar.horaFinal && !formEditar.parte && (
                  <p className="text-xs text-red-600 mt-1">El parte es obligatorio para cerrar la intervención.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setModalEditar(null)} disabled={guardando}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={guardando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UCOPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500">Cargando...</div>}>
      <UCOContent />
    </Suspense>
  );
}
