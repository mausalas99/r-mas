/**
 * Nube fields inside Configura tu rotación.
 */
import { escapeHtml } from '../dom-escape.mjs';
import { isCloudSala, normalizeCloudSala } from './cloud-sync/sala-allowlist.mjs';
import { isCloudSalaUpgradePending } from './cloud-sync/cloud-sala-upgrade.mjs';
import { getCloudSyncUrl } from './cloud-sync/settings.mjs';

export function shouldShowNubePasswordField(sala) {
  return isCloudSala(sala);
}

export function buildNubePasswordFieldHtml(prefilledSala) {
  const show = shouldShowNubePasswordField(prefilledSala);
  const upgrade = isCloudSalaUpgradePending();
  return (
    '<div class="field-group clinical-onboard-nube-field" id="onboard-nube-field" ' +
    (show ? '' : 'hidden') +
    '>' +
    '<label for="onboard-nube-password">Contraseña Nube *</label>' +
    '<input id="onboard-nube-password" type="password" class="profile-input" ' +
    'autocomplete="new-password" minlength="10" ' +
    (show ? 'required' : '') +
    ' placeholder="mín. 10 caracteres">' +
    '<p class="clinical-teams-hint">' +
    (upgrade
      ? 'Tu rotación ahora es Sala/Torre: crea tu cuenta Nube con esta contraseña (misma @usuario).'
      : 'Obligatoria en <strong>Sala</strong> / <strong>Torre HU</strong>. URL: ') +
    (upgrade ? '' : escapeHtml(getCloudSyncUrl())) +
    '</p>' +
    '<p id="onboard-nube-status" class="clinical-teams-hint" aria-live="polite"></p>' +
    '</div>'
  );
}

/** Show/hide Nube + shift-PIN fields from sala select. */
export function syncOnboardingNubeVisibility(root = document) {
  const salaEl = root.querySelector?.('#onboard-sala') || document.getElementById('onboard-sala');
  const nube = root.querySelector?.('#onboard-nube-field') || document.getElementById('onboard-nube-field');
  const pinGroup = document.getElementById('onboard-shift-pin')?.closest('.field-group');
  const sala = normalizeCloudSala(salaEl?.value || '');
  const cloud = isCloudSala(sala);
  if (nube) {
    nube.hidden = !cloud;
    const pass = nube.querySelector('#onboard-nube-password');
    if (pass) {
      if (cloud) pass.setAttribute('required', '');
      else pass.removeAttribute('required');
    }
  }
  if (pinGroup) pinGroup.hidden = cloud;
}

export function readOnboardingNubeFields(root = document) {
  const pass = root.querySelector?.('#onboard-nube-password') || document.getElementById('onboard-nube-password');
  return {
    password: String(pass?.value || ''),
    mode: 'register',
  };
}
