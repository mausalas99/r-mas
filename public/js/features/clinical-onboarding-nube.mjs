/**
 * Nube fields + cutover picker inside Configura tu rotación.
 */
import { escapeHtml, escapeAttr } from '../dom-escape.mjs';
import { isCloudSala, normalizeCloudSala } from './cloud-sync/sala-allowlist.mjs';
import { loadCutoverSnapshot } from './cloud-sync/cutover-snapshot.mjs';
import { isCutoverPending } from './cloud-sync/cutover-flags.mjs';
import { isCloudSalaUpgradePending } from './cloud-sync/cloud-sala-upgrade.mjs';
import { getCloudSyncUrl } from './cloud-sync/settings.mjs';

export function shouldShowNubePasswordField(sala) {
  return isCloudSala(sala);
}

export function buildCutoverPickerHtml() {
  if (!isCutoverPending()) return '';
  const snap = loadCutoverSnapshot();
  const users = Array.isArray(snap?.users) ? snap.users : [];
  if (!users.length) {
    return '<p class="clinical-teams-hint clinical-onboard-cutover-hint">No había usuarios guardados en la captura. Crea uno nuevo abajo.</p>';
  }
  const items = users
    .map((u) => {
      const un = escapeAttr(u.username || '');
      return (
        '<li><button type="button" class="cloud-sync-cutover-pick clinical-onboard-cutover-pick" ' +
        'data-onboard-pick-user="' +
        un +
        '" data-display="' +
        escapeAttr(u.displayName || '') +
        '" data-rank="' +
        escapeAttr(u.rank || 'R1') +
        '" data-sala="' +
        escapeAttr(u.sala || '') +
        '">' +
        '<span class="cloud-sync-cutover-pick-user">@' +
        escapeHtml(u.username || '') +
        '</span>' +
        '<span class="cloud-sync-cutover-pick-meta">' +
        escapeHtml(u.displayName || '—') +
        ' · ' +
        escapeHtml(u.rank || '') +
        ' · ' +
        escapeHtml(u.sala || '') +
        '</span></button></li>'
      );
    })
    .join('');
  return (
    '<div class="clinical-onboard-cutover-block">' +
    '<p class="clinical-onboard-cutover-lead">Usuarios anteriores en este equipo — pulsa uno para rellenarlo:</p>' +
    '<ul class="cloud-sync-cutover-list clinical-onboard-cutover-list">' +
    items +
    '</ul></div>'
  );
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
      ? 'Tu rotación ahora es Sala/Torre: crea o entra a Nube con esta contraseña (misma @usuario).'
      : 'Obligatoria en <strong>Sala</strong> / <strong>Torre HU</strong>. URL: ') +
    (upgrade ? '' : escapeHtml(getCloudSyncUrl())) +
    '</p>' +
    '<div class="clinical-onboard-nube-mode">' +
    '<label class="clinical-onboard-nube-radio"><input type="radio" name="onboard-nube-mode" value="register" checked> Crear cuenta</label>' +
    '<label class="clinical-onboard-nube-radio"><input type="radio" name="onboard-nube-mode" value="login"> Ya tengo cuenta</label>' +
    '</div>' +
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
  const modeEl =
    root.querySelector?.('input[name="onboard-nube-mode"]:checked') ||
    document.querySelector('input[name="onboard-nube-mode"]:checked');
  return {
    password: String(pass?.value || ''),
    mode: modeEl?.value === 'login' ? 'login' : 'register',
  };
}

export function applyOnboardPickUser(btn) {
  if (!(btn instanceof HTMLElement)) return;
  const username = btn.getAttribute('data-onboard-pick-user') || '';
  const display = btn.getAttribute('data-display') || '';
  const rank = btn.getAttribute('data-rank') || 'R1';
  const sala = btn.getAttribute('data-sala') || '';
  const u = document.getElementById('onboard-username');
  const n = document.getElementById('onboard-clinical-name');
  const r = document.getElementById('onboard-rank');
  const s = document.getElementById('onboard-sala');
  if (u) u.value = username;
  if (n) n.value = display;
  if (r && rank) r.value = rank;
  if (s && sala) {
    const opt = [...s.options].find((o) => o.value === sala || o.value.includes(sala.split(' ')[0]));
    if (opt) s.value = opt.value;
    else if ([...s.options].some((o) => o.value === sala)) s.value = sala;
  }
  syncOnboardingNubeVisibility();
}
