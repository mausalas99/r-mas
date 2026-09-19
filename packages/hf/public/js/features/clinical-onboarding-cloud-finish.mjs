/**
 * After LAN profile save: Nube register + cutover patient claim.
 */
import { isCloudSala } from './cloud-sync/sala-allowlist.mjs';
import { registerCloudDuringOnboarding } from './cloud-sync/register-during-onboarding.mjs';
import { isCutoverPending, setCutoverFlag } from './cloud-sync/cutover-flags.mjs';
import { loadCutoverSnapshot } from './cloud-sync/cutover-snapshot.mjs';
import { claimPatientsToTeam, filterSnapshotPatients } from './cloud-sync/cutover-claim.mjs';
import {
  clearCloudSalaUpgradePending,
  isCloudSalaUpgradePending,
} from './cloud-sync/cloud-sala-upgrade.mjs';
import { readOnboardingNubeFields } from './clinical-onboarding-nube.mjs';

/**
 * @param {{
 *   username: string,
 *   name: string,
 *   sala: string,
 *   toast: (msg: string, kind?: string) => void,
 *   showError: (msg: string) => void,
 * }} ctx
 * @returns {Promise<boolean>}
 */
export async function finishOnboardingCloudAndCutover(ctx) {
  const sala = ctx.sala;
  const needsCloud = isCloudSala(sala) || isCloudSalaUpgradePending();
  if (needsCloud && isCloudSala(sala)) {
    const { password, mode } = readOnboardingNubeFields();
    const statusEl = document.getElementById('onboard-nube-status');
    const setStatus = (t) => {
      if (statusEl) statusEl.textContent = t;
    };
    const out = await registerCloudDuringOnboarding({
      mode,
      username: ctx.username,
      displayName: ctx.name,
      sala,
      password,
      // Desktop onboarding is personal-device by default (same as Recuérdame).
      remember: true,
      toast: ctx.toast,
      setStatus,
    });
    if (!out.ok) {
      ctx.showError(out.error || 'No se pudo conectar Nube.');
      return false;
    }
  }

  if (isCutoverPending()) {
    await claimCutoverPatients(ctx.username, ctx.toast);
    setCutoverFlag('done');
  }
  clearCloudSalaUpgradePending();
  return true;
}

async function claimCutoverPatients(username, toast) {
  const snap = loadCutoverSnapshot();
  if (!snap) return;
  const patients = filterSnapshotPatients(snap, { username });
  const byTeam = new Map();
  for (const p of patients) {
    const tid = String(p.teamId || '').trim();
    if (!tid) continue;
    if (!byTeam.has(tid)) byTeam.set(tid, []);
    byTeam.get(tid).push(p.id);
  }
  let claimed = 0;
  for (const [teamId, ids] of byTeam) {
    const out = await claimPatientsToTeam(ids, teamId);
    claimed += out.claimed;
  }
  if (claimed > 0) toast('Pacientes reclamados: ' + claimed, 'success');
}
