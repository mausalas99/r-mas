/**
 * VPO calculator inputs: the «Datos del paciente» card and the «Otras escalas» dialog inside the
 * Riesgo preoperatorio card. Preact (Phase 0 spike): it draws the same DOM, ids and data-vpo-*
 * attributes the old string builder did. vpo-panel.mjs still owns every event listener.
 */
import { render } from 'preact';
import { Button, Dialog } from '../ui-kit/kit.jsx';
import { useStore } from '../ui-kit/use-store.mjs';
import { vpoOpenDialog, vpoScaleTab } from './vpo-ui-state.mjs';
import { ASA_OPTIONS, PROCEDURES } from '../vpo-lookups.mjs';
import { buildScaleLines, CALC_FLAGS, MODIFIER_KEYS, OPTIONAL_SCALES, PROCEDURE_ES } from '../vpo-calc.mjs';
import { AHA_RISK_MODIFIERS } from '../vpo-scores.mjs';

const ASA_ES = { I: 'sano', II: 'enfermedad leve', III: 'enfermedad severa', IV: 'amenaza constante', V: 'moribundo' };
const FUNC_OPTS = [['independent', 'Independiente'], ['partially-dependent', 'Parcialmente dependiente'], ['totally-dependent', 'Totalmente dependiente']];
const CFS_NAMES = ['Muy en forma', 'En forma', 'Manejando bien', 'Vulnerable', 'Levemente frágil', 'Moderadamente frágil', 'Severamente frágil', 'Muy severamente frágil', 'Enfermo terminal'];

const SELECTS = [
  ['calc', 'sepsis', 'Sepsis', [['none', 'Ninguna'], ['sirs', 'SIRS'], ['sepsis', 'Sepsis'], ['shock', 'Choque séptico']]],
  ['calc', 'mets', 'Capacidad funcional', [['ge4', '≥4 METs'], ['lt4', '<4 METs']]],
  ['calc', 'cfs', 'Fragilidad (CFS)', CFS_NAMES.map((n, i) => [String(i + 1), i + 1 + ' · ' + n])],
  ['calc', 'caprRecent', 'Caprini: evento reciente', [['0', 'Ninguno'], ['1', 'Cirugía mayor, ICC, sepsis o neumonía'], ['2', 'Yeso inmovilizador'], ['5', 'Fractura de cadera o pierna, EVC, politrauma']]],
  ['calc', 'caprVenous', 'Caprini: enfermedad venosa', [['0', 'Ninguna'], ['1', 'Várices o piernas hinchadas'], ['2', 'Acceso venoso central'], ['3', 'TVP o TEP previo, trombofilia']]],
  ['calc', 'caprMobility', 'Caprini: movilidad', [['0', 'Normal'], ['1', 'Reposo en cama'], ['2', 'Postrado >72 h']]],
];

/** Chips shown on the card: the common conditions. The other yes/no inputs sit under «Más datos». */
const MAIN_CHIPS = ['ischemic', 'hf', 'cva', 'copd', 'smoker'];
const CHIP_FLAGS = [['htn', 'Hipertensión'], ['dm', 'Diabetes']].concat(CALC_FLAGS.filter((f) => MAIN_CHIPS.includes(f[0])));
const MORE_FLAGS = CALC_FLAGS.filter((f) => !MAIN_CHIPS.includes(f[0]));

const text = (v) => (v == null ? '' : String(v));

/** @param {{ attr: string, k: string, label: string, list: string[][], value: unknown, blank?: boolean }} p */
function SelectCell({ attr, k, label, list, value, blank }) {
  const cur = String(value || '');
  return (
    <label class="vpo-scale-cell">
      <span class="vpo-scale-label">{label}</span>
      <select class="ea-input" {...{ [attr]: k }}>
        {blank && <option value="">—</option>}
        {list.map((o) => (
          <option key={o[0]} value={o[0]} selected={String(o[0]) === cur}>{o[1]}</option>
        ))}
      </select>
    </label>
  );
}

function CheckCell({ k, label, checked }) {
  return (
    <label class="vpo-chk">
      <input type="checkbox" data-vpo-calc={k} checked={!!checked} />
      {label}
    </label>
  );
}

function NumField({ state, k, label }) {
  return (
    <label class="vpo-scale-cell">
      <span class="vpo-scale-label">{label}</span>
      <input type="text" class="ea-input" data-vpo-field={k} value={text(state[k])} autocomplete="off" />
    </label>
  );
}

/** One scale's inputs: numbers and selects, chips, then a Calcular button per result with its live result or what is missing. */
function ScalePanel({ sc, c, sr, lines }) {
  const buttons = sc.buttons || [[sc.key, 'Calcular ' + sc.label]];
  const nums = sc.numbers || [];
  const sels = sc.selects || [];
  return (
    <>
      {(nums.length || sels.length) > 0 && (
        <div class="vpo-fields">
          {nums.map((n) => (
            <label class="vpo-scale-cell" key={n[0]}>
              <span class="vpo-scale-label">{n[1]}</span>
              <input type="text" class="ea-input" data-vpo-calc={n[0]} value={text(c[n[0]])} autocomplete="off" />
            </label>
          ))}
          {sels.map((q) => (
            <SelectCell key={q[0]} attr="data-vpo-calc" k={q[0]} label={q[1]} list={q[2]} value={c[q[0]]} blank />
          ))}
        </div>
      )}
      <div class="vpo-chk-grid">
        {sc.flags.map((f) => <CheckCell key={f[0]} k={f[0]} label={f[1]} checked={c[f[0]]} />)}
      </div>
      {buttons.map((b) => {
        const miss = !sr[b[0]] && lines[b[0]] && lines[b[0]].missing;
        return (
          <div class="vpo-calc-actions" key={b[0]}>
            {sr[b[0]] ? <span class="vpo-tab-result">{sr[b[0]]}</span> : miss ? <span class="vpo-row-miss">Falta: {miss.join(', ')}</span> : null}
            <Button data-vpo-calc-one={b[0]}>{b[1]}</Button>
          </div>
        );
      })}
    </>
  );
}

/** «Otras escalas» dialog: one scale at a time, picked from a row of tabs. Tab and open state live in vpo-ui-state.mjs. */
function OptionalScalesDialog({ state }) {
  const tab = useStore(vpoScaleTab);
  const openKey = useStore(vpoOpenDialog);
  const c = state.calc || {};
  const sr = state.scaleResults || {};
  const lines = buildScaleLines(state);
  const cur = OPTIONAL_SCALES.some((sc) => sc.key === tab) ? tab : OPTIONAL_SCALES[0].key;
  return (
    <Dialog
      title="Otras escalas"
      class="vpo-dialog vpo-dialog--wide"
      headClass="vpo-dialog-head"
      titleClass="vpo-section-title"
      closeProps={{ 'data-vpo-close': true }}
      data-vpo-dialog="scales"
      open={openKey === 'scales'}
      onClose={() => vpoOpenDialog.get() === 'scales' && vpoOpenDialog.set('')}
    >
      <SelectCell attr="data-vpo-calc" k="sex" label="Sexo" list={[['M', 'Masculino'], ['F', 'Femenino']]} value={c.sex} blank />
      <div class="vpo-tabs" role="tablist">
        {OPTIONAL_SCALES.map((sc) => (
          <button type="button" role="tab" class="vpo-tab" data-vpo-tab={sc.key} aria-selected={String(sc.key === cur)} onClick={() => vpoScaleTab.set(sc.key)} key={sc.key}>{sc.label}</button>
        ))}
      </div>
      {OPTIONAL_SCALES.map((sc) => (
        <section role="tabpanel" class="vpo-tab-panel" data-vpo-panel={sc.key} hidden={sc.key !== cur} key={sc.key}>
          <ScalePanel sc={sc} c={c} sr={sr} lines={lines} />
        </section>
      ))}
    </Dialog>
  );
}

/**
 * Card «Datos del paciente»: 8 main fields, condition chips, the rest under «Más datos».
 * @param {{ state: any }} props state is the VPO state
 */
export function CalcForm({ state }) {
  const c = state.calc || {};
  const procs = PROCEDURES.map((p) => [p.id, PROCEDURE_ES[p.id] || p.labelEn]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const asaList = ASA_OPTIONS.map((a) => [a.key, 'ASA ' + a.asaClass + ' · ' + ASA_ES[a.asaClass]]);
  const cfs = SELECTS.find((q) => q[1] === 'cfs');
  const more = SELECTS.filter((q) => q !== cfs);
  return (
    <>
      <div class="vpo-card">
        <h4 class="vpo-card-title">Datos del paciente</h4>
        <div class="vpo-fields">
          <NumField state={state} k="edad" label="Edad" />
          <SelectCell attr="data-vpo-field" k="asaKey" label="ASA" list={asaList} value={state.asaKey} blank />
          <NumField state={state} k="creatinina" label="Creatinina (mg/dL)" />
          <NumField state={state} k="spo2" label="SpO₂ (%)" />
          <SelectCell attr="data-vpo-field" k="procedureId" label="Cirugía" list={procs} value={state.procedureId} blank />
          <NumField state={state} k="duracionCirugiaHoras" label="Duración (h)" />
          <NumField state={state} k="hemoglobina" label="Hemoglobina (g/dL)" />
          <SelectCell attr="data-vpo-calc" k={cfs[1]} label={cfs[2]} list={cfs[3]} value={c.cfs} blank />
        </div>
        <div class="vpo-chip-row">
          <div class="vpo-chk-grid">
            {CHIP_FLAGS.map((f) => <CheckCell key={f[0]} k={f[0]} label={f[1]} checked={c[f[0]]} />)}
          </div>
          <div class="vpo-calc-actions">
            <Button data-vpo-action="calc-fill">Tomar de R+</Button>
            <Button primary data-vpo-action="calc-all">Calcular todo</Button>
          </div>
        </div>
        <details class="vpo-more">
          <summary class="ea-io-link">Más datos</summary>
          <div class="vpo-fields">
            <SelectCell attr="data-vpo-field" k="functionalKey" label="Estado funcional" list={FUNC_OPTS} value={state.functionalKey} />
            {more.map((q) => <SelectCell key={q[1]} attr="data-vpo-calc" k={q[1]} label={q[2]} list={q[3]} value={c[q[1]]} blank={q[1] !== 'sepsis'} />)}
          </div>
          <div class="vpo-chk-grid">
            {MORE_FLAGS.map((f) => <CheckCell key={f[0]} k={f[0]} label={f[1]} checked={c[f[0]]} />)}
          </div>
          <span class="vpo-scale-label">Modificadores de riesgo AHA/ACC</span>
          <div class="vpo-chk-grid">
            {AHA_RISK_MODIFIERS.map((m, i) => <CheckCell key={MODIFIER_KEYS[i]} k={MODIFIER_KEYS[i]} label={m} checked={c[MODIFIER_KEYS[i]]} />)}
          </div>
        </details>
      </div>
      <OptionalScalesDialog state={state} />
    </>
  );
}

/** Draw the form into the empty `.vpo-risk-in` host that vpo-panel.mjs just wrote. @param {ParentNode} mount */
export function mountCalcForm(mount, state) {
  const host = mount.querySelector('.vpo-risk-in');
  if (host) render(<CalcForm state={state} />, host);
}

/** Tear the form down before the panel's innerHTML is replaced, so Preact drops its tree. @param {ParentNode} mount */
export function unmountCalcForm(mount) {
  const host = mount.querySelector('.vpo-risk-in');
  if (host) render(null, host);
}

/** Where «Completar» sends focus, by the name a scale reports as missing. */
const MISSING_FIELD = {
  edad: '[data-vpo-field="edad"]', 'cirugía': '[data-vpo-field="procedureId"]', ASA: '[data-vpo-field="asaKey"]',
  'SpO₂': '[data-vpo-field="spo2"]', 'duración': '[data-vpo-field="duracionCirugiaHoras"]', hemoglobina: '[data-vpo-field="hemoglobina"]',
  CFS: '[data-vpo-calc="cfs"]', METs: '[data-vpo-calc="mets"]', sexo: '[data-vpo-calc="sex"]',
};

/** Open and focus the first input that a scale lacks. @param {ParentNode} mount @param {string} missing names joined by | */
export function focusMissingInput(mount, missing) {
  const key = Object.keys(MISSING_FIELD).find((k) => missing.indexOf(k) >= 0);
  const el = key && mount.querySelector(MISSING_FIELD[key]);
  if (!el) return;
  for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
  el.focus();
  el.scrollIntoView({ block: 'center' });
}
