/**
 * Post-render DOM wiring for Mi rotación (no import from teams-roster.mjs).
 * Loaded dynamically from teams-roster-render after innerHTML is set.
 */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { inferMembershipCycleForJoin } from '../../clinico-access.mjs';
import {
  buildClinicalTeamInviteMessage,
} from '../../clinical-team-invite.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import {
  effectiveClinicalRank,
  hasProgramAdminPrivileges,
} from '../../clinical-privileges.mjs';
import { verifyAdminAccessCode } from '../../../../lib/admin-access-code.mjs';
import {
  dbApi,
  toast,
  currentUserId,
  BROWSE_SALA_LS,
  promptAdminAccessCode,
  isAdminAccessGrantedThisSession,
  markAdminAccessGrantedThisSession,
  rememberAdminAccessCode,
  clearAdminAccessGrant,
} from './shared.mjs';
import { publishClinicalTeamsToLan } from './teams-guardia-bridge.mjs';
import {
  syncCreateTeamCycleField,
  renderClinicalTeamsPanel,
} from './teams-roster-render.mjs';

function syncSalaFieldVisibility() {
  const salaSelect = document.getElementById('clinical-team-create-sala');
  const userSala = String(clinicalSessionContext.user?.sala || '').trim();
  if (salaSelect && userSala && !String(salaSelect.value || '').trim()) {
    salaSelect.value = userSala;
  }
}

function wireAdminCheckboxGate() {
  const cb = document.getElementById('clinical-profile-admin');
  if (!(cb instanceof HTMLInputElement) || cb._rpcAdminGateWired) return;
  cb._rpcAdminGateWired = true;

  const hadAdminOnLoad =
    cb.checked || hasProgramAdminPrivileges(clinicalSessionContext.user);
  if (hadAdminOnLoad) {
    markAdminAccessGrantedThisSession();
  }

  cb.addEventListener('click', (ev) => {
    if (cb.checked) {
      clearAdminAccessGrant();
      return;
    }
    if (isAdminAccessGrantedThisSession()) return;

    ev.preventDefault();
    void promptAdminAccessCode().then((code) => {
      if (code && verifyAdminAccessCode(code)) {
        cb.checked = true;
        rememberAdminAccessCode(code);
        return;
      }
      cb.checked = false;
      if (code != null) toast('Código incorrecto.', 'error');
    });
  });
}

export function wireClinicalTeamsPanelInteractions() {
  syncSalaFieldVisibility();
  wireAdminCheckboxGate();

  const serviceSelect = document.getElementById('clinical-team-create-service');
  if (serviceSelect && !serviceSelect._rpcServiceWired) {
    serviceSelect._rpcServiceWired = true;
    serviceSelect.addEventListener('change', () => {
      syncCreateTeamCycleField();
      syncSalaFieldVisibility();
    });
  }

  const r1LineSelect = document.getElementById('clinical-team-create-r1-line');
  if (r1LineSelect && !r1LineSelect._rpcR1LineWired) {
    r1LineSelect._rpcR1LineWired = true;
    r1LineSelect.addEventListener('change', () => syncCreateTeamCycleField());
  }
}

export function wireBrowseSalaControl(elevated) {
  if (!elevated) return;
  const select = document.getElementById('clinical-browse-sala');
  if (!select || select._rpcBrowseWired) return;
  select._rpcBrowseWired = true;
  select.addEventListener('change', () => {
    try {
      localStorage.setItem(BROWSE_SALA_LS, String(select.value || ''));
    } catch (_e) {}
    void renderClinicalTeamsPanel({ silent: true });
  });
}

export function wireJoinButtons() {
  document.querySelectorAll('.clinical-teams-join-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcJoinWired) return;
    btn._rpcJoinWired = true;
    btn.addEventListener('click', async () => {
      const teamId = String(btn.dataset.teamId || '');
      const userId = currentUserId();
      const api = dbApi();
      if (!api || typeof api.dbClinicalTeamsJoin !== 'function') {
        toast('No se pudo unir al equipo.', 'error');
        return;
      }
      const team = (clinicalSessionContext.teams || []).find(
        (t) => String(t.team_id) === teamId
      );
      const rank = effectiveClinicalRank(clinicalSessionContext.user);
      const cycle = inferMembershipCycleForJoin(team || {}, rank);
      const res = await api.dbClinicalTeamsJoin({
        teamId,
        userId,
        subAreaFraction: cycle,
      });
      if (!res || res.ok === false) {
        toast(res?.error || 'No se pudo unir al equipo.', 'error');
        return;
      }
      toast('Te uniste al equipo.', 'success');
      document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
      void publishClinicalTeamsToLan();
    });
  });
}

export function wireCopyInviteButtons() {
  document.querySelectorAll('.clinical-teams-copy-invite-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcInviteWired) return;
    btn._rpcInviteWired = true;
    btn.addEventListener('click', () => {
      const teamId = String(btn.dataset.teamId || '');
      const team = (clinicalSessionContext.teams || []).find(
        (t) => String(t.team_id) === teamId
      );
      if (!team) {
        toast('Equipo no encontrado.', 'error');
        return;
      }
      const text = buildClinicalTeamInviteMessage(team);
      void copyToClipboardSafe(text).then((ok) => {
        toast(
          ok ? 'Invitación copiada. Pégala en WhatsApp o correo.' : 'No se pudo copiar.',
          ok ? 'success' : 'error'
        );
      });
    });
  });
}

/** Called from render after panel HTML is injected (dynamic import avoids render↔roster cycle). */
export function wireRenderedClinicalTeamsPanel(elevated) {
  wireClinicalTeamsPanelInteractions();
  wireJoinButtons();
  wireCopyInviteButtons();
  wireBrowseSalaControl(elevated);
}
