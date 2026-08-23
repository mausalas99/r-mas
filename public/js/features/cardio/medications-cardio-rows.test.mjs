import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FANTASTICO_ESTADOS,
  fantasticoEstadoMeta,
  normalizeFantasticosRows,
  updateFantasticoField,
  buildSegmentRows,
  diureticTotals,
} from "./medications-cardio-rows.mjs";

describe("fantasticoEstadoMeta", () => {
  it("empty/unknown estado reads as 'No indicado'", () => {
    assert.equal(fantasticoEstadoMeta("").label, "No indicado");
    assert.equal(fantasticoEstadoMeta(undefined).label, "No indicado");
    assert.equal(fantasticoEstadoMeta("bogus").label, "No indicado");
  });
  it("resolves each known state to its label/tone", () => {
    assert.equal(fantasticoEstadoMeta("titulando").tone, "warn");
    assert.equal(fantasticoEstadoMeta("objetivo").label, "Dosis objetivo");
    assert.equal(fantasticoEstadoMeta("contraindicado").tone, "danger");
  });
  it("FANTASTICO_ESTADOS has exactly the 5 states from the plan", () => {
    assert.deepEqual(
      FANTASTICO_ESTADOS.map((e) => e.value),
      ["", "iniciado", "titulando", "objetivo", "contraindicado"]
    );
  });
});

describe("normalizeFantasticosRows", () => {
  it("returns 4 rows in fixed pillar order even from empty input", () => {
    var rows = normalizeFantasticosRows(undefined);
    assert.deepEqual(
      rows.map((r) => r.className),
      ["IECA/ARA/ARNI", "SGLT2i", "Betabloqueador", "MRA"]
    );
    rows.forEach((r) => assert.equal(r.estado, ""));
  });
  it("preserves existing data by className, ignoring unknown classes", () => {
    var rows = normalizeFantasticosRows([
      { className: "SGLT2i", drug: "Dapagliflozina", dosis: "10 mg", estado: "objetivo" },
      { className: "Unknown", drug: "X" },
    ]);
    var sglt = rows.find((r) => r.className === "SGLT2i");
    assert.equal(sglt.drug, "Dapagliflozina");
    assert.equal(sglt.estado, "objetivo");
    assert.equal(rows.length, 4);
  });
  it("drops a drug misplaced from another pillar/diuretics", () => {
    var rows = normalizeFantasticosRows([{ className: "SGLT2i", drug: "Furosemida" }]);
    assert.equal(rows.find((r) => r.className === "SGLT2i").drug, "");
  });
});

describe("updateFantasticoField", () => {
  it("sets a field on the targeted pillar only", () => {
    var rows = updateFantasticoField(undefined, "MRA", "estado", "titulando");
    var mra = rows.find((r) => r.className === "MRA");
    var other = rows.find((r) => r.className === "SGLT2i");
    assert.equal(mra.estado, "titulando");
    assert.equal(other.estado, "");
  });
});

describe("buildSegmentRows", () => {
  it("marks a segment without endedAt as active", () => {
    var rows = buildSegmentRows([{ id: "a", tipo: "Furosemida", endedAt: null, mgTotal: "40" }]);
    assert.equal(rows[0].active, true);
    assert.equal(rows[0].mgTotal, 40);
  });
  it("marks a segment with endedAt as inactive and null-mgTotal stays null", () => {
    var rows = buildSegmentRows([{ id: "b", tipo: "Bumetanida", endedAt: "2026-08-01" }]);
    assert.equal(rows[0].active, false);
    assert.equal(rows[0].mgTotal, null);
  });
  it("ignores non-object entries", () => {
    assert.deepEqual(buildSegmentRows([null, 5, {}]).length, 1);
  });
});

describe("diureticTotals", () => {
  it("sums explicit mgTotal across all diuretics and furosemida separately", () => {
    var segs = [
      { id: "1", tipo: "Furosemida", inicio: "2026-08-10", endedAt: null, mgTotal: 40 },
      { id: "2", tipo: "Bumetanida", inicio: "2026-08-10", endedAt: null, mgTotal: 2 },
    ];
    var totals = diureticTotals(segs, "2026-08-11");
    assert.equal(totals.explicitMgTotal, 42);
    assert.equal(totals.furosemidaMg, 40);
  });
  it("falls back to dosis x days for furosemida when mgTotal is absent", () => {
    var segs = [{ id: "1", tipo: "Furosemida", dosis: "20 mg IV cada 12h", inicio: "2026-08-09" }];
    var totals = diureticTotals(segs, "2026-08-10");
    assert.equal(totals.furosemidaMg, 80);
    assert.equal(totals.explicitMgTotal, 0);
  });
});
