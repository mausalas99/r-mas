/**
 * @param {{
 *   visible?: number,
 *   total?: number,
 *   overview?: { counts?: { users?: number, members?: number } } | null,
 *   salaFilter?: string,
 *   rooms?: Array<{ sala?: string, memberCount?: number }>,
 * }} opts
 */
export function equiposFilterSummaryText(opts = {}) {
  const visible = Number(opts.visible ?? 0);
  const total = Number(opts.total ?? 0);
  const salaFilter = String(opts.salaFilter || '').trim();
  const cloudUsers = opts.overview?.counts?.users;
  const cloudMembers = opts.overview?.counts?.members;
  const rooms = Array.isArray(opts.rooms) ? opts.rooms : [];

  const parts = [`Mostrando ${visible} de ${total} usuarios`];
  if (cloudUsers != null) {
    parts.push(`${cloudUsers} cuentas Nube`);
  }
  if (salaFilter) {
    const salaMembers = rooms
      .filter((room) => String(room.sala || '').trim() === salaFilter)
      .reduce((sum, room) => sum + Number(room.memberCount || 0), 0);
    parts.push(`${salaMembers} membresías Nube en ${salaFilter}`);
  } else if (cloudMembers != null) {
    parts.push(`${cloudMembers} membresías Nube en salas`);
  }
  return parts.join(' · ');
}

/** @param {HTMLElement} root @param {Parameters<typeof equiposFilterSummaryText>[0]} opts */
export function paintEquiposFilterSummary(root, opts) {
  const el = root.querySelector('[data-admin-equipos-summary]');
  if (!(el instanceof HTMLElement)) return;
  el.textContent = equiposFilterSummaryText(opts);
}

/** @param {HTMLElement} host */
export function countVisibleEquiposRows(host) {
  const rows = [...host.querySelectorAll('.cloud-sync-admin-equipos-row')].filter(
    (row) => row instanceof HTMLElement
  );
  return {
    visible: rows.filter((row) => !row.hidden).length,
    total: rows.length,
  };
}
