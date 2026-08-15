/** Perfil — async platform blocks in settings modal. */
import { getProfileRuntime } from "./profile-runtime.mjs";

export function populateProfileVersionBlock() {
  var verEl = document.getElementById("settings-app-version");
  if (!verEl) return;
  if (!window.electronAPI || typeof window.electronAPI.getAppVersion !== "function") {
    verEl.textContent = "Web / desarrollo";
    return;
  }
  window.electronAPI
    .getAppVersion()
    .then(async function (v) {
      verEl.textContent = v || "—";
      var LAST_SEEN_VERSION_KEY = "rplus-last-seen-app-version";
      var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
      if (prev) window.__RPC_PREV_APP_VERSION__ = prev;
      var versionChanged = !!(prev && v && prev !== v);
      if (versionChanged) {
        getProfileRuntime().showToast(
          "Actualizado a v" + v + ". Consulta Ajustes o el menú para buscar actualizaciones.",
          "success"
        );
      }
      if (versionChanged || window.__RPC_RELEASE_NOTES_DEV__) {
        var notes = await import("./settings-help/release-notes.mjs");
        if (notes.RELEASE_NOTES_DEV_FORCE_SHOW) {
          notes.initReleaseNotesDevPreviewIfEnabled(v);
        } else if (versionChanged) {
          notes.maybeShowReleaseNotesFor(v, prev);
        }
      }
      if (v) localStorage.setItem(LAST_SEEN_VERSION_KEY, v);
    })
    .catch(function () {
      verEl.textContent = "—";
    });
}

export function populateProfileUserDataBlock() {
  var hintEl = document.getElementById("settings-updates-hint");
  if (hintEl) hintEl.classList.toggle("is-visible", !!window.electronAPI);
  var udEl = document.getElementById("settings-user-data-path");
  var udHint = document.getElementById("settings-userdata-web-hint");
  var udBtn = document.getElementById("settings-open-userdata-btn");
  if (window.electronAPI && typeof window.electronAPI.getUserDataPath === "function") {
    if (udHint) udHint.classList.remove("is-visible");
    if (udBtn) udBtn.disabled = false;
    window.electronAPI
      .getUserDataPath()
      .then(function (p) {
        if (udEl) {
          udEl.textContent = p || "—";
          udEl.title = p || "";
        }
      })
      .catch(function () {
        if (udEl) udEl.textContent = "—";
      });
    return;
  }
  if (udEl) udEl.textContent = "Navegador / modo desarrollo";
  if (udHint) udHint.classList.add("is-visible");
  if (udBtn) udBtn.disabled = true;
}
