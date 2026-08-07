/**
 * Nube ⇄ QR Internos (MIP) — cloud Worker URLs (no LAN :3738).
 */
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { CLINICAL_SALA_VALUES, clinicalSalaRoomSlug } from '../../../../lib/clinical-salas.mjs';
import { copyInternoQrImage, downloadInternoQrPng, drawInternoQrCanvas } from '../../interno-qr-render.mjs';
import { getCloudSyncUrl } from './settings.mjs';
import { pushInternoAccessToCloud } from './interno-access-sync.mjs';
import { getClinicalUserUserId } from './panel-clinical-context.mjs';

export const CLOUD_INTERNO_QR_OPEN_KEY = 'rpc-cloud-interno-qr-open';

const SALA_DEFS = CLINICAL_SALA_VALUES.map((key) => ({
  key,
  slug: clinicalSalaRoomSlug(key),
}));

/**
 * @param {string} sala
 * @param {string} token
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildInternoNubeUrl(sala, token, baseUrl) {
  const slug = clinicalSalaRoomSlug(sala);
  const base = String(baseUrl ?? getCloudSyncUrl())
    .trim()
    .replace(/\/+$/, '');
  const t = String(token || '').trim();
  if (!base || !slug || !t) return '';
  return `${base}/interno/${slug}?t=${encodeURIComponent(t)}`;
}

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {string} label @param {() => void | Promise<void>} fn */
function mkBtn(label, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-lan-secondary';
  b.style.fontSize = '12px';
  b.textContent = label;
  b.onclick = () => void fn();
  return b;
}

/** @param {HTMLElement} host @param {string} url */
function mountInternoQrPreview(host, url) {
  if (!host || !url) return;
  host.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'cloud-interno-qr-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Código QR de acceso interno MIP');
  try {
    drawInternoQrCanvas(canvas, url, { cellPx: 2, margin: 10 });
    host.appendChild(canvas);
    host.removeAttribute('aria-hidden');
  } catch {
    host.setAttribute('aria-hidden', 'true');
  }
}

/**
 * @param {HTMLElement} root
 * @param {{ title: string, subtitle?: string, openKey: string, fill: (body: HTMLElement) => void }} opts
 */
function appendInternoNubeCollapsible(root, opts) {
  const details = document.createElement('details');
  details.className =
    'rpc-disclosure lan-invite-collapsible lan-hub-interno-details lan-hub-interno-details--nube';
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
    'rpc-disclosure__summary rpc-disclosure__summary--stacked lan-settings-card-summary lan-hub-interno-summary';
  sum.innerHTML =
    '<span class="settings-card__title">' + opts.title + '</span>' +
    (opts.subtitle ? '<span class="settings-card__desc">' + opts.subtitle + '</span>' : '');
  details.appendChild(sum);
  const body = document.createElement('div');
  body.className = 'rpc-disclosure__body lan-hub-interno-body lan-invite-collapsible-body';
  opts.fill(body, details);
  details.appendChild(body);
  root.appendChild(details);
}

/**
 * @param {object} ctx
 * @param {{ key: string, slug: string }} def
 * @param {object} row
 * @param {string} url
 * @param {boolean} active
 */
function buildInternoSalaActionButtons(ctx, def, url, active) {
  const { api, userId, showToast, rerender } = ctx;
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.flexWrap = 'wrap';
  btnRow.style.gap = '6px';
  btnRow.style.marginTop = '6px';

  btnRow.appendChild(
    mkBtn(active ? 'Desactivar' : 'Activar', async () => {
      const r = await api.dbInternoAccessSetActive({ userId, sala: def.key, active: !active });
      if (r?.ok) {
        void pushInternoAccessToCloud(def.key, r.row).catch(() => {});
        showToast(active ? 'Acceso interno desactivado' : 'Acceso interno activado', 'success');
        await rerender();
      } else {
        showToast(r?.error || 'Error', 'error');
      }
    })
  );

  btnRow.appendChild(
    mkBtn('Regenerar token', async () => {
      if (!confirm(`¿Regenerar QR de ${def.key}? El enlace anterior dejará de funcionar.`)) return;
      const r = await api.dbInternoAccessRotate({ userId, sala: def.key });
      if (r?.ok) {
        void pushInternoAccessToCloud(def.key, r.row).catch(() => {});
        showToast('Token regenerado — copia el QR de nuevo', 'success');
        await rerender();
      } else {
        showToast(r?.error || 'Error', 'error');
      }
    })
  );

  if (!url) return btnRow;

  btnRow.appendChild(
    mkBtn('Copiar enlace', async () => {
      const ok = await copyToClipboardSafe(url);
      showToast(ok ? 'Enlace copiado' : 'No se pudo copiar', ok ? 'success' : 'error');
    })
  );
  btnRow.appendChild(
    mkBtn('Copiar QR', () => {
      void copyInternoQrImage(url, showToast);
    })
  );
  btnRow.appendChild(
    mkBtn('Descargar QR', () => {
      const slug = def.slug || def.key.toLowerCase().replace(/\s+/g, '-');
      downloadInternoQrPng(url, `qr-interno-${slug}.png`);
      showToast('QR descargado en alta resolución.', 'success');
    })
  );
  return btnRow;
}

/**
 * @param {object} ctx
 * @param {{ key: string, slug: string }} def
 * @param {object} row
 */
function appendSalaInternoNubeBlock(ctx, def, row) {
  const { card } = ctx;
  const active = row.is_active === 1;
  const token = String(row.access_token || '');
  const url = token ? buildInternoNubeUrl(def.key, token) : '';

  const block = document.createElement('div');
  block.className = 'interno-sala-block';
  block.style.marginTop = '12px';
  block.style.paddingTop = '12px';
  block.style.borderTop = '1px solid var(--border, rgba(128,128,128,0.25))';
  block.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
    '<strong>' +
    def.key +
    '</strong>' +
    '<span class="lan-connect-card-hint" style="margin:0">' +
    (active ? 'Activo' : 'Inactivo') +
    '</span></div>';

  if (url) {
    const link = document.createElement('p');
    link.className = 'lan-connect-card-hint';
    link.style.wordBreak = 'break-all';
    link.style.fontSize = '11px';
    link.textContent = url;
    block.appendChild(link);

    const qrHost = document.createElement('div');
    qrHost.className = 'cloud-interno-qr-host';
    qrHost.style.marginTop = '8px';
    qrHost.style.display = 'flex';
    qrHost.style.justifyContent = 'center';
    mountInternoQrPreview(qrHost, url);
    block.appendChild(qrHost);
  }

  block.appendChild(buildInternoSalaActionButtons(ctx, def, url, active));
  card.appendChild(block);
}

/** @param {{ runtime: () => { showToast: (msg: string, kind?: string) => void } }} deps @param {HTMLElement} root */
export function appendInternoNubeQrPanel(deps, root) {
  if (!root) return;
  const api = dbApi();
  const userId = getClinicalUserUserId();
  if (!api || !userId || typeof api.dbInternoAccessList !== 'function') return;

  const showToast = function (msg, kind) {
    deps.runtime().showToast(msg, kind);
  };

  appendInternoNubeCollapsible(root, {
    title: 'QR Internos (MIP)',
    subtitle: 'Celulares pregrado · Nube',
    openKey: CLOUD_INTERNO_QR_OPEN_KEY,
    fill: function (body, details) {
      const hint = document.createElement('p');
      hint.className = 'lan-connect-card-hint';
      hint.style.margin = '0 0 8px';
      hint.textContent =
        'Enlace Nube para internos de pregrado. Escanea o comparte el QR; no requiere LAN ni IP local.';
      body.appendChild(hint);

      let loaded = false;

      async function loadRows() {
        const res = await api.dbInternoAccessList({ userId });
        if (!res || !res.ok) return null;
        return Array.isArray(res.rows) ? res.rows : [];
      }

      async function renderPanel(card) {
        card.querySelectorAll('.interno-sala-block').forEach((el) => el.remove());
        const rows = await loadRows();
        if (rows === null) {
          const err = document.createElement('p');
          err.className = 'lan-connect-card-hint';
          err.textContent = 'No se pudo cargar acceso interno.';
          card.appendChild(err);
          return;
        }
        const bySala = new Map(rows.map((r) => [String(r.sala), r]));
        const ctx = {
          api,
          userId,
          showToast,
          card,
          rerender: () => renderPanel(body),
        };
        for (const def of SALA_DEFS) {
          appendSalaInternoNubeBlock(ctx, def, bySala.get(def.key) || {});
        }
      }

      async function ensureLoaded() {
        if (loaded) return;
        loaded = true;
        await renderPanel(body);
      }

      details.addEventListener('toggle', () => {
        if (details.open) void ensureLoaded();
      });
      if (details.open) void ensureLoaded();
    },
  });
}
