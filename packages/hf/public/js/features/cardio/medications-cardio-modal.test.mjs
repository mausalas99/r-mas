import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setPatients } from "../../app-state.mjs";
import { registerMedicationsRuntime } from "../medications-runtime-state.mjs";
import { renderCardioManejoCards, clearCardioManejoCards } from "./medications-cardio-mount.mjs";

function setup(patient) {
  document.body.innerHTML = '<div id="med-output-section"></div>';
  setPatients([patient]);
  registerMedicationsRuntime({ getActiveId: () => patient.id });
}

describe("cardio Manejo cards — compact summary + modal", () => {
  beforeEach(() => {
    if (typeof document === "undefined") return;
    clearCardioManejoCards();
  });

  it("renders 3 glance summary cards, no modal open by default", () => {
    if (typeof document === "undefined") return;
    setup({ id: "p1", cardio: { fantasticos: [], medSegments: [], diureticSegments: [] } });
    renderCardioManejoCards();
    var container = document.getElementById("med-cardio-cards");
    var cards = container.querySelectorAll(".hf-glance-card");
    assert.equal(cards.length, 3);
    assert.match(cards[0].textContent, /4 Fantásticos \(GDMT\)/);
    assert.match(cards[0].textContent, /0\/4 iniciados/);
    assert.match(cards[1].textContent, /Otros medicamentos/);
    assert.match(cards[1].textContent, /Sin otros medicamentos registrados/);
    assert.match(cards[2].textContent, /Diuréticos/);
    assert.equal(document.getElementById("med-cardio-modal-host").innerHTML, "");
  });

  it("clicking a summary card opens its modal with full content", () => {
    if (typeof document === "undefined") return;
    setup({ id: "p1", cardio: { fantasticos: [], medSegments: [], diureticSegments: [] } });
    renderCardioManejoCards();
    document.querySelector('[data-cardio-modal-open="fantasticos"]').click();
    var modalHost = document.getElementById("med-cardio-modal-host");
    assert.match(modalHost.innerHTML, /modal-backdrop/);
    assert.ok(modalHost.querySelector('select[data-cardio-fant-field="drug"][data-cardio-fant-class="IECA/ARA/ARNI"]'));
  });

  it("editing a field inside the modal persists without the modal closing", () => {
    if (typeof document === "undefined") return;
    setup({ id: "p1", cardio: { fantasticos: [], medSegments: [], diureticSegments: [] } });
    renderCardioManejoCards();
    document.querySelector('[data-cardio-modal-open="fantasticos"]').click();

    var drugSelect = document.querySelector(
      'select[data-cardio-fant-field="drug"][data-cardio-fant-class="IECA/ARA/ARNI"]'
    );
    drugSelect.value = "Enalapril";
    drugSelect.dispatchEvent(new Event("change", { bubbles: true }));

    // modal shell stays mounted (openModalKey survives the persist rerender)
    assert.ok(document.querySelector('[data-cardio-modal-backdrop]'));
    // and the field's new value is reflected on the re-rendered select
    var reselected = document.querySelector(
      'select[data-cardio-fant-field="drug"][data-cardio-fant-class="IECA/ARA/ARNI"]'
    );
    assert.equal(reselected.value, "Enalapril");
  });

  it("closing the modal clears the modal host", () => {
    if (typeof document === "undefined") return;
    setup({ id: "p1", cardio: { fantasticos: [], medSegments: [], diureticSegments: [] } });
    renderCardioManejoCards();
    document.querySelector('[data-cardio-modal-open="otros"]').click();
    assert.ok(document.querySelector('[data-cardio-modal-close]'));
    document.querySelector('[data-cardio-modal-close]').click();
    assert.equal(document.getElementById("med-cardio-modal-host").innerHTML, "");
  });

  it("otros medicamentos suggests GLP-1 RA drugs via datalist (2026 ESC guideline)", () => {
    if (typeof document === "undefined") return;
    setup({ id: "p1", cardio: { fantasticos: [], medSegments: [], diureticSegments: [] } });
    renderCardioManejoCards();
    document.querySelector('[data-cardio-modal-open="otros"]').click();
    var datalist = document.getElementById("cardio-med-tipo-suggestions");
    assert.ok(datalist, "datalist should be rendered in the otros modal");
    var options = Array.from(datalist.querySelectorAll("option")).map((o) => o.value);
    assert.ok(options.includes("Semaglutida"));
    assert.ok(options.includes("Tirzepatida"));
    var input = document.querySelector('[data-cardio-med-new="tipo"]');
    assert.equal(input.getAttribute("list"), "cardio-med-tipo-suggestions");
  });
});
