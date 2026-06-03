/** @typedef {'stable'|'unstable'|'critical'|'postop'|''} ClinicalStatus */
/** @typedef {'norepinefrina'|'vasopresina'|''} VasopressorAgent */
/** @typedef {'mcg_kg_min'|'mcg_min'|'ui_min'} VasopressorUnit */

export const CLINICAL_STATUS_OPTIONS = [
  { value: '', label: '— Seleccionar —' },
  { value: 'stable', label: 'Estable' },
  { value: 'unstable', label: 'Inestable' },
  { value: 'critical', label: 'Crítico / deterioro' },
  { value: 'postop', label: 'Postoperatorio inmediato' },
];

export const VASOPRESSOR_AGENTS = [
  { value: 'norepinefrina', label: 'Norepinefrina', short: 'Nore' },
  { value: 'vasopresina', label: 'Vasopresina', short: 'Vasopresina' },
];

export const VASOPRESSOR_UNIT_LABELS = {
  mcg_kg_min: 'mcg/kg/min',
  mcg_min: 'mcg/min',
  ui_min: 'UI/min',
};

/** @type {Record<string, { dose: string, unit: VasopressorUnit }>} */
export const VASOPRESSOR_INFUSION_DEFAULTS = {
  norepinefrina: { dose: '0.05', unit: 'mcg_kg_min' },
  vasopresina: { dose: '0.03', unit: 'ui_min' },
};

const AGENT_ALIASES = {
  norepinefrina: 'norepinefrina',
  nore: 'norepinefrina',
  vasopresina: 'vasopresina',
};

/** @param {string} agent */
export function normalizeVasopressorAgent(agent) {
  const key = String(agent || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (key.includes('vasopres')) return 'vasopresina';
  if (key.includes('nore') || key.includes('levophed')) return 'norepinefrina';
  return AGENT_ALIASES[key] || '';
}

/** @param {VasopressorAgent} agent */
export function defaultVasopressorInfusion(agent) {
  const norm = normalizeVasopressorAgent(agent);
  return (
    VASOPRESSOR_INFUSION_DEFAULTS[norm] || {
      dose: '',
      unit: 'mcg_kg_min',
    }
  );
}

/** @param {VasopressorAgent} agent @param {VasopressorUnit} unit */
export function coerceVasopressorUnit(agent, unit) {
  const normAgent = normalizeVasopressorAgent(agent);
  if (normAgent === 'vasopresina') return 'ui_min';
  if (unit === 'mcg_min' || unit === 'mcg_kg_min') return unit;
  return 'mcg_kg_min';
}

/**
 * @param {string} rate
 * @returns {{ dose: string, unit: VasopressorUnit }}
 */
export function parseVasopressorRate(rate) {
  const raw = String(rate || '').trim();
  if (!raw) return { dose: '', unit: 'mcg_kg_min' };
  const ui = raw.match(/([\d.]+)\s*UI\s*\/\s*min/i);
  if (ui) return { dose: ui[1], unit: 'ui_min' };
  const perKg = raw.match(/([\d.]+)\s*mcg\s*\/\s*kg\s*\/\s*min/i);
  if (perKg) return { dose: perKg[1], unit: 'mcg_kg_min' };
  const perMin = raw.match(/([\d.]+)\s*mcg\s*\/\s*min/i);
  if (perMin) return { dose: perMin[1], unit: 'mcg_min' };
  const num = raw.match(/([\d.]+)/);
  return { dose: num ? num[1] : '', unit: 'mcg_kg_min' };
}

/** @param {object} vas */
export function formatVasopressorInfusion(vas) {
  const agent = normalizeVasopressorAgent(vas?.agent);
  const dose = String(vas?.dose || '').trim();
  const unit = coerceVasopressorUnit(agent, vas?.unit);
  if (!dose) return '';
  const agentLabel =
    VASOPRESSOR_AGENTS.find((a) => a.value === agent)?.short ||
    VASOPRESSOR_AGENTS.find((a) => a.value === agent)?.label ||
    '';
  const unitLabel = VASOPRESSOR_UNIT_LABELS[unit] || '';
  return [agentLabel, dose, unitLabel].filter(Boolean).join(' ');
}

/** @param {object|null|undefined} vas */
export function normalizeVasopressor(vas) {
  const active = !!(vas?.active || vas?.agent || vas?.dose || vas?.rate);
  let agent = normalizeVasopressorAgent(vas?.agent);
  let dose = String(vas?.dose || '').trim();
  let unit = coerceVasopressorUnit(agent, vas?.unit);

  if (!dose && vas?.rate) {
    const parsed = parseVasopressorRate(vas.rate);
    dose = parsed.dose;
    if (!vas?.unit) unit = parsed.unit;
  }

  if (active && agent && !dose) {
    const defaults = defaultVasopressorInfusion(agent);
    dose = defaults.dose;
    unit = defaults.unit;
  }

  if (active && !agent) {
    agent = 'norepinefrina';
    const defaults = defaultVasopressorInfusion(agent);
    if (!dose) dose = defaults.dose;
    unit = defaults.unit;
  }

  unit = coerceVasopressorUnit(agent, unit);

  return {
    active,
    agent,
    dose,
    unit,
    rate: formatVasopressorInfusion({ agent, dose, unit }),
  };
}

export const VENTILATION_MODES = [
  { value: '', label: '— Sin especificar —' },
  { value: 'room_air', label: 'Ambiente / cánula nasal' },
  { value: 'hfnc', label: 'Alto flujo (LAF)' },
  { value: 'niv', label: 'VMNI' },
  { value: 'invasive', label: 'VMI' },
  { value: 'other', label: 'Otro soporte' },
];

/** @returns {object} */
export function defaultHandoffContext() {
  const vaso = normalizeVasopressor({ active: false, agent: 'norepinefrina' });
  return {
    clinicalStatus: '',
    signedRefusal: false,
    show: false,
    vasopressor: vaso,
    ventilation: { active: false, mode: '', fio2: '', settings: '' },
    notes: '',
  };
}

/**
 * @param {object|null|undefined} raw
 * @param {{ signedRefusal?: boolean }} [hints]
 */
export function normalizeHandoffContext(raw, hints = {}) {
  const base = defaultHandoffContext();
  if (!raw || typeof raw !== 'object') {
    if (hints.signedRefusal) base.signedRefusal = true;
    return base;
  }
  const vent = raw.ventilation && typeof raw.ventilation === 'object' ? raw.ventilation : {};
  const status = String(raw.clinicalStatus || '');
  const allowed = new Set(CLINICAL_STATUS_OPTIONS.map((o) => o.value));
  return {
    clinicalStatus: allowed.has(status) ? status : '',
    signedRefusal: !!(raw.signedRefusal ?? hints.signedRefusal),
    show: !!(raw.show ?? raw.shock),
    vasopressor: normalizeVasopressor(raw.vasopressor),
    ventilation: {
      active: !!(vent.active || vent.mode || vent.fio2 || vent.settings),
      mode: String(vent.mode || '').trim(),
      fio2: String(vent.fio2 || '').trim(),
      settings: String(vent.settings || '').trim(),
    },
    notes: String(raw.notes || '').trim(),
  };
}

/** @param {object} ctx */
export function handoffContextSummary(ctx) {
  const norm = normalizeHandoffContext(ctx);
  const parts = [];
  const statusLabel = CLINICAL_STATUS_OPTIONS.find((o) => o.value === norm.clinicalStatus)?.label;
  if (statusLabel && norm.clinicalStatus) parts.push(statusLabel);
  if (norm.signedRefusal) parts.push('Negativas firmadas');
  if (norm.show) parts.push('Show');
  if (norm.vasopressor.active) {
    const v = formatVasopressorInfusion(norm.vasopressor);
    parts.push(v ? `Vasopresor: ${v}` : 'Vasopresor');
  }
  if (norm.ventilation.active) {
    const modeLabel = VENTILATION_MODES.find((m) => m.value === norm.ventilation.mode)?.label;
    const v = [modeLabel, norm.ventilation.fio2 && `FiO₂ ${norm.ventilation.fio2}`]
      .filter(Boolean)
      .join(' · ');
    parts.push(v || 'Ventilación');
  }
  if (norm.notes) parts.push(norm.notes);
  return parts.length ? parts.join(' · ') : 'Sin resumen clínico';
}
