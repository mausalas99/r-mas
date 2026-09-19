/**
 * Nube ⇄ iPad / R+ Móvil invite card (cloud room deep link + QR).
 */
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { buildCloudMobileJoinUrl } from '../cloud-mobile/invite-url.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
} from './settings.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { copyInternoQrImage, drawInternoQrCanvas } from '../../interno-qr-render.mjs';

/** @deprecated Collapsible state key — kept for sessionStorage cleanup only. */
export const CLOUD_INVITE_MOBILE_OPEN_KEY = 'rpc-cloud-invite-mobile-open';

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

/** @returns {string} */
function resolveCloudMobileInviteUrl() {
  const auth = getCloudSyncToken();
  if (!auth) return '';

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
  return buildCloudMobileJoinUrl({
    baseUrl: getCloudSyncUrl(),
    auth,
    user: user || undefined,
  });
}

/**
 * Dedicated mobile subview — content only (modal header already titles the screen).
 * @param {HTMLElement} body
 * @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps
 * @param {string} url
 */
function fillCloudMobileInviteBody(body, deps, url) {
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
}

/** @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps @param {HTMLElement} root */
export function appendCloudMobileInviteCard(deps, root) {
  if (!root) return;
  const url = resolveCloudMobileInviteUrl();
  if (!url) return;
  fillCloudMobileInviteBody(root, deps, url);
}

/** @param {HTMLElement | null} host @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps */
export function mountCloudMobileInviteInHost(host, deps) {
  if (!host) return;
  host.replaceChildren();
  const panel = document.createElement('div');
  panel.className =
    'cloud-mobile-invite-panel lan-invite-collapsible--mobile lan-invite-collapsible--cloud';
  appendCloudMobileInviteCard(deps, panel);
  if (panel.childElementCount) host.appendChild(panel);
}
