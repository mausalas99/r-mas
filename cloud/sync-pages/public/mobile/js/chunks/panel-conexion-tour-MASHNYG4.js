import {
  mountCloudMobileInviteInHost
} from "/mobile/js/chunks/chunk-ZGCG5KEH.js";
import {
  applyConexionView,
  refreshCloudSyncDiagnostics
} from "/mobile/js/chunks/chunk-YFQZYSTX.js";
import "/mobile/js/chunks/chunk-VER75A37.js";
import "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  mountEquipoTeamsPanel,
  setClinicalTeamsEmbedHost
} from "/mobile/js/chunks/chunk-NGYHUPLR.js";
import "/mobile/js/chunks/chunk-WKKCGK2F.js";
import "/mobile/js/chunks/chunk-NIWULNNS.js";
import "/mobile/js/chunks/chunk-2EVCQOXR.js";
import "/mobile/js/chunks/chunk-KYQCLTVP.js";
import "/mobile/js/chunks/chunk-CWXF5HCJ.js";
import "/mobile/js/chunks/chunk-HUK4RQZ3.js";
import "/mobile/js/chunks/chunk-DLYFNQTQ.js";
import "/mobile/js/chunks/chunk-EQKSFX4S.js";
import "/mobile/js/chunks/chunk-WTQUTVWF.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-4SRKXA7H.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-J5DWHQ6X.js";
import "/mobile/js/chunks/chunk-TDVHJVR3.js";
import "/mobile/js/chunks/chunk-KOO75KII.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-3BAWU2QN.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-4RTTJZJK.js";
import "/mobile/js/chunks/chunk-2KZNYZG7.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-X6BDSFTA.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-ZCN4RDXQ.js";
import "/mobile/js/chunks/chunk-WIYWDVMU.js";
import "/mobile/js/chunks/chunk-CZEKXCNB.js";
import "/mobile/js/chunks/chunk-7IBNSPMB.js";
import "/mobile/js/chunks/chunk-3TVMEDT5.js";
import "/mobile/js/chunks/chunk-3MF5KBNS.js";
import "/mobile/js/chunks/chunk-ID2H6AJR.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-HT2CLYXO.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-SRMOQLQ5.js";
import "/mobile/js/chunks/chunk-RHISJ2VG.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-XKV6IPP7.js";
import "/mobile/js/chunks/chunk-TTNY5OXP.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";

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
  void import("/mobile/js/chunks/app-shell-V5Y46AS5.js").then(function(m) {
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
  const { tourState } = await import("/mobile/js/chunks/tour-state-KLUS4TDL.js");
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
//# sourceMappingURL=/js/chunks/panel-conexion-tour-MASHNYG4.js.map
