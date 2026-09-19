/**
 * Nube ⇄ Interno QR panel — per-sala QR the desktop shows so a phone can scan it,
 * see the sala's vitals board, and enter vitals. The QR carries the sala's access
 * token in the query (sent to the Worker) and a narrow Interno subkey in the URL
 * fragment (`#k=…`, never sent over HTTP) — see docs/superpowers/plans/2026-09-12-interno-qr-vitals-e2ee.md.
 */
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { canManageInternoQr } from '../../clinical-privileges.mjs';
import { clinicalSalaRoomSlug } from '../../../../lib/clinical-salas.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { copyInternoQrImage, downloadInternoQrPng, drawInternoQrCanvas } from '../../interno-qr-render.mjs';
import { getCloudSyncUrl } from './settings.mjs';
import { ensureTurnRoomForSala } from './cloud-clinical-ops-sala.mjs';
import { getCachedRoomDek } from './room-dek.mjs';
import { deriveInternoSubkey, exportDekRaw } from './crypto.mjs';

/** Mirrors INTERNO_SALAS in lib/db/clinical-access-interno.mjs — only these 3 salas support Interno QR today. */
const INTERNO_SALAS = ['Sala 1', 'Sala 2', 'Sala E'];

/** @param {Array<{ sala?: string, access_token?: string, is_active?: number }> | null | undefined} rows */
export function filterInternoSalaRows(rows) {
  const bySala = new Map((rows || []).map((r) => [String(r?.sala || ''), r]));
  return INTERNO_SALAS.map(
    (sala) => bySala.get(sala) || { sala, access_token: '', is_active: 0 }
  );
}

/** @param {{ baseUrl: string, sala: string, token: string, subkeyB64: string }} opts */
export function buildInternoQrUrl({ baseUrl, sala, token, subkeyB64 }) {
  const slug = clinicalSalaRoomSlug(sala);
  if (!baseUrl || !slug || !token || !subkeyB64) return '';
  return (
    String(baseUrl).replace(/\/+$/, '') +
    '/interno/' +
    slug +
    '?t=' +
    encodeURIComponent(token) +
    '#k=' +
    encodeURIComponent(subkeyB64)
  );
}

/**
 * Narrow Interno subkey for a sala's active room — '' if the room has no cached
 * DEK yet (the room owner hasn't connected to Nube on this build since E2EE shipped).
 * @param {string} sala
 */
export async function resolveInternoSubkeyB64(sala) {
  const room = await ensureTurnRoomForSala(sala);
  if (!room?.id) return '';
  const dek = getCachedRoomDek(room.id);
  if (!dek) return '';
  const subkey = await deriveInternoSubkey(dek);
  return exportDekRaw(subkey);
}

function api() {
  if (typeof window === 'undefined') return null;
  return window.electronAPI || null;
}

function currentUserId() {
  return String(clinicalSessionContext.user?.user_id || '');
}

/**
 * @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps
 * @param {HTMLElement} host
 * @param {string} sala
 * @param {string} token
 */
async function mountQrReveal(deps, host, sala, token) {
  host.replaceChildren();
  host.hidden = false;
  const status = document.createElement('p');
  status.className = 'clinical-teams-empty';
  status.textContent = 'Generando QR…';
  host.appendChild(status);

  const subkeyB64 = await resolveInternoSubkeyB64(sala);
  if (!host.isConnected) return;
  if (!subkeyB64) {
    status.textContent = 'Esperando a que el dueño de la sala conecte a Nube.';
    return;
  }
  const url = buildInternoQrUrl({ baseUrl: getCloudSyncUrl(), sala, token, subkeyB64 });
  if (!url) {
    status.textContent = 'No se pudo generar el QR.';
    return;
  }
  host.replaceChildren();

  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Código QR de Interno — ' + sala);
  try {
    drawInternoQrCanvas(canvas, url, { cellPx: 3, margin: 12 });
    host.appendChild(canvas);
  } catch {
    const err = document.createElement('p');
    err.className = 'clinical-teams-empty';
    err.textContent = 'No se pudo dibujar el QR.';
    host.appendChild(err);
  }

  const actions = document.createElement('div');
  actions.className = 'cloud-sync-admin-row-actions';
  actions.style.marginTop = '8px';

  const showToast = function (msg, kind) {
    deps.runtime().showToast(msg, kind);
  };

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.type = 'button';
  copyLinkBtn.className = 'cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact';
  copyLinkBtn.textContent = 'Copiar enlace';
  copyLinkBtn.onclick = function () {
    void copyToClipboardSafe(url).then(function (ok) {
      showToast(ok ? 'Enlace copiado' : 'No se pudo copiar', ok ? 'success' : 'error');
    });
  };
  actions.appendChild(copyLinkBtn);

  const copyImgBtn = document.createElement('button');
  copyImgBtn.type = 'button';
  copyImgBtn.className = 'cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact';
  copyImgBtn.textContent = 'Copiar QR';
  copyImgBtn.onclick = function () {
    void copyInternoQrImage(url, showToast);
  };
  actions.appendChild(copyImgBtn);

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className = 'cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact';
  downloadBtn.textContent = 'Descargar PNG';
  downloadBtn.onclick = function () {
    downloadInternoQrPng(url, 'qr-interno-' + clinicalSalaRoomSlug(sala) + '.png');
  };
  actions.appendChild(downloadBtn);

  host.appendChild(actions);
}

/**
 * @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps
 * @param {{ sala: string, access_token?: string, is_active?: number }} row
 */
function buildInternoSalaRow(deps, row) {
  let token = String(row.access_token || '');
  let active = row.is_active === 1 || row.is_active === true;

  const wrap = document.createElement('div');
  wrap.className = 'cloud-sync-inset-group cloud-interno-qr-row';

  const statusRow = document.createElement('div');
  statusRow.className = 'cloud-sync-inset-row cloud-sync-inset-row--static';
  const text = document.createElement('span');
  text.className = 'cloud-sync-options-entry-text';
  const title = document.createElement('span');
  title.className = 'cloud-sync-options-entry-title';
  title.textContent = row.sala;
  const meta = document.createElement('span');
  meta.className = 'cloud-sync-options-entry-meta';
  meta.textContent = active ? 'Activo' : 'Inactivo';
  text.append(title, meta);
  statusRow.appendChild(text);

  const toggleLabel = document.createElement('label');
  toggleLabel.style.display = 'flex';
  toggleLabel.style.alignItems = 'center';
  toggleLabel.style.gap = '6px';
  toggleLabel.style.fontSize = '13px';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = active;
  toggleLabel.append(toggle, document.createTextNode('Activo'));
  statusRow.appendChild(toggleLabel);
  wrap.appendChild(statusRow);

  const actionsRow = document.createElement('div');
  actionsRow.className = 'cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-admin-row-actions';

  const showQrBtn = document.createElement('button');
  showQrBtn.type = 'button';
  showQrBtn.className = 'cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact';
  showQrBtn.textContent = 'Mostrar QR';

  const rotateBtn = document.createElement('button');
  rotateBtn.type = 'button';
  rotateBtn.className = 'cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact';
  rotateBtn.textContent = 'Rotar token';

  actionsRow.append(showQrBtn, rotateBtn);
  wrap.appendChild(actionsRow);

  const reveal = document.createElement('div');
  reveal.hidden = true;
  reveal.style.padding = '8px 16px 16px';
  reveal.style.display = 'flex';
  reveal.style.flexDirection = 'column';
  reveal.style.alignItems = 'center';
  wrap.appendChild(reveal);

  toggle.onchange = function () {
    const nextActive = toggle.checked;
    const a = api();
    if (!a?.dbInternoAccessSetActive) return;
    void a
      .dbInternoAccessSetActive({ sala: row.sala, active: nextActive, userId: currentUserId() })
      .then(function (res) {
        if (!res?.ok) {
          toggle.checked = !nextActive;
          deps.runtime().showToast('No se pudo cambiar el estado', 'error');
          return;
        }
        active = nextActive;
        meta.textContent = active ? 'Activo' : 'Inactivo';
      })
      .catch(function () {
        toggle.checked = !nextActive;
        deps.runtime().showToast('No se pudo cambiar el estado', 'error');
      });
  };

  showQrBtn.onclick = function () {
    if (!reveal.hidden) {
      reveal.hidden = true;
      return;
    }
    if (!token) {
      deps.runtime().showToast('Rota el token primero', 'error');
      return;
    }
    void mountQrReveal(deps, reveal, row.sala, token);
  };

  rotateBtn.onclick = function () {
    const a = api();
    if (!a?.dbInternoAccessRotate) return;
    void a
      .dbInternoAccessRotate({ sala: row.sala, userId: currentUserId() })
      .then(function (res) {
        if (!res?.ok || !res.row) {
          deps.runtime().showToast('No se pudo rotar el token', 'error');
          return;
        }
        token = String(res.row.access_token || '');
        deps.runtime().showToast('Token rotado', 'success');
        if (!reveal.hidden) void mountQrReveal(deps, reveal, row.sala, token);
      })
      .catch(function () {
        deps.runtime().showToast('No se pudo rotar el token', 'error');
      });
  };

  return wrap;
}

/**
 * @param {HTMLElement | null} host
 * @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps
 */
export function mountInternoQrPanelInHost(host, deps) {
  if (!host) return;
  host.replaceChildren();
  if (!canManageInternoQr(clinicalSessionContext.user)) return;

  const panel = document.createElement('div');
  panel.className = 'cloud-interno-qr-panel';
  const hint = document.createElement('p');
  hint.className = 'lan-connect-card-hint';
  hint.textContent =
    'QR para que los internos de guardia vean la sala y carguen signos vitales desde el celular.';
  panel.appendChild(hint);
  const status = document.createElement('p');
  status.className = 'clinical-teams-empty';
  status.textContent = 'Cargando…';
  panel.appendChild(status);
  host.appendChild(panel);

  const a = api();
  if (!a?.dbInternoAccessList) {
    status.textContent = 'No disponible.';
    return;
  }
  void a
    .dbInternoAccessList({ userId: currentUserId() })
    .then(function (res) {
      if (!host.isConnected) return;
      const rows = filterInternoSalaRows(res?.rows);
      status.remove();
      for (const row of rows) panel.appendChild(buildInternoSalaRow(deps, row));
    })
    .catch(function () {
      if (host.isConnected) status.textContent = 'No se pudo cargar.';
    });
}
