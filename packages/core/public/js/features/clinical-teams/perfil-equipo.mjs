/**
 * Mi perfil: Equipo pills under the Sala card. A sala filter row on top, the
 * sala's teams below. Tapping a team you can join joins it.
 */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { CLINICAL_SALAS, currentUserId, dbApi, escapeAttr, escapeHtml } from './shared.mjs';

const ALL = '__all__';
let filter = '';
let teams = [];

function render(host) {
  const home = String(clinicalSessionContext.user?.sala || '').trim();
  if (!filter) filter = home || ALL;
  const shown = teams.filter((t) => filter === ALL || String(t.sala || '') === filter);
  const mine = teams.find((t) => t.isMember);
  const chip = (v, label) =>
    `<button type="button" class="settings-perfil-chip settings-perfil-chip--sm" data-perfil-equipo-filter="${escapeAttr(v)}" aria-pressed="${filter === v}">${escapeHtml(label)}</button>`;
  const pills = shown
    .map((t) => {
      const off = !t.isMember && !t.joinEligible;
      const title = off && t.joinReason ? ` title="${escapeAttr(t.joinReason)}"` : '';
      return `<button type="button" class="settings-perfil-chip settings-perfil-chip--team" data-perfil-equipo-team="${escapeAttr(t.team_id)}" aria-pressed="${!!t.isMember}"${off ? ' disabled' : ''}${title}>${escapeHtml(String(t.name || 'Equipo').trim())}</button>`;
    })
    .join('');
  host.innerHTML = `
    <section class="settings-perfil-sala settings-perfil-equipo">
      <div class="settings-perfil-equipo-head">
        <span class="settings-perfil-sala-title">Equipo</span>
        <span class="settings-perfil-sala-current">${escapeHtml(mine ? String(mine.name || 'Equipo').trim() : 'Sin equipo')}</span>
      </div>
      <div class="settings-perfil-equipo-filter" role="group" aria-label="Filtrar por sala">
        ${chip(ALL, 'Todas')}${CLINICAL_SALAS.map((s) => chip(s, s)).join('')}
      </div>
      ${pills ? `<div class="settings-perfil-equipo-grid" role="group" aria-label="Equipo">${pills}</div>` : '<p class="settings-acc-hint settings-acc-hint--tight">Sin equipos en esta sala.</p>'}
      <div class="settings-perfil-chips">
        <button type="button" class="settings-perfil-chip settings-perfil-chip--add" data-perfil-equipo-open>+ Crear equipo</button>
        <button type="button" class="settings-perfil-chip settings-perfil-chip--add" data-perfil-equipo-open>Tengo un código</button>
      </div>
    </section>`;
}

async function load(host) {
  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalTeamsListBySala !== 'function') {
    host.innerHTML = '';
    return;
  }
  const res = await api.dbClinicalTeamsListBySala({ sala: '', forUserId: userId, allSalas: true });
  teams = res?.ok && Array.isArray(res.teams) ? res.teams : [];
  render(host);
}

/** @param {HTMLElement | null} host */
export async function mountPerfilEquipo(host) {
  if (!(host instanceof HTMLElement)) return;
  if (!host.dataset.equipoWired) {
    host.dataset.equipoWired = '1';
    host.addEventListener('click', async (ev) => {
      const el = ev.target instanceof Element ? ev.target : null;
      const f = el?.closest('[data-perfil-equipo-filter]');
      if (f) {
        filter = f.getAttribute('data-perfil-equipo-filter') || ALL;
        render(host);
        return;
      }
      if (el?.closest('[data-perfil-equipo-open]')) {
        const { openClinicalTeamsPanel } = await import('./teams-roster-shell.mjs');
        await openClinicalTeamsPanel();
        return;
      }
      const t = el?.closest('[data-perfil-equipo-team]');
      if (!(t instanceof HTMLButtonElement) || t.disabled || t.getAttribute('aria-pressed') === 'true') return;
      const { joinClinicalTeamByButton } = await import('./teams-roster-interactions.mjs');
      await joinClinicalTeamByButton(t.getAttribute('data-perfil-equipo-team') || '');
    });
    document.addEventListener('rpc-clinical-teams-changed', () => {
      if (host.isConnected) void load(host);
    });
  }
  await load(host);
}
