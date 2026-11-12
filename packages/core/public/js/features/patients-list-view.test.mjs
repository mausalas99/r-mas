import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';
import {
  buildPatientListZones, nextPatientListState, emptyPatientListState, messagePatientListState,
  withActivePatient, reorderPatientsByIds, buildRondaNavIds, shouldVirtualizeActiveZone,
} from './patients-list-model.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { INTERCONSULT_SERVICES, hueForRequestingService } from './patient-dashboard/interconsult-catalog.mjs';

const view = await loadJsx(import.meta.url, `import { PatientListView, PatientCard } from './patients-list-view.jsx';
  import { buildCardModel } from './patients-list-model.mjs';
  export { PatientCard, buildCardModel };
  export const html = (state) => renderToString(<PatientListView state={state} h={{}} />);
  export const cardHtml = (c) => renderToString(<PatientCard c={c} />);`);

// Markup the string builders made before the port. Variants: the old renderPatientCardHtml run in Node.
// Lists: #patient-list.innerHTML read from the old code in an Electron window (synthetic DEMO patients).
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const VARIANTS = read('./patients-card-variants.old.json');
const LIST = read('./patients-list-view.old.json');

// Both sides parse to the same DOM: compare tags with sorted, decoded attributes, and decoded text.
const VOID = new Set(['br', 'hr', 'img', 'input']);
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const encText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const encAttr = (s) => encText(s).replace(/"/g, '&quot;');
function normStyle(v) {
  return v.split(';').map((d) => d.trim()).filter(Boolean)
    .map((d) => d.replace(/\s*:\s*/, ':').replace(/\b0px\b/g, '0')).sort().join(';');
}
function normTag(name, attrText, selfClose) {
  const attrs = [];
  attrText.replace(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, (_m, k, a, b, c) => {
    // internal bookkeeping of the old DOM patchers that nothing reads any more
    if (k === 'data-display-key' || k === 'data-active-ids' || k === 'data-ui-tooltip') return '';
    let v = dec(a ?? b ?? c ?? '');
    if (k === 'class') v = v.trim().split(/\s+/).join(' ');
    if (k === 'style') v = normStyle(v);
    if (k === 'style' && !v) return '';
    attrs.push(`${k}="${encAttr(v)}"`);
    return '';
  });
  attrs.sort();
  const open = `<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  return selfClose && !VOID.has(name) ? open + `</${name}>` : open;
}
const norm = (html) => html
  .replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|(<\/\w+>)|([^<]+)/g,
    (_m, name, attrText, self, close, text) => (name ? normTag(name, attrText, self === '/') : close || encText(dec(text))));

// ── Cards ──────────────────────────────────────────────────────────────────
const svcHue = (p) => {
  const name = String(p.consultInfo?.requestingService || '').trim();
  const svc = INTERCONSULT_SERVICES.find((s) => s.name === name);
  return svc ? hueForRequestingService(svc) : null;
};
function variantEnv(e, p) {
  const appMode = e.appMode || 'sala';
  return {
    activeId: e.activeId || null,
    bulkMode: !!e.bulk,
    isBulkSelected: () => e.bulk === 'selected',
    showServicio: appMode !== 'sala',
    showPin: appMode === 'sala' || !!e.guardia,
    mobile: false,
    canDelete: () => e.localOnly !== false,
    isIncomplete: (x) => isPatientAdmissionIncomplete(x, { appMode }),
    svcHue,
    requestingService: (x) => String(x.consultInfo?.requestingService || ''),
  };
}

for (const v of VARIANTS) {
  test(`patient card HTML equals the old builder: ${v.name}`, () => {
    const c = view.buildCardModel(v.patient, variantEnv(v.env, v.patient));
    assert.equal(norm(view.cardHtml(c)), norm(v.html));
  });
}

// ── Lists ──────────────────────────────────────────────────────────────────
const REG = /\d{7}-\d/;
/** Patients the old window showed, rebuilt from its markup (a windowed list only holds the cards in view). */
function patientsFrom(cap, total) {
  const ids = (cap.html.match(/data-active-ids="([^"]*)"/) || [])[1];
  const shown = cap.cards.map((c) => {
    const [nombre, ...rest] = c.title.split(' · ');
    return {
      id: c.id, nombre, registro: rest.find((x) => REG.test(x)) || '', pinned: c.pinned, archived: c.archived,
      incomplete: /patient-card--incomplete/.test(c.cls),
    };
  });
  if (!ids) return shown;
  // a windowed list: the other cards are known by id only (their numbers follow the paste order)
  return ids.split(',').map((id, i) => shown.find((s) => s.id === id)
    || { id, nombre: `DEMO SALA ${i + 1}`, registro: `73${String(100 + i).padStart(5, '0')}-${i % 10}`, incomplete: true });
}
const baseEnv = (activeId) => ({
  activeId, bulkMode: false, isBulkSelected: () => false, showServicio: false, showPin: true, mobile: false,
  canDelete: () => true, isIncomplete: (p) => !!p.incomplete, svcHue: () => null, requestingService: () => '',
});
function listState(cap, win) {
  const patients = patientsFrom(cap);
  const active = cap.cards.find((c) => c.active);
  const zones = buildPatientListZones(patients);
  const prev = { ...emptyPatientListState(), win: win || { scrollTop: 0, height: 0 } };
  return nextPatientListState(prev, zones, baseEnv(active ? active.id : null), /aria-expanded="false"/.test(cap.html));
}

test('list HTML equals the old builder: three zones, pinned + archived', () => {
  const state = listState(LIST.small);
  assert.equal(state.virtual, false);
  assert.equal(state.pinned.length, 1);
  assert.equal(state.archived.length, 1);
  assert.equal(norm(view.html(state)), norm(LIST.small.html));
});

test('list HTML equals the old builder: long list (windowed), top and scrolled', () => {
  for (const [name, win] of [['long', { scrollTop: 0, height: 668 }], ['longScrolled', { scrollTop: LIST.longScrolled.zoneScroll, height: 668 }]]) {
    const state = listState(LIST[name], win);
    assert.equal(state.virtual, true, name);
    assert.equal(state.active.length, 36);
    assert.equal(norm(view.html(state)), norm(LIST[name].html), name);
  }
});

test('empty states equal the old messages', () => {
  const blank = emptyPatientListState();
  assert.equal(norm(view.html(messagePatientListState(blank, 'Sin pacientes aún'))), norm(LIST.empty.html));
  assert.equal(norm(view.html(messagePatientListState(blank, 'Ningún paciente coincide con la búsqueda'))), norm(LIST.noMatch.html));
  // the two other messages: same box; «Sincronizando equipo…» was written with a lighter inline colour
  assert.equal(view.html(messagePatientListState(blank, 'Sincronizando equipo…', 'slate')),
    '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Sincronizando equipo…</div>');
  assert.match(view.html(messagePatientListState(blank, 'Descargando pacientes…')), /^<div style="padding:20px;text-align:center;color:var\(--text-muted\);font-size:13px;">Descargando pacientes…<\/div>$/);
  assert.equal(view.html(blank), '');
});

// ── Updating one card ──────────────────────────────────────────────────────
const demo = (n, extra) => ({ id: `d${n}`, nombre: `DEMO PRUEBA ${n}`, registro: `730000${n}-1`, cuarto: String(100 + n), cama: 'A', servicio: 'MI', ...extra });
const many = (n) => Array.from({ length: n }, (_, i) => demo(i + 1));
const stateOf = (patients, prev, env) => nextPatientListState(prev || emptyPatientListState(), buildPatientListZones(patients), env || baseEnv(null), false);

test('one patient changes: only that card is new, the others are the same objects (the view skips them)', () => {
  const patients = many(8);
  const before = stateOf(patients);
  const edited = patients.map((p) => (p.id === 'd3' ? { ...p, nombre: 'DEMO CAMBIADO 3' } : p));
  const after = stateOf(edited, before);
  after.active.forEach((c, i) => {
    if (c.id === 'd3') assert.notEqual(c, before.active[i]);
    else assert.equal(c, before.active[i], c.id);
  });
  const skip = view.PatientCard.prototype.shouldComponentUpdate;
  assert.equal(skip.call({ props: { c: before.active[0] } }, { c: after.active[0] }), false);
  assert.equal(skip.call({ props: { c: before.active[2] } }, { c: after.active[2] }), true);
  assert.match(view.html(after), /DEMO 3|CAMBIADO/);
});

test('opening another patient changes two cards, no more', () => {
  const before = stateOf(many(8), undefined, baseEnv('d2'));
  const after = withActivePatient(before, 'd5');
  const changed = after.active.filter((c, i) => c !== before.active[i]).map((c) => c.id);
  assert.deepEqual(changed, ['d2', 'd5']);
  assert.equal(after.active.find((c) => c.id === 'd5').active, true);
  assert.match(view.html(after), /class="patient-card active" data-patient-id="d5"/);
  withActivePatient(after, 'd5').active.forEach((c, i) => assert.equal(c, after.active[i]));
  // same answer as building from scratch
  assert.equal(view.html(after), view.html(stateOf(many(8), undefined, baseEnv('d5'))));
});

test('pin moves a card between zones; unchanged cards stay the same objects', () => {
  const patients = many(5);
  const before = stateOf(patients);
  const after = stateOf(patients.map((p) => (p.id === 'd2' ? { ...p, pinned: true } : p)), before);
  assert.deepEqual(after.pinned.map((c) => c.id), ['d2']);
  assert.deepEqual(after.active.map((c) => c.id), ['d1', 'd3', 'd4', 'd5']);
  assert.equal(after.active[0], before.active[0]);
  assert.match(view.html(after), /Fijados<\/span><span class="patient-list-section-count">1</);
});

// ── Dragging ───────────────────────────────────────────────────────────────
const idsInHtml = (html) => [...html.matchAll(/data-patient-id="([^"]*)"/g)].map((m) => m[1]);

test('drag-reorder: the dropped order sticks after the redraw and after another one', () => {
  const patients = many(6);
  const before = stateOf(patients);
  assert.deepEqual(idsInHtml(view.html(before)), ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
  // Sortable reports the order of the cards on drop; the page puts patients in that order and redraws
  reorderPatientsByIds(patients, ['d1', 'd3', 'd4', 'd2', 'd5', 'd6']);
  const after = stateOf(patients, before);
  assert.deepEqual(idsInHtml(view.html(after)), ['d1', 'd3', 'd4', 'd2', 'd5', 'd6']);
  assert.deepEqual(buildRondaNavIds(buildPatientListZones(patients)), ['d1', 'd3', 'd4', 'd2', 'd5', 'd6']);
  const again = stateOf(patients, after);
  assert.deepEqual(idsInHtml(view.html(again)), ['d1', 'd3', 'd4', 'd2', 'd5', 'd6']);
  after.active.forEach((c, i) => assert.equal(again.active[i], c));
});

test('drag-reorder inside one zone leaves the other zones and the unlisted patients where they were', () => {
  const patients = [demo(1, { pinned: true }), demo(2, { pinned: true }), demo(3), demo(4), demo(5, { archived: true })];
  reorderPatientsByIds(patients, ['d2', 'd1', 'd3', 'd4', 'd5']);
  const s = stateOf(patients);
  assert.deepEqual(s.pinned.map((c) => c.id), ['d2', 'd1']);
  assert.deepEqual(s.active.map((c) => c.id), ['d3', 'd4']);
  assert.deepEqual(s.archived.map((c) => c.id), ['d5']);
  const rest = [demo(7), demo(8)];
  reorderPatientsByIds(rest, ['d8']);
  assert.deepEqual(rest.map((p) => p.id), ['d8', 'd7']);
  assert.deepEqual(reorderPatientsByIds([demo(1)], []).map((p) => p.id), ['d1']);
});

// ── Windowing ──────────────────────────────────────────────────────────────
test('a long list draws only the cards in view; scrolling swaps them, the box keeps its full height', () => {
  const patients = many(120);
  assert.equal(shouldVirtualizeActiveZone(30), false);
  assert.equal(shouldVirtualizeActiveZone(31), true);
  const at = (scrollTop) => nextPatientListState({ ...emptyPatientListState(), win: { scrollTop, height: 340 } },
    buildPatientListZones(patients), baseEnv(null), false);
  const top = view.html(at(0));
  assert.deepEqual(idsInHtml(top), ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8']);
  assert.match(top, /class="virtual-scroll-inner" style="position:relative;width:100%;height:8160px"/);
  assert.match(top, /data-virtual-index="0"[^>]*top:0px/);
  const mid = idsInHtml(view.html(at(68 * 50)));
  assert.equal(mid[0], 'd48');
  assert.ok(mid.length <= 11 && mid.includes('d51') && !mid.includes('d1'));
  const end = idsInHtml(view.html(at(1e9)));
  assert.equal(end.at(-1), 'd120');
  assert.ok(end.length <= 11);
  assert.match(view.html(at(0)), /height:340px;flex-shrink:0/);
  // a short list is not windowed
  assert.doesNotMatch(view.html(stateOf(many(30))), /virtual-scroll-inner/);
});

test('the list state is a plain object: archived collapse hides the zone, the toggle stays', () => {
  const patients = [demo(1), demo(2, { archived: true })];
  const open = nextPatientListState(emptyPatientListState(), buildPatientListZones(patients), baseEnv(null), false);
  const shut = nextPatientListState(open, buildPatientListZones(patients), baseEnv(null), true);
  assert.deepEqual(idsInHtml(view.html(open)), ['d1', 'd2']);
  assert.deepEqual(idsInHtml(view.html(shut)), ['d1']);
  assert.match(view.html(shut), /aria-expanded="false">Archivados <span>\(1\)<\/span>/);
});
