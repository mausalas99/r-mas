import crypto from 'node:crypto';

const EMPTY = { version: 2, items: [] };

/**
 * @param {object} partial
 */
export function createProcedimientoItem(partial) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: 'procedimiento',
    kind: partial.kind === 'imagen' ? 'imagen' : 'otro',
    label: String(partial.label || '').trim(),
    scheduledAt: partial.scheduledAt || null,
    comentado: !!partial.comentado,
    autorizado: !!partial.autorizado,
    agendado: !!partial.agendado,
    requires: {
      familiar: !!partial.requires?.familiar,
      consentimiento: !!partial.requires?.consentimiento,
      anestesia: !!partial.requires?.anestesia,
    },
    lockedBase: !!partial.lockedBase,
    createdBy: partial.createdBy || null,
    updatedAt: now,
    completedAt: null,
    completedBy: null,
  };
}

/** @param {string|object|null|undefined} raw */
export function normalizePendientesJson(raw) {
  if (raw == null || raw === '') return { version: 2, items: [] };
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { version: 2, items: [] };
  }
  if (parsed && parsed.version === 2 && Array.isArray(parsed.items)) {
    return { version: 2, items: parsed.items.filter(Boolean) };
  }
  if (Array.isArray(parsed)) {
    return {
      version: 2,
      items: parsed
        .map((line) => String(line).trim())
        .filter(Boolean)
        .map((text) => ({
          id: crypto.randomUUID(),
          type: 'legacy_text',
          text,
          updatedAt: new Date().toISOString(),
          completedAt: null,
        })),
    };
  }
  return { ...EMPTY, items: [] };
}

/** @param {object} doc */
export function serializePendientesJson(doc) {
  return JSON.stringify(normalizePendientesJson(doc));
}

/** @param {object} doc */
export function listActiveProcedimientos(doc) {
  return normalizePendientesJson(doc).items.filter(
    (it) =>
      (it.type === 'procedimiento' || it.type === 'legacy_text') && !it.completedAt
  );
}

/** @param {object} item */
export function pendingRequirementBadges(item) {
  const badges = [];
  if (item.requires?.consentimiento && !item.autorizado) badges.push('consentimiento');
  if (item.requires?.anestesia && !item.agendado) badges.push('anestesia');
  if (item.requires?.familiar && !item.comentado) badges.push('familiar');
  return badges;
}

/** @param {object} item @param {{ role: 'diurno'|'guardia' }} actor */
export function canDeletePendienteItem(item, actor) {
  if (actor.role === 'diurno') return true;
  if (actor.role === 'guardia') return !item.lockedBase;
  return false;
}

/**
 * @param {object} doc
 * @param {string} itemId
 * @param {object|null|undefined} completedBy
 */
export function completePendienteItem(doc, itemId, completedBy) {
  const norm = normalizePendientesJson(doc);
  const items = norm.items.map((it) => {
    if (it.id !== itemId) return it;
    if (it.completedAt) return it;
    return {
      ...it,
      completedAt: new Date().toISOString(),
      completedBy: completedBy || { kind: 'interno' },
      updatedAt: new Date().toISOString(),
    };
  });
  return { version: 2, items };
}
