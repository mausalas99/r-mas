/**
 * After Admin Nube deletes a cloud account, purge the matching clinical user so they
 * leave team rosters (membership + LAN delete tombstone) and peers drop them on sync.
 */
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { publishClinicalTeamsAfterChange } from '../clinical-teams/teams-guardia-bridge.mjs';

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * @param {string} handle — cloud username (with or without @)
 * @returns {Promise<{ ok: boolean, reason?: string, targetUserId?: string }>}
 */
export async function purgeClinicalUserMatchingCloudHandle(handle) {
  const normalized = normalizeUsername(handle);
  if (!normalized) return { ok: false, reason: 'no_handle' };

  const api = dbApi();
  if (!api || typeof api.dbClinicalUserLookup !== 'function' || typeof api.dbClinicalUserDelete !== 'function') {
    return { ok: false, reason: 'no_db' };
  }

  const looked = await api.dbClinicalUserLookup({ username: normalized });
  const targetUserId = String(looked?.user?.user_id || '').trim();
  if (!targetUserId) return { ok: false, reason: 'not_local' };

  const callerUserId = String(clinicalSessionContext.user?.user_id || '');
  const res = await api.dbClinicalUserDelete({ targetUserId, callerUserId });
  if (!res?.ok) {
    return { ok: false, reason: String(res?.error || 'delete_failed'), targetUserId };
  }

  try {
    await publishClinicalTeamsAfterChange({
      sala: clinicalSessionContext.user?.sala,
    });
  } catch {
    /* push optional — local roster already cleaned */
  }

  if (typeof document !== 'undefined') {
    document.dispatchEvent(
      new CustomEvent('rpc-clinical-teams-changed', {
        detail: { source: 'cloud-admin-delete', sala: clinicalSessionContext.user?.sala },
      })
    );
  }

  return { ok: true, targetUserId };
}
