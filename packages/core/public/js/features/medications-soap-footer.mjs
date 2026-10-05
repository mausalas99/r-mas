import { isModeSala } from "../mode-features.mjs";
import { rt } from "./medications-runtime-state.mjs";

export function renderMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (!foot) return;
  foot.hidden = false;

  var sala = isModeSala(rt.getSettings());
  var eaBtn = '<button type="button" class="wb-btn ' + (sala ? "wb-btn-secondary" : "wb-btn-primary wb-btn-lg") + '" data-onclick="mediLlevarASOAP">Enviar a Estado Actual</button>';

  foot.innerHTML =
    '<div class="med-nota-toolbar">' +
    '<div class="med-nota-actions">' +
    (sala ? '<button type="button" class="wb-btn wb-btn-primary wb-btn-lg" data-onclick="mediAnadirATratamiento">Añadir a Tratamiento</button>' : "") +
    eaBtn +
    '<button type="button" class="wb-btn wb-btn-secondary" data-onclick="limpiarManejoActual">Limpiar</button>' +
    "</div>" +
    "</div>";
}

export function hideMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (foot) {
    foot.hidden = true;
    foot.innerHTML = "";
  }
}
