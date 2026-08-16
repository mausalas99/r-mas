import {
  applyConexionView,
  equipoEmbedHostHtml
} from "/mobile/js/chunks/chunk-OIFHZXXR.js";
import "/mobile/js/chunks/chunk-E37ZTBOD.js";
import "/mobile/js/chunks/chunk-ANI5HGUB.js";
import "/mobile/js/chunks/chunk-6YERAGXK.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-VDEKDLYX.js";
import {
  openConnectionDropdown
} from "/mobile/js/chunks/chunk-EPFF77ND.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-CPLU2I7R.js";
import "/mobile/js/chunks/chunk-U3XNJFTE.js";
import "/mobile/js/chunks/chunk-7TWBBTNK.js";
import "/mobile/js/chunks/chunk-AA7ORONM.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-YUEMH3I3.js";
import "/mobile/js/chunks/chunk-IGOCX3DQ.js";
import {
  mountEquipoTeamsPanel
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
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-NRMLAWXA.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  const equipoView = section.querySelector('[data-cloud-view="equipo"]');
  if (!equipoView) {
    const { openClinicalTeamsPanelModal } = await import("/mobile/js/chunks/teams-roster-shell-NRMLAWXA.js");
    await openClinicalTeamsPanelModal(opts);
    return;
  }
  if (!opts.skipProfileGate) {
    try {
      const { needsClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-5SWDFJP6.js");
      if (needsClinicalOnboarding()) {
        const mainMod = await import("/mobile/js/chunks/clinical-onboarding-main-H75X5GZK.js");
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
//# sourceMappingURL=/js/chunks/panel-equipo-nav-JNNJO62A.js.map
