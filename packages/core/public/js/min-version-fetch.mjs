/**
 * Fetch min-version policy: update Worker, then GitHub main, then the local
 * bundled file last — as an offline-only fallback.
 *
 * The local file (`/min-version.json`, packaged into every build via
 * `public/**` in package.json) is frozen at whatever value was baked in at
 * build time — it can never see a floor raised after that build shipped.
 * Probing it first meant it always answered before the two live checks ever
 * ran, so raising the floor centrally never actually reached an already-
 * installed app. Remote-first fixes that: a push to either endpoint takes
 * effect for every running install on its next launch.
 */

import { UPDATE_WORKER_URL } from '../../lib/update-feed.mjs';

const REMOTE_MIN_VERSION_URL =
  'https://raw.githubusercontent.com/mausalas99/r-mas/main/min-version.json';

/**
 * @returns {Promise<{ minVersion: string, message?: string }|null>}
 */
export async function fetchMinVersionPayload() {
  if (typeof fetch !== 'function') return null;
  const urls = [`${UPDATE_WORKER_URL}min-version.json`, REMOTE_MIN_VERSION_URL, '/min-version.json'];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && typeof data === 'object' && data.minVersion) {
        return {
          minVersion: String(data.minVersion),
          message: data.message ? String(data.message) : undefined,
        };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export { REMOTE_MIN_VERSION_URL as MIN_VERSION_URL };
