import { esc } from '../js/dom-escape.mjs';
import { isCloudEquiposMode } from '../lib/equipos/equipos-cloud-mode.mjs';
import { resolveEquiposApiBase } from './host-discovery.mjs';
import { equiposFetch, resizeImageFile } from './equipos-api.mjs';
import { EQUIPOS_ROTACIONES, DEVICE_LABELS, STATUS_LABELS } from './equipos-rotaciones.mjs';
import { initEquiposAdmin, exitEquiposAdmin } from './equipos-admin.mjs';
import {
  registerEquiposServiceWorker,
  enableQueuePush,
  disableQueuePush,
  pushSupported,
} from './equipos-push.mjs';

const TOKEN_KEY = 'rpc-equipos-token';
const NAME_KEY = 'rpc-equipos-name';
const ROT_KEY = 'rpc-equipos-rotation';
const POLL_MS = 30000;

let apiBase = '';
let token = '';
let board = null;
let ws = null;
let pollTimer = null;
let modalEl = null;
/** @type {Set<string>} device types with queue panel expanded */
const openQueueDevices = new Set();

const root = document.getElementById('equipos-app');

function migrateIdentityStorage() {
  for (const key of [NAME_KEY, ROT_KEY, TOKEN_KEY]) {
    if (!localStorage.getItem(key) && sessionStorage.getItem(key)) {
      localStorage.setItem(key, sessionStorage.getItem(key));
    }
  }
}

function identity() {
  return {
    reporterName: localStorage.getItem(NAME_KEY) || '',
    rotation: localStorage.getItem(ROT_KEY) || '',
  };
}

function persistIdentity(name, rotation) {
  if (name) localStorage.setItem(NAME_KEY, name);
  if (rotation) localStorage.setItem(ROT_KEY, rotation);
}

function captureIdentityFromDom() {
  const nameEl = document.getElementById('eq-name');
  const rotEl = document.getElementById('eq-rot');
  if (!nameEl && !rotEl) return;
  persistIdentity(nameEl?.value?.trim() || '', rotEl?.value || '');
}

function wireIdentityPersistence() {
  const nameEl = document.getElementById('eq-name');
  const rotEl = document.getElementById('eq-rot');
  const onName = () => {
    const name = nameEl?.value?.trim() || '';
    if (name) localStorage.setItem(NAME_KEY, name);
  };
  const onRot = () => {
    const rotation = rotEl?.value || '';
    if (rotation) localStorage.setItem(ROT_KEY, rotation);
  };
  nameEl?.addEventListener('input', onName);
  nameEl?.addEventListener('change', onName);
  rotEl?.addEventListener('change', onRot);
}

function showToast(msg) {
  let el = document.querySelector('.equipos-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'equipos-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

function loadToken() {
  const params = new URLSearchParams(window.location.search);
  const t = params.get('t');
  if (t) {
    localStorage.setItem(TOKEN_KEY, t);
    sessionStorage.setItem(TOKEN_KEY, t);
    return t;
  }
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
}

function closeModal() {
  if (modalEl) modalEl.remove();
  modalEl = null;
}

function openModal(title, bodyHtml, onSubmit) {
  closeModal();
  modalEl = document.createElement('div');
  modalEl.className = 'equipos-modal-backdrop';
  modalEl.innerHTML =
    `<div class="equipos-modal" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3>
      ${bodyHtml}
      <div class="equipos-actions" style="margin-top:14px">
        <button type="button" class="equipos-btn secondary" data-act="cancel">Cancelar</button>
        <button type="button" class="equipos-btn" data-act="ok">Confirmar</button>
      </div>
    </div>`;
  document.body.appendChild(modalEl);
  modalEl.querySelector('[data-act="cancel"]').onclick = closeModal;
  modalEl.querySelector('[data-act="ok"]').onclick = () => void onSubmit(modalEl);
}

function wireLumifySkipCharge(modal) {
  const skip = modal.querySelector('#eq-skip-charge');
  const input = modal.querySelector('#eq-pickup-charge');
  if (!skip || !input) return;
  const sync = () => {
    input.disabled = skip.checked;
    if (skip.checked) input.value = '';
  };
  skip.addEventListener('change', sync);
  sync();
}

function parseOptionalChargePct(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 100) return Number.NaN;
  return Math.round(n);
}

function parseRequiredChargePct(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return Number.NaN;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 100) return Number.NaN;
  return Math.round(n);
}

async function readPhotoInput(input) {
  const file = input?.files?.[0];
  if (!file) return null;
  return resizeImageFile(file);
}

function renderLoadError(kind = 'unavailable') {
  if (isCloudEquiposMode()) {
    const copy =
      kind === 'auth'
        ? 'El código de acceso no es válido o está desactivado. Pide un enlace nuevo al R4.'
        : 'No se pudo conectar a la cola de equipos. Revisa tu conexión e inténtalo de nuevo.';
    root.innerHTML =
      `<div class="equipos-error-screen">` +
      `<h2>${kind === 'auth' ? 'Acceso inválido' : 'Servicio no disponible'}</h2>` +
      `<p>${copy}</p></div>`;
    return;
  }
  root.innerHTML =
    `<div class="equipos-error-screen">` +
    `<h2>Sin anfitrión de equipos</h2>` +
    `<p>No se encontró el servidor en la red. Abre R+ en tu Mac y actúa como anfitrión temporal, o conéctate a la sala ⇄.</p>` +
    `</div>`;
}

function renderIdentityForm() {
  const id = identity();
  const opts = EQUIPOS_ROTACIONES.map(
    (r) => `<option value="${esc(r)}" ${id.rotation === r ? 'selected' : ''}>${esc(r)}</option>`
  ).join('');
  return (
    `<div class="equipos-identity">
      <p class="equipos-identity-title">Identificación</p>
      <div><label for="eq-name">Tu nombre</label>
      <input id="eq-name" type="text" value="${esc(id.reporterName)}" autocomplete="name" /></div>
      <div><label for="eq-rot">Rotación</label>
      <select id="eq-rot"><option value="">—</option>${opts}</select></div>
    </div>`
  );
}

function saveIdentityFromDom() {
  const name = document.getElementById('eq-name')?.value?.trim() || '';
  const rotation = document.getElementById('eq-rot')?.value || '';
  if (name.length < 2) {
    showToast('Escribe tu nombre.');
    return false;
  }
  if (!rotation) {
    showToast('Elige tu rotación.');
    return false;
  }
  persistIdentity(name, rotation);
  return true;
}

function renderWaitlistPanel(dev) {
  if (dev.status !== 'in_use') return '';

  const wl = dev.waitlist || [];
  const me = identity();
  const myIndex = wl.findIndex(
    (w) => w.reporter_name === me.reporterName && w.rotation === me.rotation
  );
  const isHolder =
    dev.holder_name === me.reporterName && dev.holder_rotation === me.rotation;
  if (myIndex >= 0) openQueueDevices.add(dev.device_type);
  const isOpen = openQueueDevices.has(dev.device_type);

  const summaryLabel =
    wl.length === 0
      ? 'Cola · vacía'
      : `Cola · ${wl.length} ${wl.length === 1 ? 'persona' : 'personas'}`;

  const listItems = wl.length
    ? wl
        .map(
          (w, i) =>
            `<li class="equipos-queue-item${i === 0 ? ' is-next' : ''}${myIndex === i ? ' is-you' : ''}">
              <span class="equipos-queue-pos">${i + 1}</span>
              <span class="equipos-queue-name">${esc(w.reporter_name)}</span>
              <span class="equipos-queue-rot">${esc(w.rotation)}</span>
            </li>`
        )
        .join('')
    : '<li class="equipos-queue-empty">Nadie en cola todavía.</li>';

  let queueActions = '';
  if (myIndex >= 0) {
    const canSkip = myIndex < wl.length - 1;
    queueActions = `<p class="equipos-queue-you">Tu posición: ${myIndex + 1}</p>
      <div class="equipos-queue-btn-row">
        ${canSkip ? `<button type="button" class="equipos-btn secondary" data-act="skip" data-dev="${dev.device_type}">Ceder turno</button>` : ''}
        <button type="button" class="equipos-btn secondary" data-act="leave" data-dev="${dev.device_type}">Salir de cola</button>
      </div>`;
  } else if (!isHolder) {
    queueActions = `<button type="button" class="equipos-btn secondary" data-act="join" data-dev="${dev.device_type}">Unirse a cola</button>`;
  }

  return (
    `<details class="equipos-queue" data-device="${dev.device_type}"${isOpen ? ' open' : ''}>
      <summary>${summaryLabel}</summary>
      <ol class="equipos-queue-list">${listItems}</ol>
      ${queueActions ? `<div class="equipos-queue-actions">${queueActions}</div>` : ''}
    </details>`
  );
}

function deviceCard(dev) {
  const label = DEVICE_LABELS[dev.device_type] || dev.device_type;
  const status = STATUS_LABELS[dev.status] || dev.status;
  const stale =
    dev.staleHours >= 4 ? '<span class="equipos-chip stale">Cola estancada</span>' : '';
  const holder = dev.holder_name
    ? `En uso: <strong>${esc(dev.holder_name)}</strong> (${esc(dev.holder_rotation)})`
    : 'Nadie lo tiene';
  const prev =
    dev.previous_holder_name
      ? `<br>Anterior: ${esc(dev.previous_holder_name)} (${esc(dev.previous_holder_rotation)})`
      : '';

  let actions = '';
  if (dev.status === 'available') {
    actions += `<button type="button" class="equipos-btn" data-act="checkout" data-dev="${dev.device_type}">Tomar</button>`;
  } else if (dev.status === 'in_use') {
    const me = identity();
    const isHolder =
      dev.holder_name === me.reporterName && dev.holder_rotation === me.rotation;
    if (isHolder) {
      actions += `<button type="button" class="equipos-btn" data-act="return" data-dev="${dev.device_type}">Entregar</button>`;
    }
  }
  actions += `<button type="button" class="equipos-btn warn secondary" data-act="alert" data-dev="${dev.device_type}">Reportar problema</button>`;

  return (
    `<article class="equipos-card" data-device="${dev.device_type}">
      <div class="equipos-card-head">
        <h2>${esc(label)}</h2>
        <span><span class="equipos-chip ${dev.status}">${esc(status)}</span>${stale}</span>
      </div>
      <div class="equipos-meta">${holder}${prev}</div>
      ${renderWaitlistPanel(dev)}
      <div class="equipos-actions">${actions}</div>
    </article>`
  );
}

function renderBoard() {
  if (!board) return;
  captureIdentityFromDom();
  const leaseBadge =
    !isCloudEquiposMode() && board.lease?.mode === 'temporary'
      ? `<p class="equipos-lease-badge">Anfitrión temporal${board.lease.rank ? ` (${esc(board.lease.rank)})` : ''}</p>`
      : '';
  const alerts = (board.alerts || [])
    .map(
      (a) =>
        `<div class="equipos-alert-banner">
          <strong>${a.kind === 'malfunction' ? 'Falla' : 'Material faltante'}</strong> — ${esc(DEVICE_LABELS[a.device_type])}
          ${a.message ? `: ${esc(a.message)}` : ''}
          <div style="margin-top:8px"><button type="button" class="equipos-btn secondary" data-act="ack" data-id="${esc(a.id)}">Entendido</button></div>
        </div>`
    )
    .join('');

  root.innerHTML =
    (leaseBadge ? `<div class="equipos-lease-strip">${leaseBadge}</div>` : '') +
    renderIdentityForm() +
    alerts +
    (board.devices || []).map(deviceCard).join('');

  root.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => void handleAction(btn));
  });

  root.querySelectorAll('details.equipos-queue').forEach((el) => {
    el.addEventListener('toggle', () => {
      const devType = el.getAttribute('data-device');
      if (!devType) return;
      if (el.open) {
        root.querySelectorAll('details.equipos-queue').forEach((other) => {
          if (other === el) return;
          other.open = false;
          const otherType = other.getAttribute('data-device');
          if (otherType) openQueueDevices.delete(otherType);
        });
        openQueueDevices.add(devType);
      } else {
        openQueueDevices.delete(devType);
      }
    });
  });

  wireIdentityPersistence();
}

async function refreshBoard() {
  board = await equiposFetch(apiBase, token, '/board');
  renderBoard();
}

async function handleAction(btn) {
  if (!saveIdentityFromDom()) return;
  const act = btn.getAttribute('data-act');
  const dev = btn.getAttribute('data-dev');
  const id = identity();

  if (act === 'ack') {
    await equiposFetch(apiBase, token, `/alert/${btn.getAttribute('data-id')}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id),
    });
    showToast('Reporte atendido.');
    await refreshBoard();
    return;
  }

  if (act === 'join') {
    openQueueDevices.add(dev);
    await equiposFetch(apiBase, token, '/waitlist/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...id, deviceType: dev }),
    });
    const pushResult = await enableQueuePush({
      apiBase,
      token,
      deviceType: dev,
      reporterName: id.reporterName,
      rotation: id.rotation,
    });
    if (pushResult.ok) {
      showToast('Te uniste a la cola. Notificaciones activadas.');
    } else if (pushResult.reason === 'denied') {
      showToast('En cola. Activa notificaciones en Ajustes para avisos.');
    } else {
      showToast('Te uniste a la cola.');
    }
    await refreshBoard();
    return;
  }

  if (act === 'leave') {
    await disableQueuePush({
      apiBase,
      token,
      deviceType: dev,
      reporterName: id.reporterName,
      rotation: id.rotation,
    });
    await equiposFetch(apiBase, token, '/waitlist/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...id, deviceType: dev }),
    });
    showToast('Saliste de la cola.');
    await refreshBoard();
    return;
  }

  if (act === 'skip') {
    await equiposFetch(apiBase, token, '/waitlist/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...id, deviceType: dev }),
    });
    showToast('Cediste tu turno. Sigues en la cola.');
    await refreshBoard();
    return;
  }

  if (act === 'checkout') {
    const needsPhoto = dev === 'lumify' || dev === 'ekg';
    const lumifyExtra =
      dev === 'lumify'
        ? `<div><label for="eq-pickup-charge">Carga de tablet % (opcional)</label>
           <input type="number" id="eq-pickup-charge" min="0" max="100" inputmode="numeric" placeholder="Ej. 85" />
           <label><input type="checkbox" id="eq-skip-charge" /> Omitir carga</label></div>`
        : '';
    openModal(
      'Tomar dispositivo',
      `${needsPhoto ? '<div><label>Foto al recoger</label><input type="file" accept="image/*" capture="environment" id="eq-photo" /></div>' : ''}${lumifyExtra}`,
      async (modal) => {
        try {
          let pickupChargePct = null;
          if (dev === 'lumify' && !modal.querySelector('#eq-skip-charge')?.checked) {
            pickupChargePct = parseOptionalChargePct(modal.querySelector('#eq-pickup-charge')?.value);
            if (Number.isNaN(pickupChargePct)) {
              showToast('Carga inválida (0–100).');
              return;
            }
          }
          const photoBase64 = needsPhoto
            ? await readPhotoInput(modal.querySelector('#eq-photo'))
            : null;
          if (needsPhoto && !photoBase64) {
            showToast('Se requiere foto.');
            return;
          }
          await equiposFetch(apiBase, token, '/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...id,
              deviceType: dev,
              pickupChargePct,
              photoBase64,
            }),
          });
          closeModal();
          showToast('Dispositivo tomado.');
          await refreshBoard();
        } catch (e) {
          showToast(e.message || 'Error al tomar.');
        }
      }
    );
    wireLumifySkipCharge(modalEl);
    return;
  }

  if (act === 'return') {
    const needsPhoto = dev === 'lumify' || dev === 'ekg';
    const lumifyExtra =
      dev === 'lumify'
        ? `<div><label for="eq-return-charge">Carga de tablet % (obligatoria)</label>
           <input type="number" id="eq-return-charge" min="0" max="100" inputmode="numeric" required placeholder="0–100" />
           <label><input type="checkbox" id="eq-gel-empty" /> Gel vacío</label></div>`
        : '';
    openModal(
      'Entregar dispositivo',
      `${needsPhoto ? '<div><label>Foto al entregar</label><input type="file" accept="image/*" capture="environment" id="eq-photo" /></div>' : ''}${lumifyExtra}`,
      async (modal) => {
        try {
          const photoBase64 = needsPhoto
            ? await readPhotoInput(modal.querySelector('#eq-photo'))
            : null;
          if (needsPhoto && !photoBase64) {
            showToast('Se requiere foto.');
            return;
          }
          const body = { ...id, deviceType: dev, photoBase64 };
          if (dev === 'lumify') {
            const chargePct = parseRequiredChargePct(modal.querySelector('#eq-return-charge')?.value);
            if (Number.isNaN(chargePct)) {
              showToast('Indica la carga de tablet (0–100).');
              return;
            }
            body.chargePct = chargePct;
            body.gelEmpty = !!modal.querySelector('#eq-gel-empty')?.checked;
          }
          await equiposFetch(apiBase, token, '/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          closeModal();
          showToast('Dispositivo entregado.');
          await refreshBoard();
        } catch (e) {
          showToast(e.message || 'Error al entregar.');
        }
      }
    );
    return;
  }

  if (act === 'alert') {
    openModal(
      'Reportar problema',
      `<div><label>Tipo</label>
        <select id="eq-alert-kind"><option value="missing_material">Material faltante</option>
        <option value="malfunction">Falla del dispositivo</option></select></div>
        <div><label>Detalle (opcional)</label><input type="text" id="eq-alert-msg" /></div>
        <div><label>Foto del problema</label><input type="file" accept="image/*" capture="environment" id="eq-alert-photo" /></div>`,
      async (modal) => {
        try {
          const photoBase64 = await readPhotoInput(modal.querySelector('#eq-alert-photo'));
          if (!photoBase64) {
            showToast('Se requiere foto al reportar.');
            return;
          }
          await equiposFetch(apiBase, token, '/alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...id,
              deviceType: dev,
              kind: modal.querySelector('#eq-alert-kind')?.value,
              message: modal.querySelector('#eq-alert-msg')?.value,
              photoBase64,
            }),
          });
          closeModal();
          showToast('Reporte enviado al equipo.');
          await refreshBoard();
        } catch (e) {
          showToast(e.message || 'Error.');
        }
      }
    );
  }
}

function connectWs() {
  if (!apiBase || !token || isCloudEquiposMode()) return;
  const wsUrl =
    apiBase.replace(/^http/, 'ws') + `/api/equipos/v1/ws`;
  ws = new WebSocket(wsUrl);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'board-changed' || msg.type === 'equipos:host-handoff') {
        void refreshBoard();
      }
    } catch (_e) {
      void _e;
    }
  };
  ws.onclose = () => setTimeout(connectWs, 4000);
}

async function syncExistingQueuePushSubscriptions() {
  if (!board || !pushSupported() || Notification.permission !== 'granted') return;
  const me = identity();
  if (!me.reporterName || !me.rotation) return;
  for (const dev of board.devices || []) {
    const wl = dev.waitlist || [];
    const inQueue = wl.some(
      (w) => w.reporter_name === me.reporterName && w.rotation === me.rotation
    );
    if (!inQueue) continue;
    try {
      await enableQueuePush({
        apiBase,
        token,
        deviceType: dev.device_type,
        reporterName: me.reporterName,
        rotation: me.rotation,
      });
    } catch (_e) {
      void _e;
    }
  }
}

async function init() {
  migrateIdentityStorage();

  document.getElementById('equipos-inicio')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    root?.focus({ preventScroll: true });
  });
  window.addEventListener('pagehide', captureIdentityFromDom);

  token = loadToken();
  if (!token) {
    root.innerHTML =
      '<div class="equipos-error-screen">' +
      '<p>Falta el código de acceso. Abre el enlace completo que te compartió tu R4.</p>' +
      '</div>';
    return;
  }
  if (window.history?.replaceState) {
    try {
      const clean = new URL(window.location.href);
      if (clean.searchParams.has('t')) {
        clean.searchParams.delete('t');
        window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
      }
    } catch (_e) {
      void _e;
    }
  }
  root.innerHTML = isCloudEquiposMode()
    ? '<div class="equipos-empty"><p>Cargando cola de equipos…</p></div>'
    : '<div class="equipos-empty"><p>Buscando host de equipos…</p></div>';
  apiBase = await resolveEquiposApiBase();
  if (!apiBase) {
    renderLoadError();
    return;
  }
  try {
    await refreshBoard();
    await syncExistingQueuePushSubscriptions();
    if (pushSupported()) void registerEquiposServiceWorker();
    initEquiposAdmin({
      apiBase,
      token,
      root,
      cloudOnly: isCloudEquiposMode(),
      showToast,
      resumeBoard: () => {
        exitEquiposAdmin();
        void refreshBoard();
      },
    });
    connectWs();
    pollTimer = setInterval(() => void refreshBoard().catch(() => {}), POLL_MS);
  } catch (e) {
    const code = e?.code || '';
    if (code === 'invalid_token' || code === 'auth_required') {
      renderLoadError('auth');
      return;
    }
    root.innerHTML = `<div class="equipos-error-screen"><p>${esc(e.message || 'Error al cargar.')}</p></div>`;
  }
}

void init();
