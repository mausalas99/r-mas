import { runLabRepoFetch, runLabRepoCheck } from './fetch-run.mjs';

/**
 * Portal address resolution order — the address itself never lives in this
 * repo: (1) `payload.portalUrl`, saved by the user in Ajustes → Laboratorio
 * (renderer, local settings), (2) `RPLUS_LAB_PORTAL_URL` env var read here in
 * the main process. Neither set → the caller must prompt for it instead of
 * hitting the network.
 * @param {{ portalUrl?: string }} payload
 */
function resolveLabRepoBaseUrl(payload) {
  const fromPayload = String(payload?.portalUrl || '').trim();
  if (fromPayload) return fromPayload;
  return String(process.env.RPLUS_LAB_PORTAL_URL || '').trim();
}

/**
 * @param {{ registro?: string, desde?: Date | string, hasta?: Date | string, portalUrl?: string }} payload
 */
export async function fetchLabRepoStudies(payload) {
  const registro = String(payload?.registro || '').trim();
  if (!registro) throw new Error('lab-repo-missing-registro');
  if (!payload?.desde || !payload?.hasta) {
    throw new Error('lab-repo-missing-range');
  }
  const baseUrl = resolveLabRepoBaseUrl(payload);
  if (!baseUrl) throw new Error('lab-repo-missing-portal-url');

  return runLabRepoFetch({
    registro,
    desde: payload.desde,
    hasta: payload.hasta,
    baseUrl,
  });
}

/**
 * Existence-only check for the Red admin tab's "Sin labs" filter — does this
 * registro have any study in the portal at all, no date range, no parse.
 * @param {{ registro?: string, portalUrl?: string }} payload
 */
export async function checkLabRepoHasStudies(payload) {
  const registro = String(payload?.registro || '').trim();
  if (!registro) throw new Error('lab-repo-missing-registro');
  const baseUrl = resolveLabRepoBaseUrl(payload);
  if (!baseUrl) throw new Error('lab-repo-missing-portal-url');
  return runLabRepoCheck({ registro, baseUrl });
}
