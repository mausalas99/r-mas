import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { censoDatosProps } from './patient-data-censo-ui.mjs';

const view = await loadJsx(import.meta.url, `import { CensoList, CensoCount } from './patient-data-censo-view.jsx';
  export const list = (p) => renderToString(<CensoList {...p} />);
  export const count = (p) => renderToString(<CensoCount {...p} />);`);

// Exact markup censoListHtml / censoCountHtml made before the port (captured from the old code).
const OLD = {
 "atbEdit": "<ul class=\"exp-datos-list exp-datos-list--chips\" id=\"patient-censo-atb\"><li><button type=\"button\" class=\"exp-datos-line\" data-line=\"0\" data-onclick=\"editCensoLine\" data-onclick-args='[\"atb\",0]' aria-label=\"Editar Ceftriaxona · Día 3\"><span class=\"exp-datos-line__t\">Ceftriaxona</span><span class=\"exp-datos-tag\">Día 3</span></button></li><li><input type=\"text\" class=\"exp-datos-q\" value=\"Vancomicina\" aria-label=\"Antibiótico 2\" data-onkeydown=\"onCensoLineKey\" data-onkeydown-keys=\"Enter,Escape\" data-onkeydown-args='[\"atb\",1]' data-onkeydown-pass=\"event\" data-onblur=\"commitCensoLine\" data-onblur-args='[\"atb\",1]' data-onblur-pass=\"event\"></li></ul>",
 "medsEdit": "<ul class=\"exp-datos-list exp-datos-list--chips\" id=\"patient-censo-meds\"><li><input type=\"text\" class=\"exp-datos-q\" value=\"Omeprazol\" aria-label=\"Medicamento 1\" data-onkeydown=\"onCensoLineKey\" data-onkeydown-keys=\"Enter,Escape\" data-onkeydown-args='[\"meds\",0]' data-onkeydown-pass=\"event\" data-onblur=\"commitCensoLine\" data-onblur-args='[\"meds\",0]' data-onblur-pass=\"event\"></li><li><button type=\"button\" class=\"exp-datos-line exp-datos-line--toggle\" data-onclick=\"toggleCensoMed\" data-onclick-args=\"[1]\" aria-label=\"Tachar Paracetamol · Día 2\"><span class=\"exp-datos-line__t\">Paracetamol</span><span class=\"exp-datos-tag\">Día 2</span></button></li></ul>",
 "medsView": "<ul class=\"exp-datos-list exp-datos-list--chips\" id=\"patient-censo-meds\"><li><button type=\"button\" class=\"exp-datos-line exp-datos-line--toggle\" data-onclick=\"toggleCensoMed\" data-onclick-args=\"[0]\" aria-label=\"Tachar Omeprazol\"><span class=\"exp-datos-line__t\">Omeprazol</span></button></li><li><button type=\"button\" class=\"exp-datos-line exp-datos-line--toggle\" data-onclick=\"toggleCensoMed\" data-onclick-args=\"[1]\" aria-label=\"Tachar Paracetamol · Día 2\"><span class=\"exp-datos-line__t\">Paracetamol</span><span class=\"exp-datos-tag\">Día 2</span></button></li><li><button type=\"button\" class=\"exp-datos-line exp-datos-line--struck\" data-onclick=\"toggleCensoMed\" data-onclick-args=\"[2]\" aria-label=\"Restaurar Heparina\"><span class=\"exp-datos-line__t\">Heparina</span></button></li></ul>",
 "atbView": "<ul class=\"exp-datos-list exp-datos-list--chips\" id=\"patient-censo-atb\"><li><button type=\"button\" class=\"exp-datos-line\" data-line=\"0\" data-onclick=\"editCensoLine\" data-onclick-args='[\"atb\",0]' aria-label=\"Editar Ceftriaxona · Día 3\"><span class=\"exp-datos-line__t\">Ceftriaxona</span><span class=\"exp-datos-tag\">Día 3</span></button></li><li><button type=\"button\" class=\"exp-datos-line\" data-line=\"1\" data-onclick=\"editCensoLine\" data-onclick-args='[\"atb\",1]' aria-label=\"Editar Vancomicina\"><span class=\"exp-datos-line__t\">Vancomicina</span><span class=\"exp-datos-tag exp-datos-tag--muted\">sin día</span></button></li></ul>",
 "atbEmpty": "<ul class=\"exp-datos-list exp-datos-list--chips\" id=\"patient-censo-atb\"><li><button type=\"button\" class=\"exp-datos-line exp-datos-line--empty\" data-onclick=\"editCensoLine\" data-onclick-args='[\"atb\",0]'>Sin antibióticos · clic para agregar</button></li></ul>",
 "medsEmpty": "<ul class=\"exp-datos-list exp-datos-list--chips\" id=\"patient-censo-meds\"><li><button type=\"button\" class=\"exp-datos-line exp-datos-line--empty\" data-onclick=\"editCensoLine\" data-onclick-args='[\"meds\",0]'>Sin medicamentos · clic para agregar</button></li></ul>",
 "count": "<span class=\"exp-datos-sec__count\" id=\"patient-censo-atb-count\">· 2</span>",
 "countZero": "<span class=\"exp-datos-sec__count\" id=\"patient-censo-meds-count\"></span>"
};
const norm = (s) => s
  .replace(/ (data-on\w+-args)='([^']*)'/g, (_, k, val) => ` ${k}="${val.replace(/"/g, '&quot;')}"`)
  .replace(/ value>/g, ' value="">').replace(/"\/>/g, '">').replace(/&gt;/g, '>');
const sortAttrs = (s) => s.replace(/<([a-z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*")?)+)\s*>/g, (_, tag, attrs) =>
  `<${tag} ${(attrs.match(/[^\s=]+(?:="[^"]*")?/g) || []).sort().join(' ')}>`);
const same = (got, old) => assert.equal(sortAttrs(norm(got)), sortAttrs(norm(old)));

const p = censoDatosProps({ id: 'p1', censoAtbText: 'Ceftriaxona · Día 3\nVancomicina', censoMedsText: 'Omeprazol\nParacetamol · Día 2', censoMedsStruckText: 'Heparina' });
const e = censoDatosProps({ id: 'p2' });
// Edit mode hides the crossed-out list, like the old censoListHtml.
const editing = (list, editIndex) => ({ ...list, editIndex, struck: [] });

test('atb / meds lists equal the old builder', () => {
  same(view.list(p.atb.list), OLD.atbView);
  same(view.list(p.meds.list), OLD.medsView);
  same(view.list(e.atb.list), OLD.atbEmpty);
  same(view.list(e.meds.list), OLD.medsEmpty);
});
test('line being edited equals the old builder', () => {
  same(view.list(editing(p.atb.list, 1)), OLD.atbEdit);
  same(view.list(editing(p.meds.list, 0)), OLD.medsEdit);
});
test('count equals the old builder', () => {
  same(view.count({ kind: 'atb', count: p.atb.count }), OLD.count);
  same(view.count({ kind: 'meds', count: e.meds.count }), OLD.countZero);
});
