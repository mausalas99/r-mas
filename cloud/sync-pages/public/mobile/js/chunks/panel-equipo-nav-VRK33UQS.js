import {
  applyConexionView,
  equipoEmbedHostHtml
} from "/mobile/js/chunks/chunk-YFQZYSTX.js";
import "/mobile/js/chunks/chunk-VER75A37.js";
import {
  mountEquipoTeamsPanel,
  openConnectionDropdown
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
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-JIWXQHO7.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  const equipoView = section.querySelector('[data-cloud-view="equipo"]');
  if (!equipoView) {
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-JIWXQHO7.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  if (!opts.skipProfileGate) {
    try {
      const { needsClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-RR5E3AJQ.js");
      if (needsClinicalOnboarding()) {
        const mainMod = await import("/mobile/js/chunks/clinical-onboarding-main-ZRF46NME.js");
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
//# sourceMappingURL=/js/chunks/panel-equipo-nav-VRK33UQS.js.map
