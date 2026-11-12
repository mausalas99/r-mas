// Pure state helpers for the Entrega modal view (no DOM): time parts, handoff fields, vitals UI state.
import {
  coerceVasopressorUnit,
  defaultHandoffContext,
  defaultVasopressorInfusion,
  normalizeHandoffContext,
  normalizeVasopressorAgent,
} from '../../../lib/entrega/entrega-handoff-context.mjs';
import {
  defaultFrequencySpec,
  defaultVitalsPlan,
  normalizeFrequencySpec,
  normalizeUntilTime,
  normalizeVitalsPlan,
} from '../../../lib/entrega/entrega-vitals-plan.mjs';

/** Who is opening the modal: the receiving guardia (covering user) or the day team. */
export function resolveEntregaActorRole(currentUser, existingGuardia) {
  const userId = String(currentUser?.user_id || currentUser?.userId || '');
  const coveringUserId = String(existingGuardia?.covering_user_id || '');
  const hasGuardia = !!(existingGuardia?.guardia_id || existingGuardia?.guardiaId);
  const isCoveringReceiver = hasGuardia && coveringUserId !== '' && coveringUserId === userId;
  return { role: isCoveringReceiver ? 'guardia' : 'diurno', userId, rank: String(currentUser?.rank || '') };
}

const pad2 = (n) => String(n).padStart(2, '0');

/** @param {string|null|undefined} scheduledAt */
export function formatHHmm(scheduledAt) {
  if (!scheduledAt) return '';
  const d = new Date(scheduledAt);
  if (!Number.isNaN(d.getTime())) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const m = String(scheduledAt).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

/** @param {string} hhmm */
export function scheduledAtFromTimeInput(hhmm) {
  const t = String(hhmm || '').trim();
  if (!t) return null;
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Next 5-minute mark. @param {Date} now @returns {string} HH:mm */
export function defaultProcedureTimeHHmm(now) {
  const d = new Date(now);
  let mins = Math.ceil(d.getMinutes() / 5) * 5;
  if (mins >= 60) {
    d.setHours(d.getHours() + 1);
    mins = 0;
  }
  d.setMinutes(mins, 0, 0);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** @param {string} hhmm */
export function parseTimeParts(hhmm) {
  const t = formatHHmm(hhmm) || String(hhmm || '').trim();
  if (!t || !/^\d{1,2}:\d{1,2}$/.test(t)) return { hour: '', minute: '' };
  const [hour, minute] = t.split(':');
  return { hour: pad2(hour), minute: pad2(minute) };
}

/** Raw form fields of the handoff panel, from a stored context. */
export function handoffFieldsFromContext(ctx, hints = {}) {
  const n = normalizeHandoffContext(ctx, hints);
  const agent = normalizeVasopressorAgent(n.vasopressor.agent) || 'norepinefrina';
  return {
    clinicalStatus: n.clinicalStatus,
    signedRefusal: n.signedRefusal,
    show: n.show,
    vasopressor: {
      active: n.vasopressor.active,
      agent,
      unit: coerceVasopressorUnit(agent, n.vasopressor.unit),
      dose: String(n.vasopressor.dose || defaultVasopressorInfusion(agent).dose),
    },
    ventilation: { ...n.ventilation },
    notes: n.notes,
  };
}

/** Fields → the context saved in pendientes_json. */
export const handoffContextFromFields = (fields) => normalizeHandoffContext(fields);

/** Dose and unit reset to the agent's default (agent changed, or Vasopresor switched on). */
export function withVasoDefaults(fields, agent = fields.vasopressor.agent) {
  const a = normalizeVasopressorAgent(agent) || 'norepinefrina';
  const d = defaultVasopressorInfusion(a);
  return {
    ...fields,
    vasopressor: { ...fields.vasopressor, agent: a, dose: d.dose, unit: coerceVasopressorUnit(a, d.unit) },
  };
}

export { defaultHandoffContext };

/** The plan the modal starts from: stored plan, else the legacy DB frequency, else every 2 h. */
export function initialVitalsPlan({ vitalsPlan, vitalsFrequency } = {}) {
  if (vitalsPlan) return normalizeVitalsPlan(vitalsPlan);
  const frequency = vitalsFrequency ? normalizeFrequencySpec(vitalsFrequency) : { mode: 'interval', hours: 2 };
  return normalizeVitalsPlan({ ...defaultVitalsPlan(), frequency });
}

const untilUi = (hhmm) => {
  const { hour, minute } = parseTimeParts(hhmm || '07:00');
  return { on: !!hhmm, h: hour, m: minute };
};

/** Vitals panel UI state from a plan. */
export function vitalsUiFromPlan(plan) {
  const p = normalizeVitalsPlan(plan);
  const f = p.frequency;
  return {
    metrics: { ...p.metrics },
    mode: f.mode === 'shift' ? 'shift' : f.mode === 'routine' ? 'routine' : 'interval',
    hours: String(f.mode === 'interval' ? f.hours ?? 2 : 2),
    shiftTimes: f.mode === 'shift' ? f.timesPerShift ?? 1 : 1,
    until: {
      interval: untilUi(f.mode === 'interval' ? f.untilTime : null),
      shift: untilUi(f.mode === 'shift' ? f.untilTime : null),
    },
  };
}

/** Vitals panel UI state → plan (only the visible mode's «Detener a las» counts). */
export function vitalsPlanFromUi(ui) {
  let frequency = defaultFrequencySpec();
  if (ui.mode !== 'routine') {
    const u = ui.until[ui.mode];
    const untilTime = u.on && u.h && u.m ? normalizeUntilTime(`${u.h}:${u.m}`) : null;
    frequency = normalizeFrequencySpec(
      ui.mode === 'shift'
        ? { mode: 'shift', timesPerShift: ui.shiftTimes, untilTime }
        : { mode: 'interval', hours: Number(ui.hours || 2), untilTime }
    );
  }
  return normalizeVitalsPlan({ frequency, metrics: ui.metrics });
}
