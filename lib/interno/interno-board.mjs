import { normalizeHandoffContext } from '../entrega/entrega-handoff-context.mjs';
import {
  listActiveProcedimientos,
  normalizePendientesJson,
  pendingRequirementBadges,
} from '../entrega/entrega-pendientes.mjs';
import {
  enabledVitalsMetricKeys,
  enabledVitalsMetricLabels,
  frequencyDisplayLabel,
  resolveGuardiaVitalsFrequencySpec,
  resolveInternoBoardVitalsPlan,
  vitalsStructuredMonitoringEnabled,
  vitalsPlanSummary,
} from '../entrega/entrega-vitals-plan.mjs';
import { calcVitalsBannerForSpec } from './vitals-banner.mjs';
import { sortPatientsByPriorityThenBed } from '../patient-priority-sort.mjs';

/** @param {string|null|undefined} scheduledAt */
function formatHHmm(scheduledAt) {
  if (!scheduledAt) return null;
  const d = new Date(scheduledAt);
  if (!Number.isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const m = String(scheduledAt).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}

/** @param {string} text */
function extractTimeFromLegacyText(text) {
  const m = String(text || '').match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}

/** @param {string|object|null|undefined} json */
export function parsePendientesJson(json) {
  const doc = normalizePendientesJson(json);
  return doc.items
    .filter((it) => it.type === 'procedimiento' || it.type === 'legacy_text')
    .map((it) => {
      if (it.type === 'procedimiento') {
        return {
          id: it.id,
          label: it.label,
          kind: it.kind,
          time: formatHHmm(it.scheduledAt),
          badges: pendingRequirementBadges(it),
          completed: !!it.completedAt,
        };
      }
      return {
        id: it.id,
        label: it.text,
        time: extractTimeFromLegacyText(it.text),
        badges: [],
        completed: !!it.completedAt,
      };
    });
}

/** @param {string} name */
export function abbreviatePatientName(name) {
  const raw = String(name || '').trim().toUpperCase();
  if (!raw) return '—';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 12);
  const last = parts[0];
  const firstInitial = parts[parts.length - 1].charAt(0);
  return `${last} ${firstInitial}.`.slice(0, 18);
}

/**
 * @param {object[]} patients
 * @param {Map<string, object>} guardiasByPatientId
 */
/** @param {object} doc @param {{ vitalsPlan?: unknown }} vitalsPlan */
function internoBoardRowVisible(doc, vitalsPlan) {
  if (vitalsStructuredMonitoringEnabled(vitalsPlan)) return true;
  return listActiveProcedimientos(doc).length > 0;
}

export function buildInternoBoardDto(sala, patients, guardiasByPatientId) {
  const rows = [];
  const orderedPatients = sortPatientsByPriorityThenBed(patients, guardiasByPatientId);
  for (const p of orderedPatients) {
    const g = guardiasByPatientId.get(String(p.id)) || {};
    const doc = normalizePendientesJson(g.pendientes_json);
    const pendientes = parsePendientesJson(g.pendientes_json);
    const estudiosPending = listActiveProcedimientos(doc).length;
    const vitalsPlan = resolveInternoBoardVitalsPlan(doc, g);
    if (!internoBoardRowVisible(doc, vitalsPlan)) continue;
    const signosPending = vitalsStructuredMonitoringEnabled(vitalsPlan);
    const vitalsFreqSpec = resolveGuardiaVitalsFrequencySpec(vitalsPlan, g.vitals_frequency);
    const vitals = calcVitalsBannerForSpec(g.last_vitals_check, vitalsFreqSpec);
    const bed =
      [p.cuarto, p.cama].filter(Boolean).join('-') ||
      String(p.bed_label || p.cama || p.cuarto || '—');
    const handoff = normalizeHandoffContext(doc.handoffContext);

    rows.push({
      id: String(p.id),
      bedLabel: bed,
      nameShort: abbreviatePatientName(p.nombre || p.name),
      vitals: {
        banner: vitals.str,
        cls: vitals.cls,
        frequency: frequencyDisplayLabel(vitalsFreqSpec),
        metrics: enabledVitalsMetricLabels(vitalsPlan),
        metricKeys: enabledVitalsMetricKeys(vitalsPlan),
        summary: vitalsPlanSummary(vitalsPlan),
      },
      signosPending,
      estudiosPending,
      pendingCount: estudiosPending,
      pendientes,
      isCritical: !!(g.is_critical === 1 || g.is_critical === true),
      signedRefusal: handoff.signedRefusal,
      show: handoff.show,
    });
  }

  let vitalsOverdue = 0;
  let vitalsDueSoon = 0;
  let signosMonitored = 0;
  for (const r of rows) {
    if (r.signosPending) signosMonitored += 1;
    if (r.vitals.cls === 'breached') vitalsOverdue += 1;
    else if (r.vitals.cls === 'warning') vitalsDueSoon += 1;
  }

  return {
    sala,
    active: true,
    summary: {
      total: rows.length,
      vitalsOverdue,
      vitalsDueSoon,
      signosMonitored,
    },
    patients: rows,
  };
}
