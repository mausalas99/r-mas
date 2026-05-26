import {
  buildSesionPayload,
  defaultSelectedIds,
  listSelectableTables,
} from '../sesion-ingreso-export.mjs';
import { closeLabSomeTablesModal } from './lab-some-tables-modal.mjs';
import { isCasiopeaTourSendBlocked } from '../tour-guards.mjs';

let rt = {
  showToast() {},
  getParsed() {
    return null;
  },
  getPatientLabel() {
    return '';
  },
  getReportDate() {
    return '';
  },
  sendPayload() {},
};

export function registerSesionIngresoSendRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSelectedIds(root) {
  return Array.from(root.querySelectorAll('input[type="checkbox"][data-table-id]:checked')).map(
    (el) => el.dataset.tableId,
  );
}

function setSelectedIds(root, ids) {
  const set = new Set(ids);
  root.querySelectorAll('input[type="checkbox"][data-table-id]').forEach((el) => {
    el.checked = set.has(el.dataset.tableId);
  });
  updateSendCount(root);
}

function updateSendCount(root) {
  const n = getSelectedIds(root).length;
  const btn = root.querySelector('#sesion-ingreso-send-confirm');
  if (btn) {
    btn.textContent = n ? `Enviar (${n})` : 'Enviar';
    btn.disabled = n === 0;
  }
}

export function openSesionIngresoSendModal() {
  const parsed = rt.getParsed();
  const reportDate = rt.getReportDate();
  closeLabSomeTablesModal();
  const items = listSelectableTables(parsed, { reportDate });
  if (!items.length) {
    rt.showToast('No hay tablas SOME para enviar', 'warn');
    return;
  }

  const backdrop = document.getElementById('sesion-ingreso-send-backdrop');
  const body = document.getElementById('sesion-ingreso-send-body');
  if (!backdrop || !body) return;

  const selected = defaultSelectedIds(items);
  body.innerHTML = `
    <p class="hint">Marca los estudios a enviar al paso <strong>Paraclínicos</strong> que tengas seleccionado en Neo.</p>
    <div class="sesion-ingreso-send-list">
      ${items
        .map(
          (item) => `
        <label class="sesion-ingreso-send-item">
          <input type="checkbox" data-table-id="${escHtml(item.id)}" ${selected.includes(item.id) ? 'checked' : ''} />
          <span>${escHtml(item.tabTitle)}</span>
          <small>${item.rowCount} fila(s)${item.isAdmission ? ' · Al ingreso' : ''}</small>
        </label>`,
        )
        .join('')}
    </div>
    <div class="tend-group-table-actions sesion-ingreso-send-actions">
      <button type="button" class="btn-secondary" id="sesion-ingreso-send-cancel">Cancelar</button>
      <button type="button" class="btn-primary" id="sesion-ingreso-send-confirm">Enviar (${selected.length})</button>
    </div>
  `;

  body.querySelector('#sesion-ingreso-send-cancel')?.addEventListener('click', closeSesionIngresoSendModal);
  body.querySelector('#sesion-ingreso-send-confirm')?.addEventListener('click', () => {
    const ids = getSelectedIds(body);
    if (!ids.length) return;
    if (isCasiopeaTourSendBlocked('lab')) {
      closeSesionIngresoSendModal();
      return;
    }
    const payload = buildSesionPayload(ids, parsed, rt.getPatientLabel(), { reportDate });
    rt.sendPayload(payload);
    closeSesionIngresoSendModal();
  });
  body.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"][data-table-id]')) updateSendCount(body);
  });

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

export function closeSesionIngresoSendModal() {
  const backdrop = document.getElementById('sesion-ingreso-send-backdrop');
  const body = document.getElementById('sesion-ingreso-send-body');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  if (body) body.innerHTML = '';
}
