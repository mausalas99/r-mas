import { isModeSala } from "../mode-features.mjs";
import { rt } from "./medications-runtime-state.mjs";

export function renderMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (!foot) return;
  foot.hidden = false;

  var soapBtnLabel = isModeSala(rt.getSettings()) ? "Enviar a Estado Actual" : "Abrir plantilla SOAP";

  foot.innerHTML =
    '<div class="med-nota-toolbar">' +
    '<div class="med-nota-actions">' +
    '<button type="button" class="wb-btn wb-btn-primary wb-btn-lg" data-onclick="mediAnadirATratamiento">Añadir a Tratamiento</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-onclick="mediLlevarASOAP">' +
    soapBtnLabel +
    '</button>' +
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
