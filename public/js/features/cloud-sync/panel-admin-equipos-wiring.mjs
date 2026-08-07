import { setSelectAllVisibleEquipos } from './panel-admin-equipos-bulk.mjs';

/** @param {Element | null} target @param {string} selector */
function closestSelect(target, selector) {
  const el = target?.closest(selector);
  return el instanceof HTMLSelectElement ? el : null;
}

/** @param {Element | null} target */
function closestTeamSelect(target) {
  return closestSelect(target, '.cloud-sync-admin-equipos-team');
}

/** @param {Element | null} target @param {{
 *   applyFilters: () => void,
 *   syncAllTeams: () => void,
 * }} ctx */
function handleToolbarSalaChange(target, ctx) {
  if (!closestSelect(target, '[data-admin-equipos-sala]')) return false;
  ctx.applyFilters();
  ctx.syncAllTeams();
  return true;
}

/** @param {Element | null} target @param {{ applyFilters: () => void }} ctx */
function handleToolbarFilterChange(target, ctx) {
  if (!closestSelect(target, '[data-admin-equipos-activity], [data-admin-equipos-team-status]')) {
    return false;
  }
  ctx.applyFilters();
  return true;
}

/**
 * @param {Element | null} target
 * @param {{
 *   applyFilters: () => void,
 *   syncTeamRow: (row: HTMLElement) => void,
 *   readRowSala: (row: HTMLElement) => string,
 * }} ctx
 */
function handleUserSalaChange(target, ctx) {
  const userSalaSel = closestSelect(target, '.cloud-sync-admin-equipos-user-sala');
  if (!userSalaSel) return false;
  const row = userSalaSel.closest('.cloud-sync-admin-equipos-row');
  if (!(row instanceof HTMLElement)) return true;
  row.setAttribute('data-sala', ctx.readRowSala(row));
  ctx.syncTeamRow(row);
  ctx.applyFilters();
  return true;
}

/**
 * @param {Element | null} target
 * @param {{
 *   syncCycle: (teamSelect: HTMLSelectElement) => void,
 *   readRowRank: (row: HTMLElement) => string,
 * }} ctx
 */
function handleRankChange(target, ctx) {
  const rankSel = closestSelect(target, '.cloud-sync-admin-equipos-rank');
  if (!rankSel) return false;
  const row = rankSel.closest('.cloud-sync-admin-equipos-row');
  if (row instanceof HTMLElement) row.setAttribute('data-user-rank', ctx.readRowRank(row));
  const teamSelect = row?.querySelector('.cloud-sync-admin-equipos-team');
  if (teamSelect instanceof HTMLSelectElement) ctx.syncCycle(teamSelect);
  return true;
}

/**
 * @param {Event} ev
 * @param {{
 *   root: HTMLElement,
 *   syncCycle: (teamSelect: HTMLSelectElement) => void,
 *   applyFilters: () => void,
 *   syncAllTeams: () => void,
 *   syncTeamRow: (row: HTMLElement) => void,
 *   readRowSala: (row: HTMLElement) => string,
 *   readRowRank: (row: HTMLElement) => string,
 * }} ctx
 */
export function handleEquiposPanelChange(ev, ctx) {
  const target = ev.target instanceof Element ? ev.target : null;
  const teamSel = closestTeamSelect(target);
  if (teamSel) {
    ctx.syncCycle(teamSel);
    return;
  }
  if (handleToolbarSalaChange(target, ctx)) return;
  if (handleToolbarFilterChange(target, ctx)) return;
  if (handleUserSalaChange(target, ctx)) return;
  if (handleRankChange(target, ctx)) return;

  const selectAll = target?.closest('[data-admin-equipos-select-all]');
  if (selectAll instanceof HTMLInputElement) {
    setSelectAllVisibleEquipos(ctx.root, selectAll.checked);
  }
}

/**
 * @param {HTMLElement} root
 * @param {{ teamsCache: object[], initRow: (row: HTMLElement) => void }} ctx
 */
export function handleEquiposPanelLoaded(root, ctx) {
  const list = root.querySelector('[data-admin-equipos-list]');
  list?.querySelectorAll('.cloud-sync-admin-equipos-row').forEach((row) => {
    if (row instanceof HTMLElement) ctx.initRow(row);
  });
  const master = root.querySelector('[data-admin-equipos-select-all]');
  if (master instanceof HTMLInputElement) master.checked = false;
}
