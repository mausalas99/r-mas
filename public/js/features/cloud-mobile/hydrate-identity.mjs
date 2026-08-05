/**
 * Seed clinical session from Nube /auth/me so team-scope sidebar can resolve
 * the desktop clinical user via clinicalOps username match.
 */
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { persistClinicalUserBinding } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { bridgeCloudIdentityToLocal } from '../cloud-sync/identity-bridge.mjs';
import { createCloudSyncApi } from '../cloud-sync/api-client.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  readCloudMobileJoinUser,
  getCloudSyncRoomSnapshot,
  readCloudMobileJoinSala,
} from './session.mjs';

/**
 * @param {object} seeded
 */
function applyCloudMobileSalaFromRoom(seeded) {
  const sala = String(
    getCloudSyncRoomSnapshot()?.sala || readCloudMobileJoinSala() || ''
  ).trim();
  if (!sala || !seeded) return seeded;
  seeded.sala = sala;
  clinicalSessionContext.user = seeded;
  persistClinicalUserBinding({
    sala,
    registered: true,
    lanProfileGateComplete: true,
    userId: seeded.user_id,
    username: seeded.username || undefined,
    displayName: seeded.clinical_name || undefined,
  });
  return seeded;
}

/**
 * @param {{ username?: string, displayName?: string, id?: string } | null | undefined} cloudUser
 */
export function seedCloudMobileClinicalUser(cloudUser) {
  const username = normalizeUsername(
    String(cloudUser?.username || readCloudMobileJoinUser() || '').replace(/^@+/, '')
  );
  const displayName = String(cloudUser?.displayName || '').trim();
  if (!username && !cloudUser?.id) return null;

  const seeded = {
    user_id: username || String(cloudUser?.id || 'cloud-mobile'),
    username: username || null,
    rank: 'R1',
    sala: null,
    clinical_name: displayName || null,
    is_program_admin: 0,
  };
  clinicalSessionContext.user = seeded;
  persistClinicalUserBinding({
    userId: seeded.user_id,
    username: username || undefined,
    displayName: displayName || undefined,
    registered: true,
    lanProfileGateComplete: true,
  });
  return applyCloudMobileSalaFromRoom(seeded);
}

/**
 * @param {ReturnType<typeof createCloudSyncApi>} [api]
 */
export async function hydrateCloudMobileIdentity(api) {
  const client =
    api ||
    createCloudSyncApi({
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken,
    });
  if (!getCloudSyncToken()) {
    seedCloudMobileClinicalUser({ username: readCloudMobileJoinUser() });
    return null;
  }
  try {
    const data = await client.me();
    const user = data?.user || null;
    seedCloudMobileClinicalUser(user);
    if (user?.username) {
      await bridgeCloudIdentityToLocal({
        username: user.username,
        displayName: user.displayName || '',
      });
    }
    return user;
  } catch {
    seedCloudMobileClinicalUser({ username: readCloudMobileJoinUser() });
    return null;
  }
}
