/**
 * Nube ⇄ iPad / R+ Móvil invite card (cloud room deep link + QR).
 */
import { readRpcSettings } from '../../clinical-settings.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { buildCloudMobileJoinUrl } from '../cloud-mobile/invite-url.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
} from './settings.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { copyInternoQrImage } from '../../interno-qr-render.mjs';

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
      const raw = readRpcSettings();
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
 * Dedicated mobile subview — content only (modal header already titles the screen). Empty when there is no
 * Nube session to build the link from.
 * @param {HTMLElement | null} host
 * @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps
 */
export async function mountCloudMobileInviteInHost(host, deps) {
  if (!host) return;
  const url = resolveCloudMobileInviteUrl();
  const { drawInviteCard } = await import('./panel-mobile-invite-view.jsx');
  drawInviteCard(host, url && {
    url,
    onCopyLink() {
      void copyCloudMobileLinkFromUi(deps, url);
    },
    onCopyQr() {
      void copyInternoQrImage(url, function (msg, kind) {
        deps.runtime().showToast(msg, kind);
      });
    },
  });
}
