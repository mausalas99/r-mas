/**
 * LAN host peer probe helpers — extracted from panel.mjs scanLanHosts.
 */

/**
 * @param {string[]} urls
 * @param {string} teamCode
 * @param {{
 *   pingLanHostUrl: (url: string, teamCode: string) => Promise<boolean>,
 *   fetchLanHostRank: (url: string, teamCode: string) => Promise<object|null>,
 *   reactToDiscoveredLanHost?: (url: string, teamCode: string) => Promise<boolean>,
 *   addPeer: (url: string) => void,
 *   pushMeta: (meta: object) => void,
 *   onJoined?: () => void,
 * }} deps
 * @returns {Promise<boolean>} true when discovery short-circuited (host joined)
 */
export async function probeLanPeerUrls_(urls, teamCode, deps) {
  for (var i = 0; i < urls.length; i += 1) {
    var url = urls[i];
    if (!url) continue;
    var alive = await deps.pingLanHostUrl(url, teamCode);
    if (!alive) continue;
    var meta = await deps.fetchLanHostRank(url, teamCode);
    if (meta) deps.pushMeta(meta);
    deps.addPeer(url);
    if (typeof deps.reactToDiscoveredLanHost === 'function') {
      if (await deps.reactToDiscoveredLanHost(url, teamCode)) {
        if (deps.onJoined) deps.onJoined();
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {string[]} scanned
 * @param {string} teamCode
 * @param {{
 *   fetchLanHostRank: (url: string, teamCode: string) => Promise<object|null>,
 *   prefersLanHosting: (meta: object) => boolean,
 *   wsPeerCount: number,
 *   showSplitBrainHint?: (hostUrl: string) => void,
 * }} deps
 * @returns {Promise<{ peerMetas: object[], wardHosts: string[] }>}
 */
export async function collectSubnetScanMetas_(scanned, teamCode, deps) {
  var peerMetas = [];
  var wardHosts = [];
  for (var hi = 0; hi < scanned.length; hi += 1) {
    var peerMeta = await deps.fetchLanHostRank(scanned[hi], teamCode);
    if (!peerMeta) continue;
    peerMetas.push(peerMeta);
    if (deps.prefersLanHosting(peerMeta)) wardHosts.push(scanned[hi]);
  }
  if (wardHosts.length && !deps.wsPeerCount && deps.showSplitBrainHint) {
    deps.showSplitBrainHint(wardHosts[0]);
  }
  return { peerMetas, wardHosts };
}
