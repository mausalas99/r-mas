import {
  applyConexionView,
  equipoEmbedHostHtml
} from "/mobile/js/chunks/chunk-TBUVYOE2.js";
import "/mobile/js/chunks/chunk-PYARRANH.js";
import {
  mountEquipoTeamsPanel,
  openConnectionDropdown
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

// public/js/features/cloud-sync/panel-equipo-nav.mjs
async function waitForConexionSection(maxMs = 6e3) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const section = document.querySelector(".cloud-sync-conexion[data-cloud-nube-section]");
    if (section) return section;
    await new Promise(function(resolve) {
      setTimeout(resolve, 50);
    });
  }
  return null;
}
async function navigateEquipoView(section, opts) {
  const toast = typeof opts.toast === "function" ? opts.toast : function() {
  };
  let host = section.querySelector("[data-cloud-equipo-host]");
  if (!host) {
    const body = section.querySelector('[data-cloud-view="equipo"] .cloud-sync-view-body');
    if (body) {
      body.insertAdjacentHTML("afterbegin", equipoEmbedHostHtml());
      host = body.querySelector("[data-cloud-equipo-host]");
    }
  }
  applyConexionView(section, "equipo", {
    onEquipo() {
      void mountEquipoTeamsPanel(host, { toast });
    }
  });
  if (host) {
    await mountEquipoTeamsPanel(host, { toast });
  }
}
async function openConexionEquipoPanel(opts = {}) {
  const toast = typeof opts.toast === "function" ? opts.toast : function() {
  };
  openConnectionDropdown();
  const section = await waitForConexionSection();
  if (!section) {
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-QENT7S24.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  const equipoView = section.querySelector('[data-cloud-view="equipo"]');
  if (!equipoView) {
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-QENT7S24.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  if (!opts.skipProfileGate) {
    try {
      const { needsClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-WDSNSQUQ.js");
      if (needsClinicalOnboarding()) {
        const mainMod = await import("/mobile/js/chunks/clinical-onboarding-main-VNLNQA5N.js");
        await mainMod.showMainClinicalOnboarding();
        mainMod.focusMainClinicalOnboarding();
        return;
      }
    } catch {
    }
  }
  await navigateEquipoView(section, { toast, skipProfileGate: opts.skipProfileGate });
}
export {
  openConexionEquipoPanel
};
//# sourceMappingURL=/js/chunks/panel-equipo-nav-LPPEYKMH.js.map
