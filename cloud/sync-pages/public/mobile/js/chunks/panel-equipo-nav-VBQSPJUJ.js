import {
  applyConexionView,
  equipoEmbedHostHtml
} from "/mobile/js/chunks/chunk-KLATWUL3.js";
import "/mobile/js/chunks/chunk-TVSHPTWN.js";
import "/mobile/js/chunks/chunk-3LRZJZK5.js";
import "/mobile/js/chunks/chunk-HA6KSINZ.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-PVAHDYTI.js";
import "/mobile/js/chunks/chunk-7GCA7ASC.js";
import {
  openConnectionDropdown
} from "/mobile/js/chunks/chunk-TFMD4PO7.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-SWYMLPFY.js";
import "/mobile/js/chunks/chunk-ZB32STDD.js";
import "/mobile/js/chunks/chunk-CHHF37KW.js";
import "/mobile/js/chunks/chunk-CBI7THZ4.js";
import "/mobile/js/chunks/chunk-AA7ORONM.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-GRPBL3SH.js";
import "/mobile/js/chunks/chunk-A35AFCZK.js";
import {
  mountEquipoTeamsPanel
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import "/mobile/js/chunks/chunk-G2QTTDSA.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-77VTEV4X.js";
import "/mobile/js/chunks/chunk-RBUONLJQ.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-G75IBCW4.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-XS2CWLHC.js";
import "/mobile/js/chunks/chunk-WF6PJVIL.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-4V75H66Y.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-VH7DMNPL.js";
import "/mobile/js/chunks/chunk-LF5B36KU.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-FBUYMHQK.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-YUYECAQZ.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-4ALI7FVW.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-QFKCJNWT.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-7CF6AX3C.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

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
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-5VF6EK6A.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  const equipoView = section.querySelector('[data-cloud-view="equipo"]');
  if (!equipoView) {
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-5VF6EK6A.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  if (!opts.skipProfileGate) {
    try {
      const { needsClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-QL3MWQA3.js");
      if (needsClinicalOnboarding()) {
        const mainMod = await import("/mobile/js/chunks/clinical-onboarding-main-TRAQBRY5.js");
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
//# sourceMappingURL=/js/chunks/panel-equipo-nav-VBQSPJUJ.js.map
