/**
 * 7.9 cutover wizard: pick/create user → team → claim patients → Nube sync.
 */
import { loadCutoverSnapshot } from './cutover-snapshot.mjs';
import { claimPatientsToTeam } from './cutover-claim.mjs';
import { setCutoverFlag } from './cutover-flags.mjs';
import { bodyForStep, cutoverShellHtml } from './panel-cutover-html.mjs';
import { applyIdentityFromForm } from './panel-cutover-identity.mjs';
import { ensureTeamMembership } from './panel-cutover-team.mjs';
import { syncCloudCutover } from './panel-cutover-cloud.mjs';

const ROOT_ID = 'cloud-sync-cutover-root';

function toast(msg, kind) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, kind || 'info');
  }
}

/**
 * @param {HTMLElement} host
 * @param {{ onDone?: () => void }} [opts]
 */
export function mountCutoverPanel(host, opts = {}) {
  const snapshot = loadCutoverSnapshot() || { users: [], teams: [], patients: [] };
  const state = {
    chosenUser: null,
    chosenTeam: null,
    step: 0,
  };

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.className = 'cloud-sync-cutover';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'cloud-sync-cutover-title');

  function render() {
    root.innerHTML = cutoverShellHtml(
      state.step,
      bodyForStep(state.step, {
        snapshot,
        chosenUser: state.chosenUser,
        chosenTeam: state.chosenTeam,
      })
    );
  }

  function finishCutover() {
    setCutoverFlag('done');
    state.step = 5;
    render();
  }

  function close() {
    setCutoverFlag('done');
    host.textContent = '';
    root.remove();
    opts.onDone?.();
  }

  async function runClaim() {
    if (!state.chosenTeam?.teamId) {
      state.step = 4;
      render();
      return;
    }
    const boxes = root.querySelectorAll('[data-cutover-patient]:checked');
    const ids = [...boxes].map((el) => el.getAttribute('data-cutover-patient')).filter(Boolean);
    const result = await claimPatientsToTeam(ids, state.chosenTeam.teamId);
    toast('Pacientes reclamados: ' + result.claimed, result.errors.length ? 'info' : 'success');
    state.step = 4;
    render();
  }

  bindCutoverClicks(root, {
    snapshot,
    state,
    render,
    finishCutover,
    close,
    runClaim,
  });

  host.textContent = '';
  host.appendChild(root);
  render();
  return { root, refresh: render };
}

function bindCutoverClicks(root, ctx) {
  root.addEventListener('click', (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    if (handlePickUser(t, ctx)) return;
    if (handlePickTeam(t, ctx)) return;
    const actionBtn = t.closest('[data-cutover-action]');
    if (!actionBtn) return;
    void runCutoverAction(actionBtn.getAttribute('data-cutover-action'), ctx, root);
  });
}

function handlePickUser(t, ctx) {
  const pickUser = t.closest('[data-cutover-pick-user]');
  if (!pickUser) return false;
  const un = pickUser.getAttribute('data-cutover-pick-user');
  const u = (ctx.snapshot.users || []).find((x) => x.username === un);
  if (u) {
    ctx.state.chosenUser = {
      username: u.username,
      displayName: u.displayName,
      rank: u.rank,
      sala: u.sala,
    };
    ctx.render();
  }
  return true;
}

function handlePickTeam(t, ctx) {
  const pickTeam = t.closest('[data-cutover-pick-team]');
  if (!pickTeam) return false;
  const tid = pickTeam.getAttribute('data-cutover-pick-team');
  const tm = (ctx.snapshot.teams || []).find((x) => x.teamId === tid);
  if (tm) {
    ctx.state.chosenTeam = { teamId: tm.teamId, name: tm.name, sala: tm.sala };
    ctx.render();
  }
  return true;
}

async function runCutoverAction(action, ctx, root) {
  const { state, render, finishCutover, close, runClaim } = ctx;
  if (action === 'next') {
    state.step = 1;
    render();
    return;
  }
  if (action === 'back') {
    state.step = Math.max(0, state.step - 1);
    render();
    return;
  }
  if (action === 'identity-next') {
    const user = await applyIdentityFromForm(root, toast);
    if (!user) return;
    state.chosenUser = user;
    state.step = 2;
    render();
    return;
  }
  if (action === 'skip-team') {
    state.chosenTeam = null;
    state.step = 3;
    render();
    return;
  }
  if (action === 'team-next') {
    const out = await ensureTeamMembership(state.chosenTeam, state.chosenUser, toast);
    if (!out.ok) return;
    state.chosenTeam = out.team;
    state.step = 3;
    render();
    return;
  }
  if (action === 'claim') {
    await runClaim();
    return;
  }
  if (action === 'finish-lan') {
    finishCutover();
    return;
  }
  if (action === 'cloud-register' || action === 'cloud-login') {
    await syncCloudCutover({
      root,
      mode: action === 'cloud-login' ? 'login' : 'register',
      chosenUser: state.chosenUser,
      toast,
      onSuccess: finishCutover,
    });
    return;
  }
  if (action === 'close') close();
}

/** @returns {HTMLElement} */
export function ensureCutoverHost() {
  let host = document.getElementById('cloud-sync-cutover-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'cloud-sync-cutover-host';
    host.className = 'cloud-sync-cutover-host';
    document.body.appendChild(host);
  }
  return host;
}
