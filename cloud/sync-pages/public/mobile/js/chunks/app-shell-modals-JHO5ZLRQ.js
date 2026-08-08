import {
  createModalDismissRegistry,
  getOverlayZIndex,
  isRpcOverlayVisible
} from "/mobile/js/chunks/chunk-XCXY3GPK.js";
import {
  closeQuickHelp
} from "/mobile/js/chunks/chunk-7GHK4TAJ.js";
import {
  closeExtraTemplatesManager,
  closeUnifiedSearch
} from "/mobile/js/chunks/chunk-OOTI2MI2.js";
import {
  closeProcedureAgendaModal
} from "/mobile/js/chunks/chunk-SVFWAHAX.js";
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
} from "/mobile/js/chunks/chunk-SEU6G44G.js";
import "/mobile/js/chunks/chunk-5YKJH4WM.js";
import "/mobile/js/chunks/chunk-6PV3IFTY.js";
import {
  chartsShellCloseProxies
} from "/mobile/js/chunks/chunk-47I3U5Q6.js";
import "/mobile/js/chunks/chunk-5AXDVMXS.js";
import "/mobile/js/chunks/chunk-L3ORSVMJ.js";
import "/mobile/js/chunks/chunk-PMGUO7FX.js";
import "/mobile/js/chunks/chunk-F3XP3RDZ.js";
import "/mobile/js/chunks/chunk-G4WZFQ3W.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import {
  hideTourIntroModal
} from "/mobile/js/chunks/chunk-LHVAG7SJ.js";
import "/mobile/js/chunks/chunk-MVTHEUBE.js";
import "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import {
  closeSettingsDropdown
} from "/mobile/js/chunks/chunk-QTYZ6UDY.js";
import "/mobile/js/chunks/chunk-6UYQDHFN.js";
import {
  closeConnectionDropdown
} from "/mobile/js/chunks/chunk-3GQWNHJN.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-2RS4OG65.js";
import "/mobile/js/chunks/chunk-CWSU7RSL.js";
import "/mobile/js/chunks/chunk-MQFCEJVU.js";
import "/mobile/js/chunks/chunk-7M7KYIIH.js";
import "/mobile/js/chunks/chunk-5NXKHEZO.js";
import "/mobile/js/chunks/chunk-KYJHH3SC.js";
import "/mobile/js/chunks/chunk-ZSZOVFSK.js";
import "/mobile/js/chunks/chunk-APH32TZA.js";
import "/mobile/js/chunks/chunk-BCJKJMLF.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-BC7GPMEI.js";
import "/mobile/js/chunks/chunk-A5EHINXR.js";
import "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-EQA33PSX.js";
import "/mobile/js/chunks/chunk-GHYXKSAH.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-VLTPCB4L.js";
import {
  closeSOAPModal
} from "/mobile/js/chunks/chunk-JB63TG4Y.js";
import "/mobile/js/chunks/chunk-BZPGDWNR.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-HKGXY6ZZ.js";
import "/mobile/js/chunks/chunk-FVMS5JSH.js";
import "/mobile/js/chunks/chunk-CYT2QRK7.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import {
  closeRpcDatePopover,
  isRpcDatePopoverOpen
} from "/mobile/js/chunks/chunk-F5H6MC3T.js";
import "/mobile/js/chunks/chunk-FHX6BQST.js";
import "/mobile/js/chunks/chunk-HHFYYXCN.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-C345P2AA.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-KNHJBTZ6.js";
import "/mobile/js/chunks/chunk-AQOFRLU7.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-XJ7JWVS5.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import {
  closeClinicoUnlockModal
} from "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-6CH64UGD.js";
import "/mobile/js/chunks/chunk-PJKQGVLW.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import "/mobile/js/chunks/chunk-P32NKBWE.js";

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
      void import("/mobile/js/chunks/paste-smart-DQNDS2CC.js").then(function(mod) {
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
//# sourceMappingURL=/js/chunks/app-shell-modals-JHO5ZLRQ.js.map
