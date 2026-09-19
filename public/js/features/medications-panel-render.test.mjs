import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderMedRecetaPanel } from "./medications-panel-render.mjs";
import { attachProfileSettingsGetter } from "./profile-runtime.mjs";
import { setActivePatientAreaGetter } from "./active-patient-area.mjs";

describe("renderMedRecetaPanel — #med-turno-card mode gate", () => {
  beforeEach(() => {
    if (typeof document === "undefined") return;
    document.body.innerHTML =
      '<div id="med-turno-card"></div>' +
      '<div id="med-hint"></div>' +
      '<div id="med-items-list"></div>';
    setActivePatientAreaGetter(() => "");
  });

  it("shows the card in Hospitalización (sala) mode", () => {
    if (typeof document === "undefined") return;
    attachProfileSettingsGetter(() => ({ appMode: "sala" }));
    renderMedRecetaPanel();
    assert.equal(document.getElementById("med-turno-card").hidden, false);
  });

  it("hides the card in Consulta Externa mode", () => {
    if (typeof document === "undefined") return;
    attachProfileSettingsGetter(() => ({ appMode: "interconsulta" }));
    renderMedRecetaPanel();
    assert.equal(document.getElementById("med-turno-card").hidden, true);
  });
});
