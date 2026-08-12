import {
  createModalDismissRegistry,
  getOverlayZIndex,
  isRpcOverlayVisible
} from "/mobile/js/chunks/chunk-XCXY3GPK.js";
import {
  closeShortcutsModal
} from "/mobile/js/chunks/chunk-S6ARIJHR.js";
import {
  closeQuickHelp
} from "/mobile/js/chunks/chunk-BHID2UQE.js";
import {
  closeExtraTemplatesManager,
  closeUnifiedSearch
} from "/mobile/js/chunks/chunk-APA4E2NS.js";
import {
  closeProcedureAgendaModal
} from "/mobile/js/chunks/chunk-5KRETQAF.js";
import {
  closeConnectionDropdown,
  closeLabBulkPreviewModal,
  closeLabBulkTourHintModal,
  closeLabRepoImportModal,
  closeLabSomeTablesModal,
  closeModal,
  closeProfileModal,
  closeReleaseNotes,
  closeSOAPModal,
  closeSettingsDropdown,
  closeTemplatesModal,
  closeWipeDataModal,
  confirmCloseAddPatientModal,
  hideUpdateModal
} from "/mobile/js/chunks/chunk-NGYHUPLR.js";
import "/mobile/js/chunks/chunk-WKKCGK2F.js";
import "/mobile/js/chunks/chunk-NIWULNNS.js";
import "/mobile/js/chunks/chunk-2EVCQOXR.js";
import "/mobile/js/chunks/chunk-KYQCLTVP.js";
import "/mobile/js/chunks/chunk-CWXF5HCJ.js";
import {
  chartsShellCloseProxies
} from "/mobile/js/chunks/chunk-HUK4RQZ3.js";
import "/mobile/js/chunks/chunk-DLYFNQTQ.js";
import {
  hideTourIntroModal
} from "/mobile/js/chunks/chunk-EQKSFX4S.js";
import "/mobile/js/chunks/chunk-WTQUTVWF.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-4SRKXA7H.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-J5DWHQ6X.js";
import {
  closeRpcDatePopover,
  isRpcDatePopoverOpen
} from "/mobile/js/chunks/chunk-TDVHJVR3.js";
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
import {
  closeClinicoUnlockModal
} from "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";

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
  regOpenClass(registry, "shortcuts-backdrop", closeShortcutsModal, {
    panelSelector: ".shortcuts-sheet"
  });
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
      void import("/mobile/js/chunks/paste-smart-DVLKFOFD.js").then(function(mod) {
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
//# sourceMappingURL=/js/chunks/app-shell-modals-3UH5AQQH.js.map
