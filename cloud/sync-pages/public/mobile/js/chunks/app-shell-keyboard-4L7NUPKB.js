import {
  openCommandPaletteFromShell,
  shellCloseSettingsDropdown,
  shellToggleSettingsDropdown
} from "/mobile/js/chunks/chunk-IFWA7UBL.js";
import {
  openPaseSectionInNormal,
  switchAppTab,
  toggleProfileSection
} from "/mobile/js/chunks/chunk-4SIVR4SA.js";
import "/mobile/js/chunks/chunk-BKJ6JOGZ.js";
import "/mobile/js/chunks/chunk-DPCWCVTP.js";
import "/mobile/js/chunks/chunk-SCSVSR4P.js";
import "/mobile/js/chunks/chunk-TTFM7EP4.js";
import "/mobile/js/chunks/chunk-OOMYDHTA.js";
import "/mobile/js/chunks/chunk-55V5O62J.js";
import "/mobile/js/chunks/chunk-NHHUSR52.js";
import "/mobile/js/chunks/chunk-YEWIPCRL.js";
import "/mobile/js/chunks/chunk-2TSPDBVD.js";
import "/mobile/js/chunks/chunk-PKYRHIWH.js";
import "/mobile/js/chunks/chunk-6DPIGF5S.js";
import "/mobile/js/chunks/chunk-OSPRJYRJ.js";
import "/mobile/js/chunks/chunk-7PDTCWFA.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-YQNA53YU.js";
import "/mobile/js/chunks/chunk-RAQX5OVN.js";
import "/mobile/js/chunks/chunk-3QVHQ4QK.js";
import "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import "/mobile/js/chunks/chunk-HEEVLY4I.js";
import "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-UMBBYMHN.js";
import "/mobile/js/chunks/chunk-KZBMNVUA.js";
import "/mobile/js/chunks/chunk-CA3QXIB4.js";
import "/mobile/js/chunks/chunk-5ULB7V7I.js";
import "/mobile/js/chunks/chunk-6IT4VYWH.js";
import "/mobile/js/chunks/chunk-WMJDFKKN.js";
import "/mobile/js/chunks/chunk-J7SG2LGN.js";
import "/mobile/js/chunks/chunk-RXNYNYIW.js";
import "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import "/mobile/js/chunks/chunk-YREK4H2V.js";
import "/mobile/js/chunks/chunk-HVHVRFSH.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-K7TUQM3L.js";
import "/mobile/js/chunks/chunk-NW6K73WP.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import {
  getUiDensity,
  isGuardiaMode,
  isPaseMode,
  setUiDensity,
  toggleGuardiaMode
} from "/mobile/js/chunks/chunk-F55OGCCZ.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-C6TP3H7V.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-OJF7SMWI.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-GJUAH75C.js";
import "/mobile/js/chunks/chunk-WOP35WT6.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-ALW2M5BA.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-MBEH6ZUQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-IAZG4W3U.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import "/mobile/js/chunks/chunk-76D6GOCM.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-LSPMPOB5.js";
import "/mobile/js/chunks/chunk-AOKU4GNB.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-XO7Z5S3R.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-6VYBWSQE.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-OEEP3MSI.js";
import "/mobile/js/chunks/chunk-LMOJUVZ4.js";

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
//# sourceMappingURL=/js/chunks/app-shell-keyboard-4L7NUPKB.js.map
