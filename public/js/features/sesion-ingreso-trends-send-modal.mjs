import {
  buildLabTrendsPayload,
  defaultSelectedPanelIds,
  listSelectablePanels,
} from '../sesion-ingreso-trends-export.mjs';
import { isCasiopeaTourSendBlocked } from '../tour-guards.mjs';

import { escHtml } from '../dom-escape.mjs';
let rt = {
  showToast() {},
  getHistory() {
    return [];
  },
  getPatientLabel() {
    return '';
  },
  getPatientId() {
    return '';
  },
  sendPayload() {},
};

export function registerSesionIngresoTrendsSendRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(rt, ctx);
}

function getSelectedIds(root) {
  return Array.from(root.querySelectorAll('input[type="checkbox"][data-panel-id]:checked')).map(
    (el) => el.dataset.panelId,
  );
}

function setSelectedIds(root, ids) {
  const set = new Set(ids);
  root.querySelectorAll('input[type="checkbox"][data-panel-id]').forEach((el) => {
    el.checked = set.has(el.dataset.panelId);
  });
  updateSendCount(root);
}

function updateSendCount(root) {
  const n = getSelectedIds(root).length;
  const btn = root.querySelector('#sesion-ingreso-trends-send-confirm');
  if (btn) {
    btn.textContent = n ? `Enviar gráficas (${n})` : 'Enviar gráficas';
    btn.disabled = n === 0;
  }
}

export function openSesionIngresoTrendsSendModal() {
  const history = rt.getHistory();
  if (!history?.length) {
    rt.showToast('No hay historial de laboratorios para tendencias', 'warn');
    return;
  }

  const patientId = rt.getPatientId();
  const panels = listSelectablePanels(history, patientId);
  if (!panels.length) {
    rt.showToast('Se requieren al menos 2 tomas por panel para generar gráficas', 'warn');
    return;
  }

  const backdrop = document.getElementById('sesion-ingreso-trends-send-backdrop');
  const body = document.getElementById('sesion-ingreso-trends-send-body');
  if (!backdrop || !body) return;

  const selected = defaultSelectedPanelIds(panels);
  body.innerHTML = `
    <p class="hint">Selecciona los bloques de gráfica (como en «Gráfica del estudio») a enviar a Neo.</p>
    <div class="sesion-ingreso-send-list">
      ${panels
        .map(
          (item) => `
        <label class="sesion-ingreso-send-item">
          <input type="checkbox" data-panel-id="${escHtml(item.id)}" ${selected.includes(item.id) ? 'checked' : ''} />
          <span>${escHtml(item.sectionLabel)} — ${escHtml(item.title)}</span>
          <small>${item.seriesCount} serie(s)</small>
        </label>`,
        )
        .join('')}
    </div>
    <div class="tend-group-table-actions sesion-ingreso-send-actions">
      <button type="button" class="btn-secondary" id="sesion-ingreso-trends-send-cancel">Cancelar</button>
      <button type="button" class="btn-secondary" id="sesion-ingreso-trends-send-all">Seleccionar todo</button>
      <button type="button" class="btn-primary" id="sesion-ingreso-trends-send-confirm">Enviar gráficas (${selected.length})</button>
    </div>
  `;

  body.querySelector('#sesion-ingreso-trends-send-cancel')?.addEventListener('click', closeSesionIngresoTrendsSendModal);
  body.querySelector('#sesion-ingreso-trends-send-all')?.addEventListener('click', () => {
    setSelectedIds(body, panels.map((p) => p.id));
  });
  body.querySelector('#sesion-ingreso-trends-send-confirm')?.addEventListener('click', () => {
    const ids = getSelectedIds(body);
    if (!ids.length) return;
    if (isCasiopeaTourSendBlocked('trends')) {
      rt.showToast('En el tutorial no se envía a Neo; fuera del tour aquí se abre la app.', 'info');
      closeSesionIngresoTrendsSendModal();
      return;
    }
    const payload = buildLabTrendsPayload(history, rt.getPatientLabel(), {
      panelIds: ids,
      patientId,
    });
    if (!payload.trends?.length) {
      rt.showToast('No hay gráficas para los paneles seleccionados', 'warn');
      return;
    }
    rt.sendPayload(payload);
    closeSesionIngresoTrendsSendModal();
  });
  body.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"][data-panel-id]')) updateSendCount(body);
  });

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

export function closeSesionIngresoTrendsSendModal() {
  const backdrop = document.getElementById('sesion-ingreso-trends-send-backdrop');
  const body = document.getElementById('sesion-ingreso-trends-send-body');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  if (body) body.innerHTML = '';
}
