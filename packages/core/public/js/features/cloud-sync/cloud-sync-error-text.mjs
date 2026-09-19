/**
 * Spanish user-facing sync error text — never expose raw JS exceptions in UI.
 */

export const CLOUD_SYNC_CLIENT_NOT_READY =
  'El enlace con Nube no está listo. Ve a Conexión, confirma tu sala, y si persiste cierra sesión y vuelve a entrar.';

/**
 * @param {string} raw
 */
export function isCloudSyncNetworkErrorMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return false;
  if (/^failed to fetch$/i.test(s) || /networkerror when attempting to fetch/i.test(s)) return true;
  if (/load failed|network request failed/i.test(s)) return true;
  if (/ERR_NETWORK_CHANGED/i.test(s)) return true;
  if (/sin red hacia nube/i.test(s)) return true;
  if (/no hubo respuesta de nube/i.test(s)) return true;
  return false;
}

/**
 * @param {string} raw
 */
export function humanizeCloudSyncErrorMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (isCloudSyncNetworkErrorMessage(s)) {
    if (/no hubo respuesta de nube/i.test(s)) {
      return 'No hubo respuesta de Nube. Revisa la conexión e inténtalo de nuevo.';
    }
    return 'Sin red hacia Nube. Revisa Wi‑Fi / VPN e inténtalo de nuevo.';
  }
  return humanizeTechnicalSyncMessage(s);
}

/**
 * @param {string} raw
 */
export function humanizeTechnicalSyncMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/cliente nube no configurado/i.test(s)) {
    return CLOUD_SYNC_CLIENT_NOT_READY;
  }
  if (/cannot read properties of undefined/i.test(s)) {
    if (/reading 'pull'/i.test(s)) {
      return 'El cliente de Nube no está listo para descargar. Vuelve a Conexión o reinicia R+.';
    }
    if (/reading 'push'/i.test(s)) {
      return 'El cliente de Nube no está listo para enviar. Vuelve a Conexión o reinicia R+.';
    }
    return 'Fallo interno al sincronizar. Reintenta o reinicia R+.';
  }
  if (/cannot read properties of null/i.test(s)) {
    return 'Fallo interno al sincronizar. Reintenta o reinicia R+.';
  }
  if (/is not a function/i.test(s)) {
    return 'El runtime de Nube no está enlazado correctamente. Reconecta en Conexión.';
  }
  if (/^TypeError:|^ReferenceError:/i.test(s)) {
    return 'Fallo interno al sincronizar. Reintenta o reinicia R+.';
  }
  return s;
}

/**
 * @param {unknown} err
 * @param {string} fallback
 */
export function cloudSyncErrorMessage(err, fallback) {
  const data =
    err && typeof err === 'object' ? /** @type {{ data?: { message?: string }, message?: string }} */ (err) : null;
  const raw = String(data?.data?.message || data?.message || fallback).trim() || fallback;
  return humanizeCloudSyncErrorMessage(raw) || fallback;
}
