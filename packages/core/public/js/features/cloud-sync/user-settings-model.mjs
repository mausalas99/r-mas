/**
 * Per-user "datos para documentos" (desktop side). Pure: no DOM, no network.
 *
 * Wire: `settings/{userId}` = `{ updatedAt, ...fields }`, sealed with the room
 * DEK like other content paths. LWW by updatedAt, whole object replaces the old.
 * Only the keys below travel. The stamp (last pushed or applied) stays local.
 */

export const USER_SETTINGS_KEYS = [
  'doctorName',
  'medicosPlantilla',
  'defaultServicio',
  'censoSala',
  'censoTorre',
  'censoFimiLabel',
];

const TEMPLATE_KEYS = ['profesor', 'r4', 'r2', 'r1a', 'r1b'];

/** @param {unknown} v */
function text(v) {
  return String(v ?? '').trim();
}

/**
 * The wire fields, read from rpc-settings. Always the full shape, same order.
 * @param {Record<string, unknown> | null | undefined} settings
 */
export function pickUserSettings(settings) {
  const src = settings && typeof settings === 'object' ? settings : {};
  const tpl = src.medicosPlantilla && typeof src.medicosPlantilla === 'object' ? src.medicosPlantilla : {};
  const medicosPlantilla = {};
  for (const k of TEMPLATE_KEYS) medicosPlantilla[k] = text(tpl[k]);
  return {
    doctorName: text(src.doctorName),
    medicosPlantilla,
    defaultServicio: text(src.defaultServicio),
    censoSala: text(src.censoSala),
    censoTorre: text(src.censoTorre),
    censoFimiLabel: text(src.censoFimiLabel),
  };
}

/**
 * Next op stamp: now, but never equal to or older than the last stamp we know.
 * @param {string} lastAt @param {string} nowIso
 */
export function nextUpdatedAt(lastAt, nowIso) {
  if (!lastAt || nowIso > lastAt) return nowIso;
  const t = Date.parse(lastAt);
  return Number.isFinite(t) ? new Date(t + 1).toISOString() : nowIso;
}

/**
 * Local edit: null when nothing changed since the last stamp for this user.
 * @param {{ userId: string, settings: Record<string, unknown>, stamp: { userId: string, updatedAt: string, json: string } | null, nowIso: string }} args
 */
export function planUserSettingsPush({ userId, settings, stamp, nowIso }) {
  if (!userId) return null;
  const picked = pickUserSettings(settings);
  const json = JSON.stringify(picked);
  const sameUser = !!stamp && stamp.userId === userId;
  if (sameUser && stamp.json === json) return null;
  const updatedAt = nextUpdatedAt(sameUser ? stamp.updatedAt : '', nowIso);
  return {
    updatedAt,
    value: { updatedAt, ...picked },
    stamp: { userId, updatedAt, json },
  };
}

/**
 * Pulled value from the server: null when it is not newer than our stamp.
 * Writes only USER_SETTINGS_KEYS; every other rpc-settings key stays as it was.
 * @param {{ userId: string, remote: Record<string, unknown>, settings: Record<string, unknown>, stamp: { userId: string, updatedAt: string, json: string } | null }} args
 */
export function planRemoteUserSettingsApply({ userId, remote, settings, stamp }) {
  if (!userId || !remote || typeof remote !== 'object') return null;
  const remoteAt = text(remote.updatedAt);
  if (!remoteAt) return null;
  const lastAt = stamp && stamp.userId === userId ? stamp.updatedAt : '';
  if (lastAt && remoteAt <= lastAt) return null;
  const picked = pickUserSettings(remote);
  const next = { ...settings };
  for (const key of USER_SETTINGS_KEYS) next[key] = picked[key];
  return {
    settings: next,
    stamp: { userId, updatedAt: remoteAt, json: JSON.stringify(pickUserSettings(next)) },
  };
}
