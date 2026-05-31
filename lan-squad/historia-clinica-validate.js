'use strict';

const LEGACY_SECTION_KEYS = new Set(['ficha', 'ahf', 'app', 'apnp', 'peea']);
const NESTED_SECTION_KEYS = new Set([
  'identificacion',
  'motivoConsulta',
  'apnp',
  'app',
  'ahf',
  'genero',
  'sexual',
  'padecimientoActual',
  'datosNegados',
  'ipas',
  'signosVitalesIngreso',
]);
const SECTION_KEYS = new Set([...LEGACY_SECTION_KEYS, ...NESTED_SECTION_KEYS]);
const META_KEYS = new Set([
  'labsAtAdmission',
  'labAnchor',
  'labLookbackHours',
  'editMode',
  'meta',
  'patientId',
  'createdAt',
  'updatedAt',
]);

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function isLegacyFlatHistoria(data) {
  if (!isPlainObject(data)) return false;
  return (
    typeof data.ficha === 'string' ||
    typeof data.app === 'string' ||
    typeof data.ahf === 'string' ||
    typeof data.apnp === 'string' ||
    typeof data.peea === 'string'
  );
}

/**
 * Best-effort flat → nested migration for PUT payloads still on legacy shape.
 * @param {Record<string, unknown>} data
 */
function migrateLegacyHistoriaData(data) {
  if (!isPlainObject(data) || !isLegacyFlatHistoria(data)) {
    return data;
  }
  const out = { ...data };
  if (typeof out.app === 'string') {
    out.app = {
      conditions: [],
      descripcionDetallada: out.app,
      medicamentosActuales: '',
      hospitalizacionesPrevias: '',
    };
  }
  if (typeof out.ahf === 'string') {
    out.ahf = { conditions: [], descripcionDetallada: out.ahf };
  }
  if (typeof out.apnp === 'string') {
    out.apnp = { tabaquismo: out.apnp };
  }
  if (typeof out.peea === 'string') {
    out.padecimientoActual = out.peea;
  }
  if (typeof out.ficha === 'string') {
    const ident = isPlainObject(out.identificacion) ? { ...out.identificacion } : {};
    ident.informante = out.ficha;
    out.identificacion = ident;
  }
  delete out.ficha;
  delete out.peea;
  return out;
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, mutation: object } | { ok: false, error: string, paths?: string[] }}
 */
function validateHistoriaClinicaPut(body) {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'invalid_body' };
  }
  const expectedVersion = Number(body.expectedVersion ?? 0);
  if (!Number.isFinite(expectedVersion) || expectedVersion < 0) {
    return { ok: false, error: 'invalid_expectedVersion', paths: ['expectedVersion'] };
  }
  const changedKeys = Array.isArray(body.changedKeys) ? body.changedKeys : [];
  if (expectedVersion > 0 && !changedKeys.length) {
    return { ok: false, error: 'changedKeys_required', paths: ['changedKeys'] };
  }
  for (const k of changedKeys) {
    if (!SECTION_KEYS.has(k) && !META_KEYS.has(k)) {
      return { ok: false, error: 'invalid_changedKey', paths: ['changedKeys'] };
    }
  }
  const roomId = String(body.roomId || '').trim();
  if (!roomId) {
    return { ok: false, error: 'roomId_required', paths: ['roomId'] };
  }
  if (!isPlainObject(body.data)) {
    return { ok: false, error: 'data_required', paths: ['data'] };
  }
  const data = migrateLegacyHistoriaData(body.data);
  if (body.audit != null && !isPlainObject(body.audit)) {
    return { ok: false, error: 'invalid_audit', paths: ['audit'] };
  }
  if (body.audit && Array.isArray(body.audit.safety)) {
    for (const s of body.audit.safety) {
      if (!s || typeof s.ruleId !== 'string') {
        return { ok: false, error: 'invalid_audit_safety', paths: ['audit.safety'] };
      }
    }
  }
  return {
    ok: true,
    mutation: {
      entityType: 'historiaClinica',
      entityId: String(body.patientId || body.entityId || ''),
      patientId: String(body.patientId || body.entityId || ''),
      roomId,
      expectedVersion,
      changedKeys,
      baseData: body.baseData,
      data,
      op: body.op,
      audit: body.audit,
      clientId: body.clientId,
    },
  };
}

module.exports = {
  validateHistoriaClinicaPut,
  migrateLegacyHistoriaData,
  SECTION_KEYS,
  NESTED_SECTION_KEYS,
  LEGACY_SECTION_KEYS,
};
