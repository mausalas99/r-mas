import { esc } from '../../dom-escape.mjs';
import { adminErrorHtml } from './panel-admin-html.mjs';
import { renderEquiposUserRow } from './panel-admin-equipos-row-html.mjs';

export {
  CLINICAL_RANK_OPTIONS,
  rankSelectOptionsHtml,
  userSalaSelectOptionsHtml,
  renderEquiposAssignTeamOptionsHtml,
  cycleOptionsForTeam,
} from './panel-admin-equipos-html-fields.mjs';

export function equiposShellHtml() {
  return (
    '<div class="cloud-sync-admin-panel-head">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-equipos">Actualizar</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="seed-agosto-2026-equipos" title="Censo agosto 2026">Equipos ago 2026</button></div>' +
    '<p class="cloud-sync-hint cloud-sync-admin-equipos-hint">Usuarios clínicos + cuenta Nube. Marca → Sala / rango / equipo / ciclo → <strong>Guardar</strong> o <strong>Quitar seleccionados</strong>. En filas con Nube usa <strong>Restablecer clave</strong>; abre <strong>Nube</strong> para rol y sesiones. Los filtros no quitan las marcas.</p>' +
    '<div class="cloud-sync-admin-toolbar cloud-sync-admin-equipos-toolbar">' +
    '<input type="search" class="profile-input" data-admin-equipos-search placeholder="Buscar @usuario o nombre" />' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-sala">Sala</label>' +
    '<select id="cloud-admin-equipos-sala" class="profile-input" data-admin-equipos-sala>' +
    '<option value="">Todas</option></select>' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-activity">Uso</label>' +
    '<select id="cloud-admin-equipos-activity" class="profile-input" data-admin-equipos-activity>' +
    '<option value="all">Todos</option>' +
    '<option value="has">Con última actividad</option>' +
    '<option value="none" selected>Sin última actividad</option></select>' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-team-status">Equipo</label>' +
    '<select id="cloud-admin-equipos-team-status" class="profile-input" data-admin-equipos-team-status>' +
    '<option value="all">Todos</option>' +
    '<option value="unassigned" selected>Sin equipo</option>' +
    '<option value="assigned">Con equipo</option></select></div>' +
    '<div class="cloud-sync-admin-equipos-bulk">' +
    '<label class="cloud-sync-admin-equipos-select-all-label">' +
    '<input type="checkbox" class="cloud-sync-admin-equipos-check" data-admin-equipos-select-all /> Seleccionar visibles</label>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-btn--compact" data-admin-action="save-equipos-bulk">Guardar seleccionados</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="purge-equipos-bulk" title="Elimina cuentas Nube y/o perfiles clínicos de los marcados">Quitar seleccionados</button></div>' +
    '<div data-admin-equipos-list><p class="cloud-sync-hint">Cargando usuarios y equipos…</p></div>'
  );
}

/** @param {string[]} salas */
export function equiposSalaOptionsHtml(salas) {
  const opts = (salas || [])
    .map((s) => '<option value="' + esc(String(s)) + '">' + esc(String(s)) + '</option>')
    .join('');
  return '<option value="">Todas las salas</option>' + opts;
}

/** @param {object[]} rows @param {object[]} teams */
export function equiposListHtml(rows, teams) {
  if (!rows.length) {
    return '<p class="cloud-sync-hint">No hay usuarios Nube ni perfiles clínicos locales para asignar.</p>';
  }
  const cards = rows.map((row) => renderEquiposUserRow(row, teams)).join('');
  return '<div class="cloud-sync-admin-equipos-list">' + cards + '</div>';
}

export { adminErrorHtml };
