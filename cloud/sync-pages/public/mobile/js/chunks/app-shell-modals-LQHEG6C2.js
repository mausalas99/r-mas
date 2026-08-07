import {
  createModalDismissRegistry,
  getOverlayZIndex,
  isRpcOverlayVisible
} from "/mobile/js/chunks/chunk-XCXY3GPK.js";
import {
  closeQuickHelp
} from "/mobile/js/chunks/chunk-RYVKITLQ.js";
import {
  closeExtraTemplatesManager,
  closeUnifiedSearch
} from "/mobile/js/chunks/chunk-4QHM6CMQ.js";
import {
  closeProcedureAgendaModal
} from "/mobile/js/chunks/chunk-SSHUIWAL.js";
import {
  closeLabBulkPreviewModal,
  closeLabBulkTourHintModal,
  closeLabRepoImportModal,
  closeLabSomeTablesModal,
  closeModal,
  closeProfileModal,
  closeReleaseNotes,
  closeTemplatesModal,
  closeWipeDataModal,
  confirmCloseAddPatientModal,
  hideUpdateModal
} from "/mobile/js/chunks/chunk-R2GBRWQ3.js";
import "/mobile/js/chunks/chunk-WPXKJVD2.js";
import "/mobile/js/chunks/chunk-C6U3A3QO.js";
import {
  chartsShellCloseProxies
} from "/mobile/js/chunks/chunk-CYVNWXHE.js";
import "/mobile/js/chunks/chunk-EMCMETSD.js";
import "/mobile/js/chunks/chunk-F3XP3RDZ.js";
import {
  hideTourIntroModal
} from "/mobile/js/chunks/chunk-KBCDDKJZ.js";
import "/mobile/js/chunks/chunk-5C7JYUSB.js";
import "/mobile/js/chunks/chunk-4FVV5X45.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-UQ6RG7U2.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import "/mobile/js/chunks/chunk-FV54XRK2.js";
import "/mobile/js/chunks/chunk-GLHG6K2U.js";
import "/mobile/js/chunks/chunk-J6VINJP7.js";
import "/mobile/js/chunks/chunk-QIUON47E.js";
import "/mobile/js/chunks/chunk-S2GJRSU7.js";
import {
  closeSettingsDropdown
} from "/mobile/js/chunks/chunk-UPP7BGNG.js";
import "/mobile/js/chunks/chunk-4YXLG5F2.js";
import {
  closeConnectionDropdown
} from "/mobile/js/chunks/chunk-ZMCDERYV.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-GNLW4YFR.js";
import "/mobile/js/chunks/chunk-FGKC3QPA.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-W5HGKDOD.js";
import "/mobile/js/chunks/chunk-GSMC2OHE.js";
import "/mobile/js/chunks/chunk-S3TI3OAS.js";
import "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-S6K5O6BP.js";
import "/mobile/js/chunks/chunk-TBKNEONY.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-BP4QC5UJ.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import "/mobile/js/chunks/chunk-YSBJHYC4.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-JYYMJKCB.js";
import "/mobile/js/chunks/chunk-VL5J4B3E.js";
import "/mobile/js/chunks/chunk-6OGC4PQJ.js";
import {
  closeSOAPModal
} from "/mobile/js/chunks/chunk-QQOJTZU6.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-LTZPVWLE.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-PEG2E4FB.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import {
  closeRpcDatePopover,
  isRpcDatePopoverOpen
} from "/mobile/js/chunks/chunk-IVOJHSUB.js";
import "/mobile/js/chunks/chunk-GTJXSHII.js";
import "/mobile/js/chunks/chunk-KPMBH6IG.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-LUBBZBEB.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-RU5G223P.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-B4Q7USSM.js";
import "/mobile/js/chunks/chunk-T2MO3KS5.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import {
  closeClinicoUnlockModal
} from "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-MGEK6PHD.js";
import "/mobile/js/chunks/chunk-GRJDNRYE.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import "/mobile/js/chunks/chunk-FORXNEKH.js";

// public/js/app-shell-modals.mjs
var DYNAMIC_BACKDROP_IDS = [
  "lab-dedupe-backdrop",
  "soap-confirm-backdrop",
  "dup-confirm-backdrop",
  "lab-conflict-backdrop",
  "exp-advice-backdrop",
  "tend-gaso-ext-backdrop"
];
var modalDismiss = createModalDismissRegistry();
var modalDismissInited = false;
function shellEl(id) {
  return document.getElementById(id);
}
function regOverlay(registry, id, close, panelSelector) {
  registry.register({
    isOpen: function() {
      return isRpcOverlayVisible(shellEl(id));
    },
    close,
    backdropEl: function() {
      return shellEl(id);
    },
    panelSelector
  });
}
function regOpenClass(registry, id, close, opts) {
  registry.register({
    isOpen: function() {
      var node = shellEl(id);
      return node && node.classList.contains("open");
    },
    close,
    confirmClose: opts && opts.confirmClose,
    backdropEl: function() {
      return shellEl(id);
    },
    panelSelector: opts && opts.panelSelector
  });
}
function regAriaOpen(registry, id, close) {
  registry.register({
    isOpen: function() {
      var node = shellEl(id);
      return node && node.getAttribute("aria-hidden") === "false";
    },
    close,
    backdropEl: function() {
      return shellEl(id);
    }
  });
}
function closeModalViaWindowOrHide(winFn, modalId) {
  return function() {
    if (typeof window[winFn] === "function") {
      window[winFn]();
      return;
    }
    var modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
  };
}
function wireModalDismissLayers(registry) {
  regOverlay(registry, "update-modal-backdrop", hideUpdateModal);
  regOverlay(
    registry,
    "tend-detail-backdrop",
    chartsShellCloseProxies.closeTendDetail,
    "#tend-detail-modal"
  );
  registry.register({
    isOpen: function() {
      var bd = shellEl("tend-group-backdrop");
      if (bd && bd.getAttribute("aria-hidden") === "false") return true;
      return chartsShellCloseProxies.isTendGroupModalOpen();
    },
    close: chartsShellCloseProxies.closeTendGroupModal,
    backdropEl: function() {
      return shellEl("tend-group-backdrop");
    },
    panelSelector: "#tend-group-modal"
  });
  regAriaOpen(registry, "rpc-wipe-modal", closeWipeDataModal);
  regOpenClass(registry, "soap-modal-backdrop", closeSOAPModal);
  regOpenClass(registry, "procedure-agenda-modal", closeProcedureAgendaModal, {
    panelSelector: ".modal"
  });
  regOpenClass(registry, "modal", closeModal, { confirmClose: confirmCloseAddPatientModal });
  regOpenClass(registry, "profile-modal", closeProfileModal);
  regOverlay(registry, "templates-modal", closeTemplatesModal);
  regOverlay(registry, "extra-templates-modal", closeExtraTemplatesManager);
  regOpenClass(registry, "unified-search-backdrop", closeUnifiedSearch);
  regOpenClass(registry, "help-quick-backdrop", closeQuickHelp);
  regOpenClass(registry, "release-notes-backdrop", closeReleaseNotes, {
    panelSelector: ".release-notes-modal"
  });
  regOpenClass(
    registry,
    "tend-hidden-modal-backdrop",
    chartsShellCloseProxies.closeTendHiddenModal
  );
  regOpenClass(
    registry,
    "lab-display-prefs-backdrop",
    chartsShellCloseProxies.closeLabDisplayPrefsModal,
    { panelSelector: ".lab-display-prefs-modal" }
  );
  regOpenClass(registry, "lab-bulk-preview-backdrop", closeLabBulkPreviewModal, {
    panelSelector: ".lab-bulk-preview-modal"
  });
  registry.register({
    isOpen: function() {
      var bd = shellEl("paste-smart-backdrop");
      return !!(bd && !bd.hidden);
    },
    close: function closePasteSmartConfirmProxy() {
      void import("/mobile/js/chunks/paste-smart-CKAYQ5WP.js").then(function(mod) {
        mod.closeSmartPasteConfirmIfOpen();
      });
    },
    backdropEl: function() {
      return shellEl("paste-smart-backdrop");
    },
    panelSelector: ".paste-smart-modal"
  });
  wireQueuePanelDismissLayers(registry);
  regOpenClass(registry, "lab-bulk-tour-hint-backdrop", closeLabBulkTourHintModal, {
    panelSelector: ".lab-bulk-tour-hint-modal"
  });
  regOpenClass(registry, "clinico-unlock-backdrop", closeClinicoUnlockModal, {
    panelSelector: ".clinico-unlock-modal"
  });
  regOpenClass(registry, "lab-some-tables-backdrop", closeLabSomeTablesModal, {
    panelSelector: ".lab-some-tables-modal"
  });
  regOpenClass(registry, "onboarding-intro-backdrop", hideTourIntroModal);
}
function wireQueuePanelDismissLayers(registry) {
  regOpenClass(registry, "lab-repo-import-modal", closeLabRepoImportModal, {
    panelSelector: ".lab-repo-import-modal"
  });
  regOpenClass(
    registry,
    "lab-manual-entry-modal",
    closeModalViaWindowOrHide("closeLabManualEntryModal", "lab-manual-entry-modal"),
    { panelSelector: ".lab-manual-entry-modal" }
  );
  regOpenClass(
    registry,
    "lab-repo-batch-modal",
    closeModalViaWindowOrHide("closeLabRepoBatchModal", "lab-repo-batch-modal"),
    { panelSelector: ".lab-repo-batch-modal" }
  );
}
function wireDropdownAndDynamicLayers(registry) {
  registry.register({
    isOpen: function() {
      var bg = shellEl("connection-dropdown-backdrop");
      return bg && bg.classList.contains("open");
    },
    close: closeConnectionDropdown,
    backdropEl: function() {
      return shellEl("connection-dropdown-backdrop");
    }
  });
  registry.register({
    isOpen: function() {
      var bg = shellEl("settings-dropdown-backdrop");
      return bg && bg.classList.contains("open");
    },
    close: closeSettingsDropdown,
    backdropEl: function() {
      return shellEl("settings-dropdown-backdrop");
    }
  });
  registry.register({
    isOpen: function() {
      return DYNAMIC_BACKDROP_IDS.some(function(id) {
        return isRpcOverlayVisible(shellEl(id));
      });
    },
    close: function() {
      var top = null;
      var bestZ = -1;
      DYNAMIC_BACKDROP_IDS.forEach(function(id) {
        var node = shellEl(id);
        var z = getOverlayZIndex(node);
        if (z > bestZ) {
          bestZ = z;
          top = node;
        }
      });
      if (!top) return;
      if (top.id === "tend-gaso-ext-backdrop") {
        top.style.display = "none";
        top.setAttribute("aria-hidden", "true");
        document.body.classList.remove("tend-gaso-ext-open");
        return;
      }
      top.remove();
    },
    backdropEl: function() {
      var best = null;
      var bestZ = -1;
      DYNAMIC_BACKDROP_IDS.forEach(function(id) {
        var node = shellEl(id);
        var z = getOverlayZIndex(node);
        if (z > bestZ) {
          bestZ = z;
          best = node;
        }
      });
      return best;
    },
    panelSelector: '.lab-conflict-modal, .tend-gaso-ext-dialog, [role="dialog"]'
  });
  registry.register({
    isOpen: isRpcDatePopoverOpen,
    close: closeRpcDatePopover
  });
}
function wireDynamicBackdropClickHandler() {
  document.addEventListener("click", function(ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains("lab-conflict-backdrop")) return;
    if (DYNAMIC_BACKDROP_IDS.indexOf(t.id) === -1) return;
    t.remove();
  });
}
function initModalDismiss() {
  if (modalDismissInited) return;
  wireModalDismissLayers(modalDismiss);
  wireDropdownAndDynamicLayers(modalDismiss);
  modalDismiss.init();
  wireDynamicBackdropClickHandler();
  modalDismissInited = true;
}
export {
  initModalDismiss
};
//# sourceMappingURL=/js/chunks/app-shell-modals-LQHEG6C2.js.map
