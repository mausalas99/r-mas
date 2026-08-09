import {
  mountCloudMobileInviteInHost,
  refreshCloudSyncDiagnostics
} from "/mobile/js/chunks/chunk-CG6HUK2R.js";
import {
  applyConexionView
} from "/mobile/js/chunks/chunk-TBUVYOE2.js";
import "/mobile/js/chunks/chunk-PYARRANH.js";
import "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  mountEquipoTeamsPanel,
  setClinicalTeamsEmbedHost
} from "/mobile/js/chunks/chunk-JHCY7JRY.js";
import "/mobile/js/chunks/chunk-SITKK64L.js";
import "/mobile/js/chunks/chunk-TKGLBZLP.js";
import "/mobile/js/chunks/chunk-DID5RG6K.js";
import "/mobile/js/chunks/chunk-YFGSR2LP.js";
import "/mobile/js/chunks/chunk-HZLTCETY.js";
import "/mobile/js/chunks/chunk-TERSLZ3P.js";
import "/mobile/js/chunks/chunk-WQ6PPSIC.js";
import "/mobile/js/chunks/chunk-MUKCCNIH.js";
import "/mobile/js/chunks/chunk-SYWZMYIW.js";
import "/mobile/js/chunks/chunk-XWOEH37S.js";
import "/mobile/js/chunks/chunk-ZJ5Q2DYI.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-ARCLVSLZ.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-CFQPZQBI.js";
import "/mobile/js/chunks/chunk-VL2HB7CD.js";
import "/mobile/js/chunks/chunk-QJ4AKPQ5.js";
import "/mobile/js/chunks/chunk-72XICSYX.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-RQX7XEPZ.js";
import "/mobile/js/chunks/chunk-4VEBEOGH.js";
import "/mobile/js/chunks/chunk-FKV7DR6T.js";
import "/mobile/js/chunks/chunk-PGT753Q4.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-PMCRNWVY.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-ISXDOTEU.js";
import "/mobile/js/chunks/chunk-GJK2JHBF.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-YSMCQRZC.js";
import "/mobile/js/chunks/chunk-AWQNHSEL.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-NT3TRJXB.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-EJ66PJTG.js";
import "/mobile/js/chunks/chunk-QHIEC6QJ.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";

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
  void import("/mobile/js/chunks/app-shell-NYM3O63K.js").then(function(m) {
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
  const { tourState } = await import("/mobile/js/chunks/tour-state-A46UXAJJ.js");
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
//# sourceMappingURL=/js/chunks/panel-conexion-tour-2VAB7VKH.js.map
