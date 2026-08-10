import {
  mountCloudMobileInviteInHost
} from "/mobile/js/chunks/chunk-36AF5GQF.js";
import {
  applyConexionView,
  refreshCloudSyncDiagnostics
} from "/mobile/js/chunks/chunk-4BBBETP7.js";
import "/mobile/js/chunks/chunk-YWNLHSLY.js";
import "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  mountEquipoTeamsPanel,
  setClinicalTeamsEmbedHost
} from "/mobile/js/chunks/chunk-SUHVKV2B.js";
import "/mobile/js/chunks/chunk-FQAQAHCP.js";
import "/mobile/js/chunks/chunk-DXT4XQM7.js";
import "/mobile/js/chunks/chunk-AGTBFRLI.js";
import "/mobile/js/chunks/chunk-R6FEF2OL.js";
import "/mobile/js/chunks/chunk-KWIGON6B.js";
import "/mobile/js/chunks/chunk-SERPYDDG.js";
import "/mobile/js/chunks/chunk-SPXDZARY.js";
import "/mobile/js/chunks/chunk-QGQYHCCP.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-OPWB7OTD.js";
import "/mobile/js/chunks/chunk-FGXLPOV7.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-FRFJRB37.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-WF64SOAI.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-3I74GVWN.js";
import "/mobile/js/chunks/chunk-VL2HB7CD.js";
import "/mobile/js/chunks/chunk-OGX35Y32.js";
import "/mobile/js/chunks/chunk-3O4YWJHW.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-EHHIMUZG.js";
import "/mobile/js/chunks/chunk-H66E52WF.js";
import "/mobile/js/chunks/chunk-IWCUDCPM.js";
import "/mobile/js/chunks/chunk-HNK3CY62.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-D3ZABJHJ.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-F52EEXUB.js";
import "/mobile/js/chunks/chunk-GJK2JHBF.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-YSMCQRZC.js";
import "/mobile/js/chunks/chunk-AWQNHSEL.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-BBXERARG.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-3VLOKES3.js";
import "/mobile/js/chunks/chunk-TGGEFYRH.js";
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
  void import("/mobile/js/chunks/app-shell-VNYPWGCN.js").then(function(m) {
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
  const { tourState } = await import("/mobile/js/chunks/tour-state-XDNLJCHE.js");
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
//# sourceMappingURL=/js/chunks/panel-conexion-tour-QB4SLOFK.js.map
