import {
  mountCloudMobileInviteInHost
} from "/mobile/js/chunks/chunk-FPOSNOHN.js";
import {
  applyConexionView,
  refreshCloudSyncDiagnostics
} from "/mobile/js/chunks/chunk-OIFHZXXR.js";
import "/mobile/js/chunks/chunk-E37ZTBOD.js";
import "/mobile/js/chunks/chunk-ANI5HGUB.js";
import "/mobile/js/chunks/chunk-6YERAGXK.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-OBGB2GI4.js";
import "/mobile/js/chunks/chunk-VDEKDLYX.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-CPLU2I7R.js";
import "/mobile/js/chunks/chunk-U3XNJFTE.js";
import "/mobile/js/chunks/chunk-7TWBBTNK.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-YUEMH3I3.js";
import "/mobile/js/chunks/chunk-IGOCX3DQ.js";
import {
  mountEquipoTeamsPanel,
  setClinicalTeamsEmbedHost
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import "/mobile/js/chunks/chunk-NPWWQWKW.js";
import "/mobile/js/chunks/chunk-KESF4FLC.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-3PL7T3ZN.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-7FIP2ETS.js";
import "/mobile/js/chunks/chunk-CZ2M277B.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-BUGU4R5K.js";
import "/mobile/js/chunks/chunk-4SMSHN53.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-P7EHNYUF.js";
import "/mobile/js/chunks/chunk-S2E4QGRL.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-NC6VRD7M.js";
import "/mobile/js/chunks/chunk-5RUR3UQW.js";
import "/mobile/js/chunks/chunk-C4OBKXWW.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-VVADIT4K.js";
import "/mobile/js/chunks/chunk-HDD2EUC6.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-VRNWC4P2.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-KZT7D6I2.js";
import "/mobile/js/chunks/chunk-EE5CSOUC.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-75QM3TGW.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/features/cloud-sync/panel-conexion-tour.mjs
var TOUR_CONEXION_VIEW = {
  livesync_desktop: "status",
  livesync_mobile: "mobile",
  gv7_lan_wifi: "status",
  gv7_lan_directorio: "equipo",
  gv7_lan_rotacion: "equipo",
  gv7_rotacion_rejoin: "equipo",
  gv7_inherit_patients: "equipo",
  gv7_mobile_link: "mobile",
  gv7_mobile_scope: "mobile",
  gv7_mobile_vs_sala: "mobile"
};
function findConexionSection() {
  return document.querySelector(".cloud-sync-conexion[data-cloud-nube-section]");
}
function tourToast(msg, kind) {
  void import("/mobile/js/chunks/app-shell-CYKX4DYP.js").then(function(m) {
    m.showToast?.(msg, kind);
  }).catch(function() {
  });
}
function buildConexionTourHooks(section) {
  const runtime = function() {
    return { showToast: tourToast };
  };
  return {
    onMobile() {
      mountCloudMobileInviteInHost(section.querySelector("[data-cloud-mobile-invite-host]"), {
        runtime
      });
    },
    onEquipo() {
      void mountEquipoTeamsPanel(section.querySelector("[data-cloud-equipo-host]"), {
        toast: tourToast
      });
    },
    onNube() {
      refreshCloudSyncDiagnostics(section.querySelector("[data-cloud-nube-diagnostics-host]"), {
        toast: tourToast
      });
    }
  };
}
function applyConexionTourView(section, view) {
  const host = section || findConexionSection();
  if (!host) return;
  applyConexionView(host, view, buildConexionTourHooks(host));
}
function resetStaleConexionSubview() {
  const section = findConexionSection();
  if (!section) return;
  const view = String(section.dataset.cloudView || "status").trim() || "status";
  const hasView = !!section.querySelector('[data-cloud-view="' + view + '"]');
  if (view === "ops" || view === "lan" || !hasView) {
    applyConexionTourView(section, "status");
  }
}
function resetConexionPanelOnClose() {
  const section = findConexionSection();
  if (!section) return;
  setClinicalTeamsEmbedHost(null);
  applyConexionTourView(section, "status");
}
async function afterConnectionPanelOpened() {
  const { tourState } = await import("/mobile/js/chunks/tour-state-NJ6IDLX7.js");
  if (tourState.guidedTourActive && tourState.tourStepId) {
    await prepareConexionPanelForTour(tourState.tourStepId);
    return;
  }
  resetStaleConexionSubview();
}
async function prepareConexionPanelForTour(stepId, attempt = 0) {
  const section = findConexionSection();
  if (!section) {
    if (attempt < 40) {
      await new Promise(function(resolve) {
        setTimeout(resolve, 50);
      });
      return prepareConexionPanelForTour(stepId, attempt + 1);
    }
    return;
  }
  const view = TOUR_CONEXION_VIEW[String(stepId || "").trim()];
  if (!view) {
    resetStaleConexionSubview();
    return;
  }
  applyConexionTourView(section, view);
}
export {
  afterConnectionPanelOpened,
  findConexionSection,
  prepareConexionPanelForTour,
  resetConexionPanelOnClose,
  resetStaleConexionSubview
};
//# sourceMappingURL=/js/chunks/panel-conexion-tour-ERBJFOY2.js.map
