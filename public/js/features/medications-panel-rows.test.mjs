import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { countMedTurnoItems, buildMedTurnoHeaderText } from "./medications-panel-rows.mjs";

function med(nombreRaw, extra) {
  return Object.assign({ id: nombreRaw, nombreRaw: nombreRaw }, extra || {});
}

describe("countMedTurnoItems — separa apoyo (O₂) de medicamentos reales", () => {
  it("cuenta 11 medicamentos y 1 apoyo, como en el mock de Manejo (L2089)", () => {
    var items = [
      med("CEFTRIAXONA 1 G IV C/12 H"),
      med("CLARITROMICINA 500 MG IV C/12 H"),
      med("ENOXAPARINA 40 MG SC C/24 H"),
      med("INSULINA RAPIDA ESQUEMA"),
      med("KCL 20 MEQ EN 500 ML IV"),
      med("BICARBONATO DE SODIO 50 MEQ IV"),
      med("SOL. FISIOLOGICA 0.9% 80 ML/H"),
      med("ENALAPRIL 5 MG VO C/12 H"),
      med("FUROSEMIDA 20 MG IV C/24 H"),
      med("SALBUTAMOL 2 DISPAROS C/6 H"),
      med("PARACETAMOL 1 G IV C/8 H"),
      med("OXIGENO · MASCARILLA RESERVORIO 10 L/MIN"),
    ];
    var counts = countMedTurnoItems(items);
    assert.equal(counts.medCount, 11);
    assert.equal(counts.apoyoCount, 1);
    assert.deepEqual(counts.apoyoKinds, ["oxigeno"]);
  });

  it("no cuenta nada de una lista vacía o inválida", () => {
    assert.deepEqual(countMedTurnoItems([]), { medCount: 0, apoyoCount: 0, apoyoKinds: [] });
    assert.deepEqual(countMedTurnoItems(null), { medCount: 0, apoyoCount: 0, apoyoKinds: [] });
  });

  it("suma varios apoyos del mismo tipo sin duplicar el tipo en apoyoKinds", () => {
    var items = [
      med("OXIGENO PUNTAS NASALES 2 L/MIN"),
      med("OXIGENO MASCARILLA SIMPLE 5 L/MIN"),
      med("ENALAPRIL 5 MG VO C/12 H"),
    ];
    var counts = countMedTurnoItems(items);
    assert.equal(counts.medCount, 1);
    assert.equal(counts.apoyoCount, 2);
    assert.deepEqual(counts.apoyoKinds, ["oxigeno"]);
  });
});

describe("countMedTurnoItems — fusiona reposición de potasio en un solo medicamento", () => {
  it("cuenta KCl + KPO4 + diluyente HARTMANN como 1 medicamento", () => {
    var items = [
      med("CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)", {
        viaRaw: "VIA INTRAVENOSA",
        dosisRaw: "80 MEQ",
        frecuenciaRaw: "-",
      }),
      med("FOSFATO DE POTASIO 20 MEQ SOL INY 10 ML (+)", {
        viaRaw: "VIA INTRAVENOSA",
        dosisRaw: "40 MEQ",
        frecuenciaRaw: "-",
      }),
      med("HARTMANN SOL INY 1000 ML", {
        viaRaw: "VIA INTRAVENOSA",
        dosisRaw: "1000 ML / VEL.INF: PARA 12 HORAS",
        frecuenciaRaw: "UNICA VEZ",
      }),
      med("ENALAPRIL 5 MG VO C/12 H"),
    ];
    var counts = countMedTurnoItems(items);
    assert.equal(counts.medCount, 2);
    assert.equal(counts.apoyoCount, 0);
  });
});

describe("buildMedTurnoHeaderText — título + texto secundario del header de Manejo", () => {
  it('arma "Medicamentos del turno · 11" + "más 1 apoyo (O₂)"', () => {
    var text = buildMedTurnoHeaderText({ medCount: 11, apoyoCount: 1, apoyoKinds: ["oxigeno"] });
    assert.equal(text.title, "Medicamentos del turno · 11");
    assert.equal(text.secondary, "más 1 apoyo (O₂)");
  });

  it("pluraliza apoyos y omite el texto secundario si no hay apoyo", () => {
    var withTwo = buildMedTurnoHeaderText({ medCount: 5, apoyoCount: 2, apoyoKinds: ["oxigeno"] });
    assert.equal(withTwo.secondary, "más 2 apoyos (O₂)");
    var withNone = buildMedTurnoHeaderText({ medCount: 5, apoyoCount: 0, apoyoKinds: [] });
    assert.equal(withNone.title, "Medicamentos del turno · 5");
    assert.equal(withNone.secondary, "");
  });
});
