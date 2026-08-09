import {
  destroyEaChartInstance,
  destroyEstadoActualCharts,
  getChartJsIfLoaded,
  loadChartJs,
  renderEstadoActualCharts,
  stripMonitoreoChartRuntimeCache
} from "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/estado-actual-charts-modal.mjs
var rt = {
  getPatient() {
    return null;
  },
  getActiveId() {
    return null;
  },
  showToast() {
  }
};
var dismissWired = false;
function registerEstadoActualChartsModalRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function getBackdrop() {
  return document.getElementById("ea-charts-backdrop");
}
function getMount() {
  return document.getElementById("ea-charts-modal-mount");
}
function closeEstadoActualChartsModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  destroyEaChartInstance();
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
}
function paintEaChartsModal(mount, monitoreo, ChartCtor) {
  if (!mount) return;
  renderEstadoActualCharts(mount, monitoreo, ChartCtor, { showTitle: false });
}
function openEstadoActualChartsModal() {
  var backdrop = getBackdrop();
  if (!backdrop) {
    rt.showToast("Gr\xE1ficas de monitoreo no disponibles", "error");
    return;
  }
  var patient = rt.getPatient();
  if (!patient || !patient.monitoreo) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var mount = getMount();
  var activeId = rt.getActiveId ? rt.getActiveId() : null;
  stripMonitoreoChartRuntimeCache(patient.monitoreo);
  if (mount) {
    destroyEstadoActualCharts(mount);
    mount._eaChartsSig = "";
    mount._eaChartsLayoutKey = "";
    mount._eaChartsPatientId = activeId;
  }
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  function paint(ChartCtor) {
    if (!ChartCtor) {
      if (mount) {
        var empty = document.getElementById("ea-charts-empty");
        if (empty) {
          empty.className = "ea-charts-empty empty-state empty-state--compact";
          empty.setAttribute("role", "status");
          empty.innerHTML = '<span class="empty-state-title">Gr\xE1ficas no disponibles</span><span class="empty-state-lead">Chart.js no est\xE1 disponible. Recarga la aplicaci\xF3n.</span>';
          empty.hidden = false;
        }
      }
      return;
    }
    paintEaChartsModal(mount, patient.monitoreo, ChartCtor);
  }
  var Chart = getChartJsIfLoaded();
  if (Chart) {
    paint(Chart);
    return;
  }
  void loadChartJs().then(paint).catch(function() {
    paint(void 0);
  });
}
function handleEaChartsEscape(ev) {
  if (ev.key !== "Escape" && ev.key !== "Esc") return;
  var backdrop = getBackdrop();
  if (!backdrop || !backdrop.classList.contains("open")) return;
  closeEstadoActualChartsModal();
  ev.preventDefault();
  ev.stopPropagation();
}
function wireEaChartsModalDismiss() {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener("keydown", handleEaChartsEscape, true);
  var backdrop = getBackdrop();
  if (backdrop) {
    backdrop.addEventListener("click", function(ev) {
      if (!backdrop.classList.contains("open")) return;
      if (ev.target !== backdrop) return;
      closeEstadoActualChartsModal();
    });
  }
}
var windowHandlers = {
  openEstadoActualChartsModal,
  closeEstadoActualChartsModal
};
export {
  closeEstadoActualChartsModal,
  openEstadoActualChartsModal,
  registerEstadoActualChartsModalRuntime,
  windowHandlers,
  wireEaChartsModalDismiss
};
//# sourceMappingURL=/js/chunks/estado-actual-charts-modal-5H4CXHGG.js.map
