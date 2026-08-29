import {
  mountCloudMobileInviteInHost
} from "/mobile/js/chunks/chunk-JTTNXS5E.js";
import {
  applyConexionView,
  refreshCloudSyncDiagnostics
} from "/mobile/js/chunks/chunk-L6C4JZGU.js";
import "/mobile/js/chunks/chunk-BH7QFRSK.js";
import "/mobile/js/chunks/chunk-OBGB2GI4.js";
import "/mobile/js/chunks/chunk-FN6TV54N.js";
import "/mobile/js/chunks/chunk-A3RN2FNA.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-PVAHDYTI.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-7E4ACOES.js";
import "/mobile/js/chunks/chunk-EP7FYMO7.js";
import "/mobile/js/chunks/chunk-HHBM77OL.js";
import "/mobile/js/chunks/chunk-CBI7THZ4.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-JGESXDLG.js";
import "/mobile/js/chunks/chunk-SHV4FR3K.js";
import {
  mountEquipoTeamsPanel,
  setClinicalTeamsEmbedHost
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import "/mobile/js/chunks/chunk-JNMJGW22.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-PJD3LECG.js";
import "/mobile/js/chunks/chunk-LN2N4VIO.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-4EH4XZVS.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-PLO52CII.js";
import "/mobile/js/chunks/chunk-WEOKZTSW.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-VAFCBXBV.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-B7NNRK4H.js";
import "/mobile/js/chunks/chunk-ZDAIWZ25.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-MLLRKYO6.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-K4PQIQOH.js";
import "/mobile/js/chunks/chunk-BTIFFDH4.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-Y2YRXJMM.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-XV2TMACY.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

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
  void import("/mobile/js/chunks/app-shell-7T6KXOLW.js").then(function(m) {
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
  const { tourState } = await import("/mobile/js/chunks/tour-state-DTG5EIH7.js");
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
//# sourceMappingURL=/js/chunks/panel-conexion-tour-7JYDVXEQ.js.map
