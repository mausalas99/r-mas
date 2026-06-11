import { getChartJsIfLoaded, loadChartJs } from '../vendor-loader.mjs';
import { destroyEstadoActualCharts, renderEstadoActualCharts } from './estado-actual-charts.mjs';

/** @type {{ getPatient(): { monitoreo?: unknown } | null, getActiveId(): string | null, showToast(msg: string, type?: string): void }} */
let rt = {
  getPatient() {
    return null;
  },
  getActiveId() {
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
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('ea-charts-modal-open');
}

function paintEaChartsModal(mount, monitoreo, ChartCtor) {
  if (!mount) return;
  renderEstadoActualCharts(mount, monitoreo, ChartCtor, { showTitle: false });
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
  var activeId = rt.getActiveId ? rt.getActiveId() : null;
  if (mount && mount._eaChartsPatientId != null && mount._eaChartsPatientId !== activeId) {
    destroyEstadoActualCharts(mount);
  }
  if (mount) mount._eaChartsPatientId = activeId;

  var hasShell = mount && mount.querySelector('.ea-charts-tabs');
  if (mount && !hasShell) {
    mount.innerHTML = '<p class="ea-muted ea-charts-loading">Cargando gráficas…</p>';
  }

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('ea-charts-modal-open');

  function schedulePaint(ChartCtor) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        paintEaChartsModal(mount, patient.monitoreo, ChartCtor);
      });
    });
  }

  var Chart = getChartJsIfLoaded();
  if (Chart) {
    schedulePaint(Chart);
    return;
  }
  void loadChartJs()
    .then(function (loaded) {
      schedulePaint(loaded);
    })
    .catch(function () {
      schedulePaint(undefined);
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
