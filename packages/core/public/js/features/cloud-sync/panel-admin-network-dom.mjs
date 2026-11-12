/**
 * The Red tab's imperative DOM edits: filters hide rows by toggling `hidden` on the drawn table, and a
 * lab-verified result rewrites one cell. Kept apart from panel-admin-html.mjs (pure models, importable
 * from Node tests) because the draw helpers come from a .jsx view.
 */
import { getCachedLabVerify } from './lab-verify-cache.mjs';
import { timeAgoLong } from './panel-admin-html.mjs';
import { drawLabsVerifiedCell, drawNetworkEmptyAfter } from './panel-admin-view.jsx';

/** Estado filter: active / archived / inactive (no team activity 7+ days) — read off row attrs. */
function matchesActivityFilter(tr, activity) {
  if (activity === 'active') return tr.getAttribute('data-archived') !== '1';
  if (activity === 'archived') return tr.getAttribute('data-archived') === '1';
  if (activity === 'inactive') return tr.getAttribute('data-inactive') === '1';
  return true;
}

/**
 * Applies the Red tab's sala/team/activity/labs filters by toggling row visibility —
 * no re-fetch, the census HTML already carries every row's `data-sala`,
 * `data-team-id`, `data-archived`. The labs filter reads the same
 * `cloud-sync-admin-row--stale-labs` class the row highlight uses (no labs at
 * all, or a last lab over 6 days old once verified — see
 * `markNetworkRowLabsVerified`), so "stale"/"fresh" always match what's lit up.
 * Safe to call with no filter selects present.
 * @param {HTMLElement} root
 */
export function applyNetworkCensusFilters(root) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel) return;
  const val = (name) => {
    const sel = panel.querySelector('[data-network-filter="' + name + '"]');
    return sel instanceof HTMLSelectElement ? sel.value : '';
  };
  const sala = val('sala');
  const team = val('team');
  const activity = val('activity');
  const labs = val('labs');
  const qEl = panel.querySelector('[data-network-filter="q"]');
  const q = qEl instanceof HTMLInputElement ? qEl.value.trim().toLowerCase() : '';
  panel.querySelectorAll('tbody tr').forEach((tr) => {
    let show = !q || String(tr.getAttribute('data-search') || '').includes(q);
    if (sala && tr.getAttribute('data-sala') !== sala) show = false;
    if (team && tr.getAttribute('data-team-id') !== team) show = false;
    if (activity && !matchesActivityFilter(tr, activity)) show = false;
    const stale = tr.classList.contains('cloud-sync-admin-row--stale-labs');
    if (labs === 'stale' && !stale) show = false;
    if (labs === 'fresh' && stale) show = false;
    tr.hidden = !show;
  });
  const table = panel.querySelector('table');
  panel.querySelector('[data-network-empty]')?.remove();
  if (table && !panel.querySelector('tbody tr:not([hidden])')) {
    drawNetworkEmptyAfter(table);
  }
}

const VERIFIED_STALE_LABS_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Stamps a verified existence result onto a row: `data-no-labs` reflects the
 * live portal check instead of the cloud-sync guess, and the "Últ. labs" cell
 * shows the newest `fechaSolicitud` the portal reported (existence check only,
 * no PDF parse — so no lab values, just the date it was requested). The stale
 * highlight stays lit for no labs at all, or a last lab over 6 days old —
 * archived/incomplete-admission no longer exempt (age alone decides).
 * @param {HTMLTableRowElement} tr @param {boolean} hasStudies
 * @param {string|null} [lastFechaSolicitud]
 */
export function markNetworkRowLabsVerified(tr, hasStudies, lastFechaSolicitud) {
  tr.setAttribute('data-no-labs', hasStudies ? '0' : '1');
  const ageMs = lastFechaSolicitud ? Date.now() - new Date(lastFechaSolicitud).getTime() : NaN;
  const stale = !hasStudies || (Number.isFinite(ageMs) && ageMs > VERIFIED_STALE_LABS_MS);
  tr.classList.toggle('cloud-sync-admin-row--stale-labs', stale);
  const cell = tr.querySelector('td:nth-child(9)');
  if (cell) {
    if (!hasStudies) drawLabsVerifiedCell(cell, 'none');
    else if (lastFechaSolicitud) drawLabsVerifiedCell(cell, 'ago', timeAgoLong(lastFechaSolicitud));
    else drawLabsVerifiedCell(cell, 'has');
  }
}

/**
 * Restores any cached "Verificar labs" result onto freshly rendered rows —
 * keeps the verified state visible across a Red census reload, before
 * `autoVerifyStaleNetworkLabs` (panel-admin-labs-verify.mjs) re-checks stale ones.
 * @param {HTMLElement} root
 */
export function applyCachedLabVerifications(root) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel) return;
  panel.querySelectorAll('tbody tr').forEach((tr) => {
    const patientId = tr.querySelector('input[data-network-select]')?.getAttribute('data-patient-id') || '';
    const cached = patientId ? getCachedLabVerify(patientId) : null;
    if (cached) markNetworkRowLabsVerified(/** @type {HTMLTableRowElement} */ (tr), cached.hasStudies, cached.lastFechaSolicitud);
  });
}
