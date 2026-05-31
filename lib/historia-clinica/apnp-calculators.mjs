/** Standard drink ethanol (g) — WHO / clinical approximations */
export const GRAMS_ETHANOL_PER_DRINK = 14;

/** Pack-year style tobacco index thresholds */
export const TOBACCO_INDEX_WARN = 20;
export const TOBACCO_INDEX_HIGH = 40;

/** Weekly ethanol grams thresholds */
export const ALCOHOL_GRAMS_WEEK_WARN = 140;
export const ALCOHOL_GRAMS_WEEK_HIGH = 210;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{ status?: string, ageStarted?: number, cigarettesPerDay?: number, yearsSmoked?: number, ageStopped?: number, currentAge?: number }} input
 */
export function calcTobaccoIndex(input) {
  const status = input && input.status ? String(input.status) : 'negado';
  if (status === 'negado') {
    return {
      status: 'negado',
      summary: 'Negado',
      packYears: null,
      alert: null,
      copyLine: 'Tabaquismo: negado',
    };
  }

  const ageStarted = num(input.ageStarted);
  const cpd = num(input.cigarettesPerDay);
  const yearsSmoked = num(input.yearsSmoked);
  const ageStopped = num(input.ageStopped);
  const currentAge = num(input.currentAge);

  let effectiveYears = yearsSmoked;
  if (status === 'exfumador' && ageStarted != null && ageStopped != null && ageStopped > ageStarted) {
    effectiveYears = ageStopped - ageStarted;
  } else if (effectiveYears == null && ageStarted != null && currentAge != null && currentAge > ageStarted) {
    if (status === 'exfumador' && ageStopped != null) {
      effectiveYears = Math.max(0, ageStopped - ageStarted);
    } else if (status === 'activo') {
      effectiveYears = currentAge - ageStarted;
    }
  }

  if (cpd == null || effectiveYears == null || effectiveYears < 0) {
    return {
      status,
      summary: 'Incompleto',
      packYears: null,
      alert: null,
      copyLine: 'Tabaquismo: datos incompletos',
      effectiveYears: effectiveYears,
      cigarettesPerDay: cpd,
    };
  }

  const packYears = Math.round(((cpd / 20) * effectiveYears) * 10) / 10;
  let alert = null;
  if (packYears >= TOBACCO_INDEX_HIGH) alert = 'high';
  else if (packYears >= TOBACCO_INDEX_WARN) alert = 'warn';

  const statusLabel =
    status === 'exfumador' ? 'Exfumador' : status === 'activo' ? 'Activo' : status;
  let summary =
    statusLabel +
    ': inicio ' +
    (ageStarted != null ? ageStarted + ' años' : '—') +
    ', ' +
    cpd +
    ' cig/día, ' +
    effectiveYears +
    ' años efectivos';
  summary += '. Índice tabáquico ' + packYears + ' paquetes-año';
  if (status === 'exfumador' && ageStopped != null) {
    summary += ' (dejó a los ' + ageStopped + ' años)';
  }

  return {
    status,
    summary,
    packYears,
    effectiveYears,
    cigarettesPerDay: cpd,
    ageStarted,
    ageStopped,
    alert,
    copyLine: 'Tabaquismo: ' + summary,
  };
}

const FREQ_PER_WEEK = {
  dia: 7,
  daily: 7,
  semana: 1,
  weekly: 1,
  fin: 2,
  weekend: 2,
  mes: 0.25,
  monthly: 0.25,
  ocasional: 0.5,
  occasional: 0.5,
};

/**
 * @param {{ status?: string, ageStarted?: number, drinksPerOccasion?: number, frequencyKind?: string, frequencyCount?: number }} input
 */
export function calcAlcoholBurden(input) {
  const status = input && input.status ? String(input.status) : 'negado';
  if (status === 'negado') {
    return {
      status: 'negado',
      summary: 'Negado',
      gramsPerWeek: null,
      gramsPerDay: null,
      alert: null,
      copyLine: 'Alcoholismo: negado',
    };
  }

  const drinks = num(input.drinksPerOccasion);
  const kind = String(input.frequencyKind || 'semana').toLowerCase();
  const count = num(input.frequencyCount) ?? 1;
  const ageStarted = num(input.ageStarted);

  const perWeekBase = FREQ_PER_WEEK[kind];
  if (drinks == null || perWeekBase == null) {
    return {
      status,
      summary: 'Incompleto',
      gramsPerWeek: null,
      alert: null,
      copyLine: 'Alcoholismo: datos incompletos',
    };
  }

  const occasionsPerWeek = kind === 'semana' || kind === 'weekly' ? count : perWeekBase * count;
  const gramsPerWeek = Math.round(drinks * GRAMS_ETHANOL_PER_DRINK * occasionsPerWeek);
  const gramsPerDay = Math.round((gramsPerWeek / 7) * 10) / 10;

  let alert = null;
  if (gramsPerWeek >= ALCOHOL_GRAMS_WEEK_HIGH) alert = 'high';
  else if (gramsPerWeek >= ALCOHOL_GRAMS_WEEK_WARN) alert = 'warn';

  let summary = 'Consumo';
  if (ageStarted != null) summary += ' desde los ' + ageStarted + ' años';
  summary +=
    ': ' +
    drinks +
    ' bebida(s) estándar, ' +
    formatFrequencyLabel(kind, count) +
    ' (~' +
    gramsPerWeek +
    ' g etanol/semana, ~' +
    gramsPerDay +
    ' g/día)';

  return {
    status,
    summary,
    gramsPerWeek,
    gramsPerDay,
    drinksPerOccasion: drinks,
    frequencyKind: kind,
    frequencyCount: count,
    ageStarted,
    alert,
    copyLine: 'Alcoholismo: ' + summary,
  };
}

function formatFrequencyLabel(kind, count) {
  if (kind === 'dia' || kind === 'daily') return count > 1 ? count + ' veces al día' : 'diario';
  if (kind === 'semana' || kind === 'weekly') {
    return count === 1 ? '1 vez por semana' : count + ' veces por semana';
  }
  if (kind === 'fin' || kind === 'weekend') return 'fines de semana';
  if (kind === 'mes' || kind === 'monthly') return 'mensual';
  return 'ocasional';
}

/**
 * @param {object} apnp
 * @param {{ currentAge?: number }} [ctx]
 */
export function summarizeApnpHabits(apnp, ctx) {
  apnp = apnp || {};
  const tab = calcTobaccoIndex(
    Object.assign({}, apnp.tabaquismoDetail || {}, {
      currentAge: ctx && ctx.currentAge != null ? ctx.currentAge : undefined,
    })
  );
  const alc = calcAlcoholBurden(apnp.alcoholismoDetail || {});
  return { tabaquismo: tab, alcoholismo: alc };
}
