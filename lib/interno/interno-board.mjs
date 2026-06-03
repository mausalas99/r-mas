import {
  listActiveProcedimientos,
  normalizePendientesJson,
  pendingRequirementBadges,
} from '../entrega/entrega-pendientes.mjs';
import { calcVitalsBanner } from './vitals-banner.mjs';

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
export function buildInternoBoardDto(sala, patients, guardiasByPatientId) {
  const rows = patients.map((p) => {
    const g = guardiasByPatientId.get(String(p.id)) || {};
    const doc = normalizePendientesJson(g.pendientes_json);
    const pendientes = parsePendientesJson(g.pendientes_json);
    const pendingCount = listActiveProcedimientos(doc).length;
    const vitals = calcVitalsBanner(g.last_vitals_check, g.vitals_frequency);
    const bed =
      [p.cuarto, p.cama].filter(Boolean).join('-') ||
      String(p.bed_label || p.cama || p.cuarto || '—');

    return {
      id: String(p.id),
      bedLabel: bed,
      nameShort: abbreviatePatientName(p.nombre || p.name),
      vitals: {
        banner: vitals.str,
        cls: vitals.cls,
        frequency: String(g.vitals_frequency || 'None'),
      },
      pendingCount,
      pendientes,
      isCritical: !!(g.is_critical === 1 || g.is_critical === true),
    };
  });

  rows.sort((a, b) => String(a.bedLabel).localeCompare(String(b.bedLabel), 'es'));

  let vitalsOverdue = 0;
  let vitalsDueSoon = 0;
  for (const r of rows) {
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
    },
    patients: rows,
  };
}
