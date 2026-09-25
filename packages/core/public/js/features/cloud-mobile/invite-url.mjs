/**
 * Cloud mobile invite URL helpers — permanent user session (no room/sala in URL).
 */

/**
 * @param {URL} url
 * @param {{ auth?: string, user?: string, roomCode?: string, sala?: string }} opts
 */
function applyCloudMobileJoinParams(url, opts) {
  const auth = String(opts.auth || '').trim();
  const user = String(opts.user || '').trim().replace(/^@+/, '');
  if (auth) url.searchParams.set('auth', auth);
  if (user) url.searchParams.set('user', user);
  const code = String(opts.roomCode || '').trim();
  if (code) url.searchParams.set('room', code);
  const sala = String(opts.sala || '').trim();
  if (sala) url.searchParams.set('sala', sala);
}

/**
 * @param {{
 *   baseUrl: string,
 *   auth?: string,
 *   user?: string,
 *   roomCode?: string,
 *   sala?: string,
 * }} opts
 */
export function buildCloudMobileJoinUrl(opts) {
  const base = String(opts?.baseUrl || '').trim().replace(/\/+$/, '');
  const auth = String(opts?.auth || '').trim();
  const user = String(opts?.user || '').trim().replace(/^@+/, '');
  if (!base || (!auth && !user)) return '';
  const u = new URL(`${base}/mobile/`);
  applyCloudMobileJoinParams(u, opts);
  return u.toString();
}

/**
 * @param {string} [search] location.search
 * @returns {{ room: string, sala: string, auth: string, user: string }}
 */
export function parseCloudMobileInviteSearch(search) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  return {
    room: String(params.get('room') || '').trim(),
    sala: String(params.get('sala') || '').trim(),
    auth: String(params.get('auth') || '').trim(),
    user: String(params.get('user') || '').trim().replace(/^@+/, ''),
  };
}

/**
 * Permanent home-screen URL (auth + @usuario only).
 * @param {{ baseUrl: string, user?: string, auth?: string }} opts
 */
export function buildCloudMobileBookmarkUrl(opts) {
  return buildCloudMobileJoinUrl({
    baseUrl: opts.baseUrl,
    user: opts.user,
    auth: opts.auth,
  });
}
