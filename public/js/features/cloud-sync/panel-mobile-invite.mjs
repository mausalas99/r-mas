/**
 * Nube ⇄ iPad / R+ Móvil invite card (cloud room deep link + QR).
 */
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { buildCloudMobileJoinUrl } from '../cloud-mobile/invite-url.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  getCloudSyncRoomSnapshot,
} from './settings.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { copyInternoQrImage, drawInternoQrCanvas } from '../../interno-qr-render.mjs';

export const CLOUD_INVITE_MOBILE_OPEN_KEY = 'rpc-cloud-invite-mobile-open';

/**
 * @param {HTMLElement} root
 * @param {{ title: string, subtitle?: string, openKey: string, extraClass?: string, fill: (body: HTMLElement) => void }} opts
 */
function appendCloudMobileInviteCollapsible(root, opts) {
  const details = document.createElement('details');
  details.className =
    'rpc-disclosure lan-invite-collapsible lan-hub-invite-card ' + String(opts.extraClass || '');
  try {
    details.open = sessionStorage.getItem(opts.openKey) === '1';
  } catch (_e) {
    void _e;
  }
  details.addEventListener('toggle', function () {
    try {
      sessionStorage.setItem(opts.openKey, details.open ? '1' : '0');
    } catch (_e) {
      void _e;
    }
  });
  const sum = document.createElement('summary');
  sum.className =
    'rpc-disclosure__summary rpc-disclosure__summary--stacked lan-settings-card-summary';
  sum.innerHTML =
    '<span class="settings-card__title">' + opts.title + '</span>' +
    (opts.subtitle ? '<span class="settings-card__desc">' + opts.subtitle + '</span>' : '');
  details.appendChild(sum);
  const body = document.createElement('div');
  body.className = 'rpc-disclosure__body lan-invite-collapsible-body';
  opts.fill(body);
  details.appendChild(body);
  root.appendChild(details);
}

/** @param {HTMLElement} host @param {string} url */
function mountCloudMobileQrPreview(host, url) {
  if (!host || !url) return;
  host.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'cloud-mobile-invite-qr-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Código QR del enlace móvil Nube');
  try {
    drawInternoQrCanvas(canvas, url, { cellPx: 2, margin: 10 });
    host.appendChild(canvas);
    host.removeAttribute('aria-hidden');
  } catch {
    host.setAttribute('aria-hidden', 'true');
  }
}

/**
 * @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps
 * @param {string} url
 */
async function copyCloudMobileLinkFromUi(deps, url) {
  const copied = await copyToClipboardSafe(url);
  if (copied) {
    deps.runtime().showToast(
      'Enlace móvil (Nube) copiado. Ábrelo en Safari, espera a sincronizar, luego Añadir a pantalla de inicio.',
      'success'
    );
    return true;
  }
  deps.runtime().showToast('No se pudo copiar al portapapeles.', 'error');
  return false;
}

/** @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps @param {HTMLElement} root */
export function appendCloudMobileInviteCard(deps, root) {
  if (!root) return;

  const auth = getCloudSyncToken();
  if (!auth) return;

  let user = String(
    clinicalSessionContext.user?.username ||
      clinicalSessionContext.user?.user_id ||
      ''
  )
    .trim()
    .replace(/^@+/, '');
  if (!user) {
    try {
      const raw = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
      user = String(raw.clinicalUsername || '').trim().replace(/^@+/, '');
    } catch {
      /* ignore */
    }
  }
  const url = buildCloudMobileJoinUrl({
    baseUrl: getCloudSyncUrl(),
    auth,
    user: user || undefined,
  });
  if (!url) return;

  appendCloudMobileInviteCollapsible(root, {
    title: 'iPad / R+ Móvil (Nube)',
    subtitle: 'Emparejar dispositivo',
    openKey: CLOUD_INVITE_MOBILE_OPEN_KEY,
    extraClass: 'lan-invite-collapsible--mobile lan-invite-collapsible--cloud lan-hub-invite-card--mobile',
    fill: function (body) {
      const hint = document.createElement('p');
      hint.className = 'lan-connect-card-hint';
      hint.style.margin = '0 0 8px';
      hint.innerHTML =
        'Enlace <strong>permanente</strong> ligado a <strong>tu @usuario</strong>. ' +
        'No cambia con la rotación — el iPad entra a tu sala nube activa. ' +
        'Ábrelo en Safari → <strong>Añadir a pantalla de inicio</strong>.';
      body.appendChild(hint);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-lan-primary';
      copyBtn.style.width = '100%';
      copyBtn.textContent = 'Copiar enlace móvil (Nube)';
      copyBtn.onclick = function () {
        void copyCloudMobileLinkFromUi(deps, url);
      };
      body.appendChild(copyBtn);

      const qrRow = document.createElement('div');
      qrRow.className = 'lan-connect-actions-row';
      qrRow.style.marginTop = '8px';
      const copyQrBtn = document.createElement('button');
      copyQrBtn.type = 'button';
      copyQrBtn.className = 'btn-lan-secondary';
      copyQrBtn.style.flex = '1';
      copyQrBtn.textContent = 'Copiar QR';
      copyQrBtn.onclick = function () {
        void copyInternoQrImage(url, function (msg, kind) {
          deps.runtime().showToast(msg, kind);
        });
      };
      qrRow.appendChild(copyQrBtn);
      body.appendChild(qrRow);

      const qrHost = document.createElement('div');
      qrHost.className = 'cloud-mobile-invite-qr-host';
      qrHost.style.marginTop = '8px';
      qrHost.style.display = 'flex';
      qrHost.style.justifyContent = 'center';
      mountCloudMobileQrPreview(qrHost, url);
      body.appendChild(qrHost);
    },
  });
}

/** @param {HTMLElement | null} host @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps */
export function mountCloudMobileInviteInHost(host, deps) {
  if (!host) return;
  host.replaceChildren();
  appendCloudMobileInviteCard(deps, host);
}
