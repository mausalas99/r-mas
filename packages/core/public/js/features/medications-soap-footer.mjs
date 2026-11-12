import { isModeSala } from "../mode-features.mjs";
import { rt } from "./medications-runtime-state.mjs";
import { drawMedNotaFooter, clearMedNotaFooter } from "./medications-soap-footer-view.jsx";

export function renderMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (!foot) return;
  foot.hidden = false;
  drawMedNotaFooter(foot, isModeSala(rt.getSettings()));
}

export function hideMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (foot) {
    foot.hidden = true;
    clearMedNotaFooter(foot);
  }
}
