/**
 * Fixed option lists for HF objective-data forms (Part C, Phase 1).
 * Each export is a plain array of `{ value, label }` — `value` is what gets
 * persisted (kept short/legacy-compatible), `label` is the Spanish display
 * text shown in selects.
 */

export const FENOTIPOS = [
  { value: 'HFrEF', label: 'HFrEF' },
  { value: 'HFmrEF', label: 'HFmrEF' },
  { value: 'HFpEF', label: 'HFpEF' },
  { value: 'HFimpEF', label: 'HFimpEF' },
];

/**
 * Auto-classify fenotipo from a typed FEVI percentage. Returns null when
 * `fevi` isn't a finite number — callers should keep the previous fenotipo
 * in that case. Never returns 'HFimpEF' (recovered-EF history can't be
 * inferred from a single number) — that stays a manual override.
 * @param {unknown} fevi
 * @returns {'HFrEF'|'HFmrEF'|'HFpEF'|null}
 */
export function fenotipoFromFevi(fevi) {
  if (fevi == null || String(fevi).trim() === '') return null;
  var n = Number(fevi);
  if (!Number.isFinite(n)) return null;
  if (n <= 40) return 'HFrEF';
  if (n <= 49) return 'HFmrEF';
  return 'HFpEF';
}

export const ETIOLOGIAS = [
  { value: 'Isquémica', label: 'Isquémica' },
  { value: 'Hipertensiva', label: 'Hipertensiva' },
  { value: 'Valvular', label: 'Valvular' },
  { value: 'Miocardiopatía dilatada idiopática', label: 'Miocardiopatía dilatada idiopática' },
  { value: 'Miocardiopatía hipertrófica', label: 'Miocardiopatía hipertrófica' },
  { value: 'Amiloidosis', label: 'Amiloidosis' },
  { value: 'Chagásica', label: 'Chagásica' },
  { value: 'Taquicardiomiopatía', label: 'Taquicardiomiopatía' },
  { value: 'Tóxica quimioterapia', label: 'Tóxica quimioterapia' },
  { value: 'Alcohólica', label: 'Alcohólica' },
  { value: 'Miocarditis/inflamatoria', label: 'Miocarditis/inflamatoria' },
  { value: 'Periparto', label: 'Periparto' },
  { value: 'Congénita del adulto', label: 'Congénita del adulto' },
  { value: 'Otra', label: 'Otra' },
];

export const FASES_SEGUIMIENTO = [
  { value: 'Titulación de TMO', label: 'Titulación de TMO' },
  { value: 'Optimización/estable', label: 'Optimización/estable' },
  { value: 'Transición post-hospitalización', label: 'Transición post-hospitalización' },
  { value: 'IC avanzada', label: 'IC avanzada' },
  { value: 'Cuidados paliativos', label: 'Cuidados paliativos' },
];

export const NYHA = [
  { value: 'I', label: 'I' },
  { value: 'II', label: 'II' },
  { value: 'III', label: 'III' },
  { value: 'IV', label: 'IV' },
];

export const SEVERIDAD_VALVULAR = [
  { value: 'Leve', label: 'Leve' },
  { value: 'Moderada', label: 'Moderada' },
  { value: 'Severa', label: 'Severa' },
];

export const RITMOS = [
  { value: 'Sinusal', label: 'Sinusal' },
  { value: 'Fibrilación auricular', label: 'Fibrilación auricular' },
  { value: 'Flutter auricular', label: 'Flutter auricular' },
  { value: 'Ritmo de marcapasos', label: 'Ritmo de marcapasos' },
  { value: 'Otro', label: 'Otro' },
];

export const ESTRATEGIA_FA = [
  { value: 'Control de ritmo', label: 'Control de ritmo' },
  { value: 'Control de frecuencia', label: 'Control de frecuencia' },
];

export const ANTICOAGULANTES = [
  { value: 'Apixabán', label: 'Apixabán' },
  { value: 'Rivaroxabán', label: 'Rivaroxabán' },
  { value: 'Dabigatrán', label: 'Dabigatrán' },
  { value: 'Edoxabán', label: 'Edoxabán' },
  { value: 'Warfarina', label: 'Warfarina' },
  { value: 'Acenocumarina', label: 'Acenocumarina' },
  { value: 'Ninguno', label: 'Ninguno' },
  { value: 'Contraindicada', label: 'Contraindicada' },
];

function numberRange(max) {
  const out = [];
  for (let i = 0; i <= max; i += 1) out.push({ value: String(i), label: String(i) });
  return out;
}

export const CHA2DS2VASC_RANGE = numberRange(9);
export const HASBLED_RANGE = numberRange(9);
export const STOPBANG_RANGE = numberRange(8);

export const TRASTORNO_SUENO = [
  { value: 'SAOS', label: 'SAOS' },
  { value: 'SHO', label: 'SHO' },
  { value: 'SAOS+SHO', label: 'SAOS+SHO' },
  { value: 'Otro', label: 'Otro' },
  { value: 'Ninguno', label: 'Ninguno' },
];

export const TRATAMIENTO_SUENO = [
  { value: 'CPAP', label: 'CPAP' },
  { value: 'BiPAP', label: 'BiPAP' },
  { value: 'Oxígeno nocturno', label: 'Oxígeno nocturno' },
  { value: 'Higiene del sueño', label: 'Higiene del sueño' },
  { value: 'Ninguno', label: 'Ninguno' },
  { value: 'Otro', label: 'Otro' },
];

export const ESTADO_ESTUDIO = [
  { value: 'No realizado', label: 'No realizado' },
  { value: 'Solicitado', label: 'Solicitado' },
  { value: 'Realizado', label: 'Realizado' },
];

export const ENFERMEDAD_CORONARIA_ESTADO = [
  { value: 'No estudiada', label: 'No estudiada' },
  { value: 'En estudio', label: 'En estudio' },
  { value: 'Descartada', label: 'Descartada' },
  { value: 'Confirmada', label: 'Confirmada' },
];

export const METODO_CORONARIO = [
  { value: 'Coronariografía', label: 'Coronariografía' },
  { value: 'AngioTC coronario', label: 'AngioTC coronario' },
  { value: 'SPECT/PET', label: 'SPECT/PET' },
  { value: 'Eco de estrés', label: 'Eco de estrés' },
  { value: 'RMN de estrés', label: 'RMN de estrés' },
  { value: 'Clínico', label: 'Clínico' },
];

export const PERUGINI = [
  { value: '0', label: 'Grado 0' },
  { value: '1', label: 'Grado 1' },
  { value: '2', label: 'Grado 2' },
  { value: '3', label: 'Grado 3' },
];

export const TIPO_DISPOSITIVO = [
  { value: 'Marcapasos', label: 'Marcapasos' },
  { value: 'DAI', label: 'DAI' },
  { value: 'TRC-P', label: 'TRC-P' },
  { value: 'TRC-D', label: 'TRC-D' },
  { value: 'Monitor implantable', label: 'Monitor implantable' },
];

export const INDICACION_DISPOSITIVO = [
  { value: 'Prevención primaria', label: 'Prevención primaria' },
  { value: 'Prevención secundaria', label: 'Prevención secundaria' },
  { value: 'TRC por QRS ancho + FEVI reducida', label: 'TRC por QRS ancho + FEVI reducida' },
  { value: 'Bradicardia/bloqueo AV', label: 'Bradicardia/bloqueo AV' },
  { value: 'Otra', label: 'Otra' },
];

export const LLENADO_CAPILAR = [
  { value: 'Normal <2s', label: 'Normal <2s' },
  { value: 'Retardado 2-4s', label: 'Retardado 2-4s' },
  { value: 'Muy retardado >4s', label: 'Muy retardado >4s' },
];

export const TEMPERATURA_EXTREMIDADES = [
  { value: 'Calientes', label: 'Calientes' },
  { value: 'Tibias', label: 'Tibias' },
  { value: 'Frías', label: 'Frías' },
];

export const EDEMA_MI_GRADO = [
  { value: 'Sin edema', label: 'Sin edema' },
  { value: 'Fóvea desaparece inmediatamente', label: 'Fóvea desaparece inmediatamente' },
  { value: 'Fóvea marcada', label: 'Fóvea marcada' },
  { value: 'Deformación visible por arriba del tobillo', label: 'Deformación visible por arriba del tobillo' },
  { value: 'Deformación visible por arriba de la rodilla', label: 'Deformación visible por arriba de la rodilla' },
];

// Matches STEVENSON_OPTIONS in estado-actual-cardio-html.mjs verbatim — do not
// diverge, the stored value is the full label string on both sides.
export const STEVENSON = [
  { value: 'Caliente-seco', label: 'Caliente-seco (A)' },
  { value: 'Caliente-húmedo', label: 'Caliente-húmedo (B)' },
  { value: 'Frío-seco', label: 'Frío-seco (L)' },
  { value: 'Frío-húmedo', label: 'Frío-húmedo (C)' },
];

// Matches VEXUS_OPTIONS in estado-actual-cardio-html.mjs verbatim.
export const VEXUS_GRADES = [
  { value: '0', label: 'Grado 0' },
  { value: '1', label: 'Grado 1' },
  { value: '2', label: 'Grado 2' },
  { value: '3', label: 'Grado 3' },
];

export const DOPPLER_SUPRAHEPATICO = [
  { value: 'S>D', label: 'S>D' },
  { value: 'S<D', label: 'S<D' },
  { value: 'Flujo reverso sistólico', label: 'Flujo reverso sistólico' },
];

export const PULSATILIDAD_PORTAL = [
  { value: '<30%', label: '<30%' },
  { value: '30-50%', label: '30-50%' },
  { value: '>50%', label: '>50%' },
];

export const DOPPLER_RENAL = [
  { value: 'Continuo', label: 'Continuo' },
  { value: 'Bifásico', label: 'Bifásico' },
  { value: 'Monofásico', label: 'Monofásico' },
];

export const LINEAS_B_CAMPO = [
  { value: '0', label: '0' },
  { value: '1-2', label: '1-2' },
  { value: '≥3', label: '≥3' },
  { value: 'Coalescentes', label: 'Coalescentes' },
];

export const RX_TORAX_HALLAZGOS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Cardiomegalia', label: 'Cardiomegalia' },
  { value: 'Congestión hiliar', label: 'Congestión hiliar' },
  { value: 'Líneas B de Kerley', label: 'Líneas B de Kerley' },
  { value: 'Edema intersticial', label: 'Edema intersticial' },
  { value: 'Edema alveolar', label: 'Edema alveolar' },
  { value: 'Derrame pleural derecho', label: 'Derrame pleural derecho' },
  { value: 'Derrame pleural izquierdo', label: 'Derrame pleural izquierdo' },
  { value: 'Derrame pleural bilateral', label: 'Derrame pleural bilateral' },
  { value: 'Consolidación', label: 'Consolidación' },
];

export const COMORBILIDADES = [
  { value: 'DM2', label: 'DM2' },
  { value: 'HTA', label: 'HTA' },
  { value: 'ERC', label: 'ERC' },
  { value: 'EPOC', label: 'EPOC' },
  { value: 'Asma', label: 'Asma' },
  { value: 'Obesidad', label: 'Obesidad' },
  { value: 'SAOS', label: 'SAOS' },
  { value: 'Hipotiroidismo', label: 'Hipotiroidismo' },
  { value: 'Hipertiroidismo', label: 'Hipertiroidismo' },
  { value: 'Deficiencia de hierro', label: 'Deficiencia de hierro' },
  { value: 'Anemia', label: 'Anemia' },
  { value: 'Depresión/ansiedad', label: 'Depresión/ansiedad' },
  { value: 'Hepatopatía/cirrosis', label: 'Hepatopatía/cirrosis' },
  { value: 'Cáncer activo', label: 'Cáncer activo' },
  { value: 'EVC', label: 'EVC' },
  { value: 'Enfermedad arterial periférica', label: 'Enfermedad arterial periférica' },
  { value: 'Hiperuricemia/gota', label: 'Hiperuricemia/gota' },
  { value: 'Tabaquismo activo', label: 'Tabaquismo activo' },
  { value: 'Otra', label: 'Otra' },
];

export const CAUSA_REINGRESO = [
  { value: 'Congestión', label: 'Congestión' },
  { value: 'Bajo gasto', label: 'Bajo gasto' },
  { value: 'Congestión + bajo gasto', label: 'Congestión + bajo gasto' },
  { value: 'Infección', label: 'Infección' },
  { value: 'Arritmia', label: 'Arritmia' },
  { value: 'SICA', label: 'SICA' },
  { value: 'Programado', label: 'Programado' },
  { value: 'Otros', label: 'Otros' },
];

export const CAUSA_MUERTE = [
  { value: 'Insuficiencia cardiaca', label: 'Insuficiencia cardiaca' },
  { value: 'Causas cardiovasculares', label: 'Causas cardiovasculares' },
  { value: 'Otras causas', label: 'Otras causas' },
];

export const TITULACION_DOSIS = [
  { value: 'Mínima', label: 'Mínima' },
  { value: 'Media', label: 'Media' },
  { value: 'Máxima', label: 'Máxima' },
];

export const CMF_DOSIS = [
  { value: '500 mg', label: '500 mg' },
  { value: '1000 mg', label: '1000 mg' },
  { value: '1500 mg (dos aplicaciones)', label: '1500 mg (dos aplicaciones)' },
  { value: 'Otra', label: 'Otra' },
];
