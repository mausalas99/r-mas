/**
 * LWW silent-match helpers (no modal UI). Used by lan-sync hot path and optionally by clinical-conflict-viewer.
 */

const INTERNAL_DIFF_KEYS = new Set([
  'id',
  'patientId',
  'updatedAt',
  'version',
  'expectedVersion',
  '_deleted',
  'entityType',
  'entityId',
  'roomId',
  'clientId',
  'audit',
]);

const FIELD_LABELS = {
  identificacion: 'Identificación',
  motivoConsulta: 'Motivo de consulta',
  apnp: 'Antecedentes no patológicos',
  app: 'Antecedentes patológicos',
  ahf: 'Antecedentes heredofamiliares',
  genero: 'Género',
  sexual: 'Salud sexual',
  padecimientoActual: 'Padecimiento actual',
  datosNegados: 'Datos negados',
  ipas: 'IPAS',
  signosVitalesIngreso: 'Signos vitales de ingreso',
  labsAtAdmission: 'Labs de ingreso',
  labAnchor: 'Ancla de laboratorio',
  meta: 'Metadatos',
  labLookbackHours: 'Ventana de labs (h)',
  eventualidades: 'Eventualidades',
  nombre: 'Nombre',
  cuarto: 'Cuarto',
  cama: 'Cama',
  sexo: 'Sexo',
  edad: 'Edad',
  agenda: 'Agenda',
  todos: 'Pendientes',
  text: 'Descripción',
  completed: 'Completado',
  priority: 'Prioridad',
  createdAt: 'Fecha de creación',
  updatedAt: 'Última actualización',
  _deleted: 'Eliminado',
  entries: 'Entradas',
  manejo: 'Manejo',
};

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_e) {
      return false;
    }
  }
  return false;
}

const HC_STRUCTURED_KEYS = new Set(['ahf', 'app', 'apnp', 'ipas', 'genero', 'identificacion', 'signosVitalesIngreso']);

function trimCollapse(text, maxLen) {
  const max = maxLen == null ? 140 : maxLen;
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)) + '…';
}

function summarizeEntryRow(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const bits = [];
  if (entry.descripcionDetallada) bits.push(trimCollapse(entry.descripcionDetallada, 90));
  if (entry.diagnosis) bits.push('dx: ' + trimCollapse(entry.diagnosis, 50));
  if (entry.treatment) bits.push('tto: ' + trimCollapse(entry.treatment, 50));
  if (entry.description) bits.push(trimCollapse(entry.description, 60));
  if (entry.medication) bits.push(trimCollapse(entry.medication, 40));
  if (entry.relativeId && !bits.length) bits.push('familiar ' + String(entry.relativeId));
  return bits.join(' · ');
}

function summarizeIpasBlock(ipas) {
  if (!ipas || typeof ipas !== 'object') return '';
  const lines = [];
  for (const block of Object.values(ipas)) {
    if (!block || typeof block !== 'object') continue;
    const desc = trimCollapse(block.descripcion, 72);
    const checks = Array.isArray(block.checks) ? block.checks.length : 0;
    if (desc && desc.toLowerCase() !== 'interrogado y negado') {
      lines.push(desc);
    } else if (checks > 0) {
      lines.push(checks + ' hallazgo' + (checks === 1 ? '' : 's'));
    }
    if (lines.length >= 2) break;
  }
  if (!lines.length) return 'interrogado y negado';
  return lines.join(' · ');
}

export function formatFieldLabel(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  if (FIELD_LABELS[k]) return FIELD_LABELS[k];
  return k
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * @param {string} [fieldKey]
 * @param {unknown} value
 * @returns {string}
 */
export function summarizeConflictFieldValue(fieldKey, value) {
  const key = String(fieldKey || '').trim();
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      } catch (_e) {
        return trimCollapse(value) || '—';
      }
    }
    const t = trimCollapse(value);
    return t || '—';
  }
  if (Array.isArray(value)) {
    if (!value.length) return 'vacío';
    const previews = value
      .slice(0, 2)
      .map((item) => (typeof item === 'object' ? summarizeEntryRow(item) : trimCollapse(item, 60)))
      .filter(Boolean);
    const tail = value.length > 2 ? ' (+' + (value.length - 2) + ' más)' : '';
    return (previews.length ? previews.join('; ') : value.length + ' elemento' + (value.length === 1 ? '' : 's')) + tail;
  }
  if (typeof value !== 'object') return String(value);

  if (key === 'ipas') return summarizeIpasBlock(value) || '—';

  const parts = [];
  const desc = value.descripcionDetallada || value.descripcion;
  if (desc && String(desc).trim()) parts.push(trimCollapse(desc, 110));

  const entries = value.entries;
  if (Array.isArray(entries) && entries.length) {
    const rowText = entries
      .slice(0, 3)
      .map(summarizeEntryRow)
      .filter(Boolean)
      .join('; ');
    if (rowText) parts.push(rowText);
    if (entries.length > 3) parts.push('+' + (entries.length - 3) + ' registro' + (entries.length - 3 === 1 ? '' : 's'));
  }

  const condCount = Array.isArray(value.conditions) ? value.conditions.length : 0;
  if (condCount && !entries?.length) {
    parts.push(condCount + ' condición' + (condCount === 1 ? '' : 'es'));
  }

  for (const habitKey of ['tabaquismo', 'alcoholismo', 'toxicomanias', 'dieta', 'tatuajes', 'deportesPasatiemposMascotas']) {
    if (value[habitKey] && String(value[habitKey]).trim()) {
      parts.push(trimCollapse(value[habitKey], 55));
    }
  }

  if (value.medicamentosActuales && String(value.medicamentosActuales).trim()) {
    parts.push('Meds: ' + trimCollapse(value.medicamentosActuales, 70));
  }
  if (value.hospitalizacionesPrevias && String(value.hospitalizacionesPrevias).trim()) {
    parts.push('Hosp. prev.: ' + trimCollapse(value.hospitalizacionesPrevias, 60));
  }

  if (key === 'genero') {
    for (const gKey of ['menarquia', 'gestas', 'partos', 'cesareas', 'abortos', 'notas', 'ultimaMenstruacion']) {
      if (value[gKey] != null && String(value[gKey]).trim()) {
        parts.push(formatFieldLabel(gKey) + ': ' + trimCollapse(value[gKey], 40));
      }
    }
  }

  if (key === 'identificacion' && typeof value === 'object') {
    const idBits = ['lugarNacimiento', 'residencia', 'ocupacionActual', 'dx', 'cama']
      .map((k) => (value[k] ? formatFieldLabel(k) + ': ' + trimCollapse(value[k], 35) : ''))
      .filter(Boolean);
    if (idBits.length) parts.push(idBits.slice(0, 3).join(' · '));
  }

  if (parts.length) return parts.join(' · ');

  if (HC_STRUCTURED_KEYS.has(key)) return 'bloque sin texto legible';
  try {
    const raw = JSON.stringify(value);
    return raw.length > 120 ? trimCollapse(raw, 117) : raw;
  } catch (_e2) {
    return '—';
  }
}

function isInternalNoiseKey(key, localData, serverData) {
  if (!INTERNAL_DIFF_KEYS.has(key)) return false;
  const serverVal = serverData?.[key];
  if (serverVal === undefined || serverVal === null) return true;
  return valuesEqual(localData?.[key], serverVal);
}

function keysThatDiffer(localData, serverData) {
  const keys = new Set([...Object.keys(localData || {}), ...Object.keys(serverData || {})]);
  keys.delete('_deleted');
  return [...keys]
    .filter((key) => !isInternalNoiseKey(key, localData, serverData))
    .filter((key) => !valuesEqual(localData?.[key], serverData?.[key]))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string[]} [conflictingKeys]
 * @param {Record<string, unknown>} [localData]
 * @param {Record<string, unknown>} [serverData]
 * @returns {string[]}
 */
export function pickDiffKeys(conflictingKeys, localData, serverData) {
  const raw = Array.isArray(conflictingKeys) ? conflictingKeys.filter(Boolean) : [];
  const onlyStar = raw.length === 1 && raw[0] === '*';

  if (raw.length && !onlyStar) {
    return raw
      .filter((key) => !isInternalNoiseKey(key, localData, serverData))
      .sort((a, b) => a.localeCompare(b));
  }

  return keysThatDiffer(localData, serverData).filter((key) => {
    if (!INTERNAL_DIFF_KEYS.has(key)) return true;
    return !valuesEqual(localData?.[key], serverData?.[key]);
  });
}

/**
 * @param {{ conflictingKeys?: string[], localData?: Record<string, unknown>, serverData?: Record<string, unknown> }} opts
 */
export function conflictSnapshotsMatchForAutoResolve({ conflictingKeys, localData, serverData }) {
  const keys = pickDiffKeys(conflictingKeys, localData, serverData);
  if (!keys.length) return false;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const localVal = summarizeConflictFieldValue(key, localData?.[key]);
    const serverVal = summarizeConflictFieldValue(key, serverData?.[key]);
    if (localVal !== serverVal || localVal === '—') return false;
  }
  return true;
}
