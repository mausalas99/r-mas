/** Retired LAN host rank policy — no-op stubs. */
export async function syncLanHostClinicalMetaToDisk() {}

export function getLocalLanHostMeta() {
  return { rank: 'R1' };
}
