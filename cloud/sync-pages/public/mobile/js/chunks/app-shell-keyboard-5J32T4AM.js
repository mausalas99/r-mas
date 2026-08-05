import {
  openCommandPaletteFromShell,
  shellCloseSettingsDropdown,
  shellToggleSettingsDropdown
} from "/mobile/js/chunks/chunk-P4RHDIL3.js";
import {
  openPaseSectionInNormal,
  switchAppTab,
  toggleProfileSection
} from "/mobile/js/chunks/chunk-QL57ZKQA.js";
import "/mobile/js/chunks/chunk-FWK2O4R2.js";
import "/mobile/js/chunks/chunk-RJLBJZKC.js";
import "/mobile/js/chunks/chunk-DARJ7CZO.js";
import "/mobile/js/chunks/chunk-HXTMJLJE.js";
import "/mobile/js/chunks/chunk-BNYDNQ6F.js";
import "/mobile/js/chunks/chunk-NL2VNSHZ.js";
import "/mobile/js/chunks/chunk-N73M5IKZ.js";
import "/mobile/js/chunks/chunk-UMBBYMHN.js";
import "/mobile/js/chunks/chunk-KZBMNVUA.js";
import "/mobile/js/chunks/chunk-KGLMT7Q7.js";
import "/mobile/js/chunks/chunk-5ULB7V7I.js";
import "/mobile/js/chunks/chunk-6IT4VYWH.js";
import "/mobile/js/chunks/chunk-XELKF6FU.js";
import "/mobile/js/chunks/chunk-TNKRXUWD.js";
import "/mobile/js/chunks/chunk-YNMUOR4Q.js";
import "/mobile/js/chunks/chunk-LBCUQ32L.js";
import "/mobile/js/chunks/chunk-U44PD5PR.js";
import "/mobile/js/chunks/chunk-KE5KLMVD.js";
import "/mobile/js/chunks/chunk-KY3W2VTY.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-E2YV5EEU.js";
import "/mobile/js/chunks/chunk-HQZG5N6A.js";
import "/mobile/js/chunks/chunk-3QVHQ4QK.js";
import "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import "/mobile/js/chunks/chunk-GGQQKZC2.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-X4LAKGL3.js";
import "/mobile/js/chunks/chunk-ZRPAKVXD.js";
import "/mobile/js/chunks/chunk-LSPMPOB5.js";
import "/mobile/js/chunks/chunk-AOKU4GNB.js";
import "/mobile/js/chunks/chunk-GQ4IO4LN.js";
import "/mobile/js/chunks/chunk-OWLZMO5A.js";
import "/mobile/js/chunks/chunk-N7COVD6D.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-URSGTGGU.js";
import "/mobile/js/chunks/chunk-N73GQSRB.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import {
  getUiDensity,
  isGuardiaMode,
  isPaseMode,
  setUiDensity,
  toggleGuardiaMode
} from "/mobile/js/chunks/chunk-4FTQ7XEU.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-34AJGDKI.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-XAKSV4LG.js";
import "/mobile/js/chunks/chunk-CLJUGM4X.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-RQRXI24X.js";
import "/mobile/js/chunks/chunk-64JY3O3H.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-2NLWSG7O.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-DIWJYISZ.js";
import "/mobile/js/chunks/chunk-IBKESWFJ.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import "/mobile/js/chunks/chunk-JFY46RJV.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-UW56GTLS.js";
import "/mobile/js/chunks/chunk-PXDCZYH3.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-IRC74J3Z.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-TYH5ME2D.js";
import "/mobile/js/chunks/chunk-TSLGFHIE.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";

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
//# sourceMappingURL=/js/chunks/app-shell-keyboard-5J32T4AM.js.map
