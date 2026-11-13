import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { normHtml } from './preact-html-compare.mjs';
import {
  handoffFieldsFromContext, vitalsUiFromPlan, vitalsPlanFromUi, handoffContextFromFields, withVasoDefaults,
  initialVitalsPlan, defaultProcedureTimeHHmm,
} from './entrega-modal-state.mjs';

// Markup the string builders in entrega-modal-ui/* and the static form in root.html wrote before the port,
// captured on the synthetic inputs under OLD.cases (no real patients).
const OLD = createRequire(import.meta.url)('./entrega-modal-old-html.json');
const { ctxs, plans, items, actors } = OLD.cases;
const NOW = new Date(2026, 10, 12, 21, 32, 10);
// The vitals summary reads the clock («Finalizado» once the until-time passes); the old markup was captured at NOW.
const atNow = (fn) => () => { mock.timers.enable({ apis: ['Date'], now: NOW }); try { fn(); } finally { mock.timers.reset(); } };

const view = await loadJsx(import.meta.url, `import { ClinicalStatusField, HandoffPanel, VitalsPanel, ProcedimientosPanel, AddProcForm, EntregaModal } from './entrega-modal-view.jsx';
  import { setPatients } from '../app-state.mjs';
  export const seed = () => setPatients([{ id: 'pt-1', name: 'PACIENTE PRUEBA', guardiaEsfuerzo: 'show', guardiaPronostico: 'bad' }, { id: 'pt-2', name: 'SIN MARCAS' }]);
  const noop = () => {};
  export const status = (v) => renderToString(<ClinicalStatusField value={v} onChange={noop} />);
  export const handoff = (f, crit, pid, ui) => renderToString(<HandoffPanel f={f} set={noop} isCritical={crit} setCritical={noop} markPatientId={pid} vitalsUi={ui} setVitalsUi={noop} />);
  export const vitals = (ui) => renderToString(<VitalsPanel ui={ui} setUi={noop} />);
  export const procs = (its, actor) => renderToString(<ProcedimientosPanel items={its} setItems={noop} actor={actor} />);
  export const addForm = (initial, now) => renderToString(<AddProcForm initial={initial} now={now} actor={{ role: 'diurno' }} onAdd={noop} onCancel={noop} />);
  export const modal = (model) => renderToString(<EntregaModal model={model} draftRef={{ current: null }} onCancel={noop} onSubmit={noop} onNav={noop} />);`);
view.seed();

// Serialization only: Preact closes void tags with "/>" and prints `selected` before `value` on options;
// the old builders left a space before ">" on unchecked checkboxes.
const same = (a, b, name) => {
  const n = (s) => normHtml(s.replace(/\s*\n\s*/g, ' ')).replace(/ ?\/>/g, '>').replace(/<\/(polyline|path|circle)>/g, '').replace(/ >/g, '>').replace(/>\s+/g, '>').replace(/\s+</g, '<')
    .replace(/<option selected value(="[^"]*")?(?=[ >])/g, (m, v) => `<option value${v || ''} selected`);
  a = n(a); b = n(b);
  if (a === b) return;
  let i = 0; while (a[i] === b[i]) i++;
  assert.fail(`${name} differs at ${i}\nnew: ...${a.slice(Math.max(0, i - 80), i + 140)}\nold: ...${b.slice(Math.max(0, i - 80), i + 140)}`);
};
const sub = (str, from, to) => { assert.ok(str.includes(from), `fixture lacks: ${from}`); return str.replace(from, () => to); };

const VITALS_SLOT = '<div id="entrega-vitals-panel" class="entrega-vitals-panel"></div>';
const withVitals = (handoffHtml, vitalsHtml) => sub(handoffHtml, VITALS_SLOT, `<div id="entrega-vitals-panel" class="entrega-vitals-panel">${vitalsHtml}</div>`);

test('clinical status select equals the old slot markup', () => {
  same(view.status(ctxs.empty.clinicalStatus), OLD.statusSlot.empty, 'empty');
  same(view.status(ctxs.busy.clinicalStatus), OLD.statusSlot.busy, 'busy');
});

test('vitals panel equals the old markup for interval, shift, routine and a fresh plan', atNow(() => {
  for (const k of ['interval', 'shift', 'routine', 'fresh']) {
    // The old panel always drew the «Sin signos» hint hidden and only unhid it after a mode click; a saved routine plan now shows it.
    const old = k === 'routine' ? sub(OLD.vitals[k], 'entrega-freq-routine-hint is-hidden', 'entrega-freq-routine-hint') : OLD.vitals[k];
    same(view.vitals(vitalsUiFromPlan(plans[k])), old, k);
  }
}));

test('handoff panel equals the old markup (empty, busy, vasopresina, mcg/min, with and without marks)', atNow(() => {
  const ui = vitalsUiFromPlan(plans.interval);
  const cases = [
    ['empty', ctxs.empty, false, ''], ['emptyWithMarks', ctxs.empty, false, 'pt-2'], ['busy', ctxs.busy, true, 'pt-1'],
    ['vasopresina', ctxs.vasopresina, false, ''], ['mcgmin', ctxs.mcgmin, false, ''],
  ];
  for (const [k, ctx, crit, pid] of cases) {
    same(view.handoff(handoffFieldsFromContext(ctx), crit, pid, ui), withVitals(OLD.handoff[k], OLD.vitals.interval), k);
  }
}));

test('procedure list equals the old markup for each actor', () => {
  const ul = (html) => html.match(/<ul id="entrega-proc-list"[^>]*>[\s\S]*?<\/ul>/)[0];
  const wrap = (inner) => `<ul id="entrega-proc-list" class="entrega-proc-list">${inner}</ul>`;
  same(ul(view.procs([], actors.diurno)), wrap(OLD.procList.empty), 'empty');
  same(ul(view.procs(items, actors.diurno)), wrap(OLD.procList.diurno), 'diurno');
  same(ul(view.procs(items, actors.guardia)), wrap(OLD.procList.guardia), 'guardia');
});

test('add-procedure form equals the old markup (default time from `now`, and pre-filled)', () => {
  same(view.addForm({}, NOW), OLD.addForm.blank, 'blank');
  same(view.addForm({ kind: 'otro', label: 'Drenaje "x"', scheduledAt: '23:15', comentado: true, requires: { anestesia: true } }, NOW), OLD.addForm.prefilled, 'prefilled');
  assert.equal(defaultProcedureTimeHHmm(NOW), '21:35');
});

test('whole modal equals the old static form with its slots filled', () => {
  const model = {
    key: 1,
    nav: { name: 'PACIENTE PRUEBA · Cama 4-1', dx: 'NEUMONÍA', counter: '1 de 2', prevDisabled: true, nextDisabled: true },
    title: 'Entrega de paciente',
    covering: { options: [{ value: 'u1', label: 'r1a · Ana (R1)' }, { value: 'u2', label: 'r1b (R1)' }], value: 'u2', hint: 'Residente de guardia.' },
    team: { options: [{ value: 't1', label: 'Equipo A' }], value: 't1', disabled: true, hint: 'Del censo.' },
    flowHint: '', actor: actors.diurno, markPatientId: '',
    initial: { handoff: handoffFieldsFromContext(ctxs.empty), isCritical: false, vitalsUi: vitalsUiFromPlan(plans.fresh), items: [] },
  };
  let old = OLD.skeleton;
  old = sub(old, '<span class="entrega-nav-patient-name" id="entrega-modal-nav-name">—</span>', '<span class="entrega-nav-patient-name" id="entrega-modal-nav-name" title="PACIENTE PRUEBA · Cama 4-1">PACIENTE PRUEBA · Cama 4-1</span>');
  old = sub(old, '<span class="entrega-nav-patient-dx" id="entrega-modal-nav-dx"></span>', '<span class="entrega-nav-patient-dx" id="entrega-modal-nav-dx">NEUMONÍA</span>');
  old = sub(old, '<span class="entrega-nav-counter" id="entrega-modal-nav-counter"></span>', '<span class="entrega-nav-counter" id="entrega-modal-nav-counter">1 de 2</span>');
  old = sub(old, 'entrega-field-hint hidden"></p>\n            <select id="entrega-covering-user" class="profile-input" required></select>',
    'entrega-field-hint">Residente de guardia.</p><select id="entrega-covering-user" class="profile-input" required><option value="u1">r1a · Ana (R1)</option><option value="u2" selected>r1b (R1)</option></select>');
  old = sub(old, 'entrega-field-hint hidden"></p>\n            <select id="entrega-source-team" class="profile-input" required></select>',
    'entrega-field-hint">Del censo.</p><select id="entrega-source-team" class="profile-input" disabled><option value="t1" selected>Equipo A</option></select>');
  old = sub(old, '<div id="entrega-clinical-status-slot" class="field-group"></div>', `<div id="entrega-clinical-status-slot" class="field-group">${OLD.statusSlot.empty}</div>`);
  old = sub(old, '<div id="entrega-handoff-panel" class="entrega-handoff-panel"></div>', `<div id="entrega-handoff-panel" class="entrega-handoff-panel">${withVitals(OLD.handoff.empty, OLD.vitals.fresh)}</div>`);
  old = sub(old, '<ul id="entrega-proc-list" class="entrega-proc-list"></ul>', `<ul id="entrega-proc-list" class="entrega-proc-list">${OLD.procList.empty}</ul>`);
  same(`<div id="entrega-modal-backdrop" class="modal-backdrop entrega-modal-backdrop" aria-hidden="true">${view.modal(model)}</div>`, old, 'modal');
});

test('state helpers: handoff round trip, vaso defaults, vitals UI round trip and legacy frequency', () => {
  const f = handoffFieldsFromContext(ctxs.busy);
  assert.deepEqual(handoffContextFromFields(f), ctxs.busy);
  const dflt = withVasoDefaults({ ...f, vasopressor: { ...f.vasopressor, dose: '9' } }, 'vasopresina');
  assert.equal(dflt.vasopressor.unit, 'ui_min');
  assert.equal(dflt.vasopressor.dose, '0.03');
  for (const k of ['interval', 'shift', 'routine']) assert.deepEqual(vitalsPlanFromUi(vitalsUiFromPlan(plans[k])), plans[k], k);
  const off = vitalsUiFromPlan(plans.interval);
  off.until.interval.on = false;
  assert.equal(vitalsPlanFromUi(off).frequency.untilTime ?? null, null);
  assert.equal(initialVitalsPlan({}).frequency.hours, 2);
});
