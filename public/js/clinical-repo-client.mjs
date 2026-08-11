/**
 * Renderer client for clinical-repo IPC commands.
 */

/**
 * @returns {boolean}
 */
export function canExecuteClinicalCommand() {
  return !!(
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.dbClinicalCommand === 'function'
  );
}

/**
 * @param {{ type: string } & Record<string, unknown>} command
 * @param {{ actorId?: string, source?: string }} [meta]
 * @returns {Promise<{ ok: boolean, error?: string, changedKeys?: string[], changeId?: string|null }>}
 */
export async function executeClinicalCommand(command, meta = {}) {
  if (!canExecuteClinicalCommand()) {
    return { ok: false, error: 'ipc_unavailable' };
  }
  const res = await window.electronAPI.dbClinicalCommand({
    command,
    meta: {
      actorId: meta.actorId,
      source: meta.source || 'ui',
    },
  });
  if (!res || typeof res !== 'object') {
    return { ok: false, error: 'command_failed' };
  }
  if (res.ok === false) {
    return { ok: false, error: String(res.error || res.code || 'command_failed') };
  }
  return {
    ok: true,
    changedKeys: Array.isArray(res.changedKeys) ? res.changedKeys : [],
    changeId: res.changeId != null ? String(res.changeId) : null,
  };
}
