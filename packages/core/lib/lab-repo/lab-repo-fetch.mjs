import { runLabRepoFetch, runLabRepoCheck } from './fetch-run.mjs';

/**
 * @param {{ registro?: string, desde?: Date | string, hasta?: Date | string }} payload
 */
export async function fetchLabRepoStudies(payload) {
  const registro = String(payload?.registro || '').trim();
  if (!registro) throw new Error('lab-repo-missing-registro');
  if (!payload?.desde || !payload?.hasta) {
    throw new Error('lab-repo-missing-range');
  }

  return runLabRepoFetch({
    registro,
    desde: payload.desde,
    hasta: payload.hasta,
  });
}

/**
 * Existence-only check for the Red admin tab's "Sin labs" filter — does this
 * registro have any study in the portal at all, no date range, no parse.
 * @param {{ registro?: string }} payload
 */
export async function checkLabRepoHasStudies(payload) {
  const registro = String(payload?.registro || '').trim();
  if (!registro) throw new Error('lab-repo-missing-registro');
  return runLabRepoCheck({ registro });
}
