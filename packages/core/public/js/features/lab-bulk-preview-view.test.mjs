import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { LabBulkPreviewList } from './lab-bulk-preview-view.jsx';
  export const html = (blocks) => renderToString(<LabBulkPreviewList blocks={blocks} />);`);

// Preact writes void tags as <x/> and leaves '>' unescaped in text; HTML parses both the same.
const norm = (s) => s.replace(/"\/>/g, '">').replace(/&gt;/g, '>');

// Synthetic blocks, and the exact markup renderPreviewList made for them before the port.
const BLOCKS = [
  {
    "status": "ok",
    "patientName": "PACIENTE <UNO> & \"Prueba\"",
    "primaryExpediente": "1001",
    "okReportCount": 2,
    "reportCount": 3,
    "setsAfterMerge": 1,
    "daysLabel": "3 días",
    "patient": {},
    "canProcess": true,
    "reports": [
      {
        "ok": true
      },
      {
        "ok": true
      },
      {
        "ok": false,
        "error": "ruido <x>",
        "expediente": "1001"
      }
    ],
    "rawText": "  línea 1 <b>\nlínea 2 & \"q\"  ",
    "unknownRowNames": [
      "A<1>",
      "B"
    ]
  },
  {
    "status": "no-patient",
    "patientName": "",
    "primaryExpediente": "2002",
    "okReportCount": 1,
    "reportCount": 1,
    "setsAfterMerge": 2,
    "daysLabel": "—",
    "reports": [
      {
        "ok": true
      }
    ]
  },
  {
    "status": "no-patient",
    "patientName": "Repetido",
    "primaryExpediente": "2002",
    "okReportCount": 1,
    "reportCount": 1,
    "setsAfterMerge": 0,
    "reports": [
      {
        "ok": true
      }
    ]
  },
  {
    "status": "mixed-expediente",
    "patientName": "Mezcla",
    "primaryExpediente": "3003",
    "expedientes": [
      "3003",
      "4004"
    ],
    "okReportCount": 1,
    "reportCount": 2,
    "setsAfterMerge": 1,
    "reports": [
      {
        "ok": true
      },
      {
        "ok": false
      },
      {
        "ok": false,
        "error": "e2"
      },
      {
        "ok": false
      },
      {
        "ok": false
      },
      {
        "ok": false
      }
    ],
    "conflictReports": [
      {
        "expediente": "4004"
      },
      {}
    ]
  },
  {
    "status": "parse-errors",
    "primaryExpediente": "",
    "okReportCount": 0,
    "reportCount": 2,
    "reports": [
      {
        "ok": false,
        "expediente": "5"
      }
    ]
  },
  {
    "reports": []
  }
];
const OLD = "<ul class=\"lab-bulk-preview-list\"><li class=\"lab-bulk-preview-row lab-bulk-preview-row--ok\"><div class=\"lab-bulk-preview-row-main\"><div class=\"lab-bulk-preview-row-text\"><div class=\"lab-bulk-preview-row-name\">PACIENTE &lt;UNO&gt; &amp; &quot;Prueba&quot;</div><div class=\"lab-bulk-preview-row-meta\">Exp. 1001 · 2/3 reportes · 1 conjunto · 3 días · 1 omitido</div></div><div class=\"lab-bulk-preview-row-aside\"><span class=\"lab-bulk-preview-status lab-bulk-preview-status--ok\">Listo</span></div></div><details class=\"lab-bulk-preview-issues\"><summary>1 reporte omitido (ruido del portal)</summary><ul><li><span class=\"lab-bulk-preview-issue-label\">Exp. 1001</span> ruido &lt;x&gt;</li></ul></details><div class=\"lab-bulk-preview-unknown-rows\">2 filas no reconocidas no se guardaron: A&lt;1&gt;, B</div><details class=\"lab-bulk-preview-rawtext\"><summary>Ver texto (25 caracteres)</summary><pre>línea 1 &lt;b&gt;\nlínea 2 &amp; &quot;q&quot;</pre></details></li><li class=\"lab-bulk-preview-row lab-bulk-preview-row--no-patient\"><div class=\"lab-bulk-preview-row-main\"><div class=\"lab-bulk-preview-row-text\"><div class=\"lab-bulk-preview-row-name\">—</div><div class=\"lab-bulk-preview-row-meta\">Exp. 2002 · 1/1 reportes · 2 conjuntos</div></div><div class=\"lab-bulk-preview-row-aside\"><span class=\"lab-bulk-preview-status lab-bulk-preview-status--err\">Paciente no encontrado</span><button type=\"button\" class=\"wb-btn wb-btn-secondary lab-bulk-preview-add-btn\" data-bulk-block-idx=\"1\" title=\"Registrar paciente con datos del reporte\">Agregar al censo</button></div></div></li><li class=\"lab-bulk-preview-row lab-bulk-preview-row--no-patient\"><div class=\"lab-bulk-preview-row-main\"><div class=\"lab-bulk-preview-row-text\"><div class=\"lab-bulk-preview-row-name\">Repetido</div><div class=\"lab-bulk-preview-row-meta\">Exp. 2002 · 1/1 reportes</div></div><div class=\"lab-bulk-preview-row-aside\"><span class=\"lab-bulk-preview-status lab-bulk-preview-status--muted\">Repetido: se agrega con el de arriba</span></div></div></li><li class=\"lab-bulk-preview-row lab-bulk-preview-row--mixed-expediente\"><div class=\"lab-bulk-preview-row-main\"><div class=\"lab-bulk-preview-row-text\"><div class=\"lab-bulk-preview-row-name\">Mezcla</div><div class=\"lab-bulk-preview-row-meta\">Exp. 3003 y Exp. 4004 · 1/2 reportes · 1 conjunto · 5 omitidos</div></div><div class=\"lab-bulk-preview-row-aside\"><span class=\"lab-bulk-preview-status lab-bulk-preview-status--warn\">Posible mezcla de 2 pacientes — no guardado</span></div></div><details class=\"lab-bulk-preview-issues\"><summary>5 reportes omitidos (ruido del portal)</summary><ul><li><span class=\"lab-bulk-preview-issue-label\">Reporte 1</span> No se pudo parsear</li><li><span class=\"lab-bulk-preview-issue-label\">Reporte 2</span> e2</li><li><span class=\"lab-bulk-preview-issue-label\">Reporte 3</span> No se pudo parsear</li><li>+2 más</li></ul></details><details class=\"lab-bulk-preview-issues lab-bulk-preview-conflicts\"><summary>2 reportes excluidos (otro expediente, no se guardó)</summary><ul><li><span class=\"lab-bulk-preview-issue-label\">Exp. 4004</span> no coincide con Mezcla (3003) — posible otro ingreso u otro paciente</li><li><span class=\"lab-bulk-preview-issue-label\">Reporte</span> no coincide con Mezcla (3003) — posible otro ingreso u otro paciente</li></ul></details></li><li class=\"lab-bulk-preview-row lab-bulk-preview-row--parse-errors\"><div class=\"lab-bulk-preview-row-main\"><div class=\"lab-bulk-preview-row-text\"><div class=\"lab-bulk-preview-row-name\">—</div><div class=\"lab-bulk-preview-row-meta\">Sin expediente · 2 reportes · 1 omitido</div></div><div class=\"lab-bulk-preview-row-aside\"><span class=\"lab-bulk-preview-status lab-bulk-preview-status--err\">Error al parsear</span></div></div><details class=\"lab-bulk-preview-issues\"><summary>1 reporte omitido (ruido del portal)</summary><ul><li><span class=\"lab-bulk-preview-issue-label\">Exp. 5</span> No se pudo parsear</li></ul></details></li><li class=\"lab-bulk-preview-row lab-bulk-preview-row--unknown\"><div class=\"lab-bulk-preview-row-main\"><div class=\"lab-bulk-preview-row-text\"><div class=\"lab-bulk-preview-row-name\">—</div><div class=\"lab-bulk-preview-row-meta\">Sin expediente</div></div><div class=\"lab-bulk-preview-row-aside\"><span class=\"lab-bulk-preview-status lab-bulk-preview-status--muted\">—</span></div></div></li></ul>";

test('bulk preview list HTML equals the old builder', () => {
  assert.equal(norm(view.html(BLOCKS)), norm(OLD));
});
test('no blocks gives an empty list', () => {
  assert.equal(view.html([]), '<ul class="lab-bulk-preview-list"></ul>');
});
