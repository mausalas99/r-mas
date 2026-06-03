/**
 * R4 / program admin panel: QR internos por sala (colapsable, carga bajo demanda).
 */
import { copyInternoQrImage } from '../interno-qr-render.mjs';

const SALA_DEFS = [
  { key: 'Sala 1', slug: 'sala-1' },
  { key: 'Sala 2', slug: 'sala-2' },
  { key: 'Sala E', slug: 'sala-e' },
];

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {string} hostBase */
function normalizeHostBase(hostBase) {
  const base = String(hostBase || '')
    .trim()
    .replace(/\/+$/, '');
  if (base) return base;
  return 'http://127.0.0.1:3738';
}

/** @param {string} sala @param {string} slug @param {string} token @param {string} hostBase */
function internoUrl(sala, slug, token, hostBase) {
  const host = normalizeHostBase(hostBase);
  return `${host}/interno/${slug}?t=${encodeURIComponent(token)}&sala=${encodeURIComponent(sala)}`;
}

function isLocalOnlyHost(base) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(String(base || '').trim());
}

async function resolveHostBase(fallback) {
  if (typeof window !== 'undefined' && window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      const u = String((await window.electronAPI.getLanCandidateBaseUrl()) || '')
        .trim()
        .replace(/\/+$/, '');
      if (u && !isLocalOnlyHost(u)) return u;
    } catch (_e) {
      /* ignore */
    }
  }
  const fb = normalizeHostBase(fallback);
  if (!isLocalOnlyHost(fb)) return fb;
  return fb;
}

/**
 * @param {HTMLElement} root
 * @param {{ hostBaseUrl?: string, userId?: string, showToast?: (msg: string, kind?: string) => void }} opts
 */
export async function appendInternoQrPanel(root, opts = {}) {
  const api = dbApi();
  const userId = String(opts.userId || '');
  if (!api || !userId || typeof api.dbInternoAccessList !== 'function') return;

  const details = document.createElement('details');
  details.className = 'lan-connect-card lan-hub-interno-details';

  const summary = document.createElement('summary');
  summary.className = 'lan-hub-interno-summary';
  summary.innerHTML =
    '<span class="lan-connect-card-title">QR Internos (MIP)</span>' +
    '<span class="lan-connect-card-hint lan-hub-interno-summary-hint">Celulares pregrado · config. única</span>';
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'lan-hub-interno-body';
  body.hidden = true;
  details.appendChild(body);

  root.appendChild(details);

  const showToast = typeof opts.showToast === 'function' ? opts.showToast : () => {};
  let hostBase = normalizeHostBase(opts.hostBaseUrl);
  let loaded = false;

  async function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    body.hidden = false;
    await renderPanel(body);
  }

  details.addEventListener('toggle', () => {
    if (details.open) void ensureLoaded();
  });

  async function loadRows() {
    const res = await api.dbInternoAccessList({ userId });
    if (!res || !res.ok) return null;
    return Array.isArray(res.rows) ? res.rows : [];
  }

  async function renderPanel(card) {
    hostBase = await resolveHostBase(opts.hostBaseUrl || hostBase);
    card.querySelectorAll('.interno-sala-block, .lan-connect-card-hint, .interno-qr-lan-warn').forEach((el) => el.remove());

    if (isLocalOnlyHost(hostBase)) {
      const warn = document.createElement('div');
      warn.className = 'interno-qr-lan-warn lan-connect-card-hint';
      warn.style.cssText = 'margin:0 0 10px;padding:8px 10px;border-radius:8px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;';
      warn.innerHTML =
        '<strong>Sin IP de red local.</strong> Conecta la Mac a Wi‑Fi/Ethernet y pulsa «Actualizar IP». ' +
        'El celular no puede usar 127.0.0.1.';
      card.appendChild(warn);

      const refreshBtn = document.createElement('button');
      refreshBtn.type = 'button';
      refreshBtn.className = 'btn-lan-secondary';
      refreshBtn.style.cssText = 'font-size:12px;margin-bottom:8px;';
      refreshBtn.textContent = 'Actualizar IP';
      refreshBtn.onclick = () => {
        opts.hostBaseUrl = '';
        void renderPanel(card);
      };
      card.appendChild(refreshBtn);
    } else {
      const ok = document.createElement('p');
      ok.className = 'lan-connect-card-hint interno-qr-lan-warn';
      ok.textContent = `Host LAN: ${hostBase}`;
      card.appendChild(ok);
    }

    const rows = await loadRows();
    if (rows === null) {
      card.innerHTML = '<p class="lan-connect-card-hint">No se pudo cargar acceso interno.</p>';
      return;
    }
    const bySala = new Map(rows.map((r) => [String(r.sala), r]));

    for (const def of SALA_DEFS) {
      const row = bySala.get(def.key) || {};
      const active = row.is_active === 1;
      const token = String(row.access_token || '');
      const url = token ? internoUrl(def.key, def.slug, token, hostBase) : '';

      const block = document.createElement('div');
      block.className = 'interno-sala-block';
      block.style.marginTop = '12px';
      block.style.paddingTop = '12px';
      block.style.borderTop = '1px solid var(--border, rgba(128,128,128,0.25))';

      block.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <strong>${def.key}</strong>
        <span class="lan-connect-card-hint" style="margin:0">${active ? 'Activo' : 'Inactivo'}</span>
      </div>`;

      if (url) {
        const link = document.createElement('p');
        link.className = 'lan-connect-card-hint';
        link.style.wordBreak = 'break-all';
        link.style.fontSize = '11px';
        link.textContent = url;
        block.appendChild(link);
      }

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.flexWrap = 'wrap';
      btnRow.style.gap = '6px';
      btnRow.style.marginTop = '6px';

      const mkBtn = (label, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-lan-secondary';
        b.style.fontSize = '12px';
        b.textContent = label;
        b.onclick = () => void fn();
        return b;
      };

      btnRow.appendChild(
        mkBtn(active ? 'Desactivar' : 'Activar', async () => {
          const r = await api.dbInternoAccessSetActive({
            userId,
            sala: def.key,
            active: !active,
          });
          if (r?.ok) {
            showToast(active ? 'Acceso interno desactivado' : 'Acceso interno activado', 'success');
            await renderPanel(body);
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
            showToast('Token regenerado — copia el QR de nuevo', 'success');
            await renderPanel(body);
          } else {
            showToast(r?.error || 'Error', 'error');
          }
        })
      );

      if (url) {
        btnRow.appendChild(
          mkBtn('Copiar enlace', async () => {
            if (isLocalOnlyHost(hostBase)) {
              showToast('Primero obtén la IP LAN (Actualizar IP)', 'error');
              return;
            }
            try {
              await navigator.clipboard.writeText(url);
              showToast('Enlace copiado', 'success');
            } catch (_e) {
              showToast('No se pudo copiar', 'error');
            }
          })
        );

        btnRow.appendChild(
          mkBtn('Copiar QR', () => {
            if (isLocalOnlyHost(hostBase)) {
              showToast('Primero obtén la IP LAN (Actualizar IP)', 'error');
              return;
            }
            void copyInternoQrImage(url, showToast);
          })
        );
      }

      block.appendChild(btnRow);
      card.appendChild(block);
    }
  }
}
