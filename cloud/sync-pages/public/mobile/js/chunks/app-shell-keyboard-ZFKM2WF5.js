import {
  openCommandPaletteFromShell,
  shellCloseSettingsDropdown,
  shellToggleSettingsDropdown
} from "/mobile/js/chunks/chunk-KWUDHV23.js";
import {
  openPaseSectionInNormal,
  switchAppTab,
  toggleProfileSection
} from "/mobile/js/chunks/chunk-ATYYITK5.js";
import "/mobile/js/chunks/chunk-RU3FUJKX.js";
import "/mobile/js/chunks/chunk-V53FQ62F.js";
import "/mobile/js/chunks/chunk-SUGQA2SQ.js";
import "/mobile/js/chunks/chunk-22EGFI47.js";
import "/mobile/js/chunks/chunk-M6MLNBYK.js";
import "/mobile/js/chunks/chunk-6CNOONJK.js";
import "/mobile/js/chunks/chunk-L3CKDTC6.js";
import "/mobile/js/chunks/chunk-KZBMNVUA.js";
import "/mobile/js/chunks/chunk-NYBHLPTK.js";
import "/mobile/js/chunks/chunk-O6MGPFMZ.js";
import "/mobile/js/chunks/chunk-6IT4VYWH.js";
import "/mobile/js/chunks/chunk-ZZBRT7YV.js";
import "/mobile/js/chunks/chunk-XMYM463C.js";
import "/mobile/js/chunks/chunk-42YTZX7Z.js";
import "/mobile/js/chunks/chunk-UMBBYMHN.js";
import "/mobile/js/chunks/chunk-H7RKMMBY.js";
import "/mobile/js/chunks/chunk-GDLXCT65.js";
import "/mobile/js/chunks/chunk-74QUVIPX.js";
import "/mobile/js/chunks/chunk-F22TO3UT.js";
import "/mobile/js/chunks/chunk-GYM4L4N4.js";
import "/mobile/js/chunks/chunk-LZJH44EB.js";
import "/mobile/js/chunks/chunk-RL7MVLBF.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-47DFSCNL.js";
import "/mobile/js/chunks/chunk-BYJGS6YL.js";
import "/mobile/js/chunks/chunk-ETN66DDX.js";
import "/mobile/js/chunks/chunk-RB43CK2I.js";
import "/mobile/js/chunks/chunk-ZOXS3A7B.js";
import "/mobile/js/chunks/chunk-C6UFSJCE.js";
import "/mobile/js/chunks/chunk-XGNJZCRR.js";
import "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-AZX47ZAL.js";
import "/mobile/js/chunks/chunk-4RWHEAJO.js";
import "/mobile/js/chunks/chunk-T5MFACW3.js";
import "/mobile/js/chunks/chunk-L6DKKZAW.js";
import "/mobile/js/chunks/chunk-UYGGXIVE.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-3WHKYJ7V.js";
import {
  getUiDensity,
  isGuardiaMode,
  isPaseMode,
  setUiDensity,
  toggleGuardiaMode
} from "/mobile/js/chunks/chunk-4ZYP54QF.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-5OEZNMAY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-WVWWVYPL.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-2VPNV3XW.js";
import "/mobile/js/chunks/chunk-MWUHDPML.js";
import "/mobile/js/chunks/chunk-S2OQTBTO.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import "/mobile/js/chunks/chunk-IFN2KBEN.js";
import "/mobile/js/chunks/chunk-K4LYOQAP.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-FXT4EGAN.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-VFWQPPKQ.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-J2US57NE.js";
import "/mobile/js/chunks/chunk-TRTQ4CW2.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-LSPMPOB5.js";
import "/mobile/js/chunks/chunk-SWAB7HBB.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-SUI526FO.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-CCQC427D.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import "/mobile/js/chunks/chunk-AETSFPDT.js";
import "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-2VO3CNBC.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/app-shell-keyboard.mjs
var shellKeyboardWired = false;
function shellShortcutFromTypingField(e) {
  var tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target && e.target.isContentEditable;
}
function handleShellDigitShortcut(key) {
  if (isPaseMode()) {
    if (key === "1") openPaseSectionInNormal("labs");
    if (key === "2") openPaseSectionInNormal("expediente");
    if (key === "3") openPaseSectionInNormal("med");
    if (key === "4" || key === "5") openPaseSectionInNormal("agenda");
    return;
  }
  if (key === "1") switchAppTab("lab");
  if (key === "2") switchAppTab("nota");
  if (key === "3") switchAppTab("med");
  if (key === "4" || key === "5") switchAppTab("agenda");
}
function handleShellSettingsCommaShortcut() {
  var bg = document.getElementById("settings-dropdown-backdrop");
  if (bg && bg.classList.contains("open")) shellCloseSettingsDropdown();
  else shellToggleSettingsDropdown();
}
function handleShellImportOverwriteShortcut(showToast) {
  window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
  showToast(
    window.__rpcPreferImportOverwrite ? "Importaci\xF3n: conflictos \u2192 sobrescribir (\u2318\u21E7, o Ctrl+Shift+, de nuevo para apagar)." : "Importaci\xF3n: se preguntar\xE1 en cada conflicto.",
    window.__rpcPreferImportOverwrite ? "success" : "info"
  );
}
function handleShellNamedShortcut(e, key) {
  if (key === "k" && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    openCommandPaletteFromShell();
    return true;
  }
  if (key === "p" && !e.altKey) {
    e.preventDefault();
    if (e.shiftKey) toggleProfileSection();
    else if (isGuardiaMode()) setUiDensity("normal");
    else setUiDensity(getUiDensity() === "normal" ? "pase" : "normal");
    return true;
  }
  if (key === "g" && e.shiftKey && !e.altKey) {
    e.preventDefault();
    toggleGuardiaMode();
    return true;
  }
  return false;
}
function handleShellCommaShortcut(e, showToast) {
  if (e.key !== ",") return false;
  if (shellShortcutFromTypingField(e)) return true;
  e.preventDefault();
  if (!e.shiftKey && !e.altKey) handleShellSettingsCommaShortcut();
  else if (e.shiftKey && !e.altKey) handleShellImportOverwriteShortcut(showToast);
  return true;
}
function onShellModifierKeydown(e, showToast) {
  var key = e.key.toLowerCase();
  if (key === "1" || key === "2" || key === "3" || key === "4" || key === "5") {
    e.preventDefault();
    handleShellDigitShortcut(key);
    return;
  }
  if (handleShellNamedShortcut(e, key)) return;
  handleShellCommaShortcut(e, showToast);
}
function initShellKeyboardShortcuts(showToast) {
  if (shellKeyboardWired) return;
  shellKeyboardWired = true;
  document.addEventListener(
    "keydown",
    function(e) {
      if (e.metaKey || e.ctrlKey) onShellModifierKeydown(e, showToast);
    },
    true
  );
}
export {
  initShellKeyboardShortcuts
};
//# sourceMappingURL=/js/chunks/app-shell-keyboard-ZFKM2WF5.js.map
