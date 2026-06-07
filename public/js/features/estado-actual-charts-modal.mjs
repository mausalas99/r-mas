import { loadChartJs } from '../vendor-loader.mjs';
import { destroyEstadoActualCharts, renderEstadoActualCharts } from './estado-actual-charts.mjs';

/** @type {{ getPatient(): { monitoreo?: unknown } | null, showToast(msg: string, type?: string): void }} */
let rt = {
  getPatient() {
    return null;
  },
  showToast() {},
};

var dismissWired = false;

export function registerEstadoActualChartsModalRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function getBackdrop() {
  return document.getElementById('ea-charts-backdrop');
}

function getMount() {
  return document.getElementById('ea-charts-modal-mount');
}

export function closeEstadoActualChartsModal() {
  var backdrop = getBackdrop();
  var mount = getMount();
  if (mount) destroyEstadoActualCharts(mount);
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('ea-charts-modal-open');
}

export function openEstadoActualChartsModal() {
  var backdrop = getBackdrop();
  if (!backdrop) {
    rt.showToast('Gráficas de monitoreo no disponibles', 'error');
    return;
  }
  var patient = rt.getPatient();
  if (!patient || !patient.monitoreo) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var mount = getMount();
  if (mount) {
    mount.innerHTML = '<p class="ea-muted ea-charts-loading">Cargando gráficas…</p>';
  }
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('ea-charts-modal-open');

  void loadChartJs()
    .then(function (Chart) {
      if (!mount) return;
      renderEstadoActualCharts(mount, patient.monitoreo, Chart, { showTitle: false });
    })
    .catch(function () {
      if (!mount) return;
      renderEstadoActualCharts(mount, patient.monitoreo, undefined, { showTitle: false });
    });
}

function handleEaChartsEscape(ev) {
  if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
  var backdrop = getBackdrop();
  if (!backdrop || !backdrop.classList.contains('open')) return;
  closeEstadoActualChartsModal();
  ev.preventDefault();
  ev.stopPropagation();
}

/** Escape y clic fuera del panel de gráficas. */
export function wireEaChartsModalDismiss() {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener('keydown', handleEaChartsEscape, true);
  var backdrop = getBackdrop();
  if (backdrop) {
    backdrop.addEventListener('click', function (ev) {
      if (!backdrop.classList.contains('open')) return;
      if (ev.target !== backdrop) return;
      closeEstadoActualChartsModal();
    });
  }
}

export const windowHandlers = {
  openEstadoActualChartsModal,
  closeEstadoActualChartsModal,
};
