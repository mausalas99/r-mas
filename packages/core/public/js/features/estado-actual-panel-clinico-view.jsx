/** Estado actual "Estado clínico general" section (Preact). Loaded lazily from estado-actual-panel-render.mjs. */
import { SOPORTE_OPTIONS } from './estado-actual-panel-constants.mjs';
import { escAttrNumeric } from './estado-actual-panel-format.mjs';
import {
  normalizeSoporteValue,
  soporteTier,
  VM_MODO_OPTIONS,
  buildVentilatorioCalcHints,
} from './estado-actual-ventilatorio.mjs';
import { EaSnapshotSection } from './estado-actual-panel-snapshot-view.jsx';

// Same text the old string builders wrote with escAttr/escHtml: empty for null, undefined, '' and 0.
const txt = (v) => String(v || '');

function KcalKgField({ ec }) {
  return (
    <label class="ea-field">
      <span class="ea-label">Kcal/kg</span>
      <input type="number" class="ea-input" data-ea-ec="kcalKg" step="any" value={txt(ec.kcalKg)} />
    </label>
  );
}

function MacroFields({ ec, kcalDisplay }) {
  return (
    <>
      <label class="ea-field">
        <span class="ea-label">Kcal total</span>
        <input type="number" class="ea-input" data-ea-ec="kcal" step="any" min="0" value={txt(kcalDisplay)} placeholder="Total" />
      </label>
      <label class="ea-field">
        <span class="ea-label">Proteína (g/día)</span>
        <input type="number" class="ea-input" data-ea-ec="proteinG" step="any" min="0" value={txt(ec.proteinG)} placeholder="Gramos" />
      </label>
    </>
  );
}

/** "Peso para cálculo" row: the weight, and a link to Datos del paciente where it is captured. */
function DietWeightRow({ dietWeight }) {
  const has = dietWeight != null;
  return (
    <div class="ea-sys-card ea-sys-card--peso">
      <h4 class="ea-sys-title">Peso para cálculo</h4>
      <div class="ea-sys-fields">
        <span class="ea-peso-value">{has ? [String(dietWeight), ' ', <span class="ea-peso-unit">kg</span>] : '—'}</span>
        <button type="button" class="ea-peso-link" data-onclick="switchInnerTab" data-onclick-args='["datos"]'>
          {has ? 'Datos del paciente' : 'Capturar en Datos del paciente'}
        </button>
      </div>
    </div>
  );
}

const hide = (show) => (show ? undefined : 'display:none');

function NumField({ ec, cls, show, label, k, ph, min = '0', max }) {
  return (
    <label class={'ea-field ' + cls} style={hide(show)}>
      <span class="ea-label">{label}</span>
      <input type="number" class="ea-input" data-ea-ec={k} min={min} max={max} step="any" value={escAttrNumeric(ec[k])} placeholder={ph} />
    </label>
  );
}

function SoporteParams({ ec, tier }) {
  const litros = tier === 'litros';
  const hfnc = tier === 'hfnc';
  const vmni = tier === 'vmni';
  const vm = tier === 'vm';
  const tqt = tier === 'tqt';
  const needsFio2 = hfnc || vmni || vm || tqt;
  return (
    <div class="ea-soporte-params" data-ea-soporte-params="">
      <div class="ea-soporte-params-grid">
        <NumField ec={ec} cls="ea-soporte-tier-litros" show={litros} label="Litros O₂" k="soporteLitros" ph="L/min" />
        <NumField ec={ec} cls="ea-soporte-tier-hfnc" show={hfnc} label="Flujo (L/min)" k="soporteFlujoLmin" ph="60" />
        <NumField ec={ec} cls="ea-soporte-tier-vmni ea-soporte-tier-vm" show={vmni || vm} label="PEEP / EPAP" k="vmPeep" ph="cmH₂O" />
        <NumField ec={ec} cls="ea-soporte-tier-vmni" show={vmni} label="PS (cmH₂O)" k="vmPsoporte" ph="Sobre EPAP" />
        <label class="ea-field ea-soporte-tier-vm" style={hide(vm)}>
          <span class="ea-label">Modo</span>
          <select class="ea-input" data-ea-ec="vmModo">
            {VM_MODO_OPTIONS.map((opt) => (
              <option value={txt(opt.value)} selected={ec.vmModo === opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <NumField ec={ec} cls="ea-soporte-tier-vm" show={vm} label="VT (mL)" k="vmVt" ph="420" />
        <NumField ec={ec} cls="ea-soporte-tier-vm" show={vm} label="Flujo insp." k="vmFlujo" ph="L/min" />
        <NumField ec={ec} cls="ea-soporte-tier-vm" show={vm} label="P meseta" k="vmPmeseta" ph="cmH₂O" />
        <NumField ec={ec} cls="ea-soporte-tier-fio2" show={needsFio2} label="FiO₂ (%)" k="soporteFio2" ph="%" min="21" max="100" />
      </div>
    </div>
  );
}

function SoporteLabFeed({ labCtx }) {
  if (!labCtx || !labCtx.sourceLabel) {
    return (
      <div class="ea-soporte-lab-feed ea-soporte-lab-feed--empty">
        <div class="ea-soporte-lab-feed-label">Expediente</div>
        <div class="ea-soporte-lab-feed-text">Sin gasometría reciente — PaFi usa SpO₂ del pulsioxímetro si hay FiO₂.</div>
      </div>
    );
  }
  const values = [];
  if (labCtx.pO2 != null) values.push('pO₂ ' + labCtx.pO2);
  if (labCtx.pCO2 != null) values.push('pCO₂ ' + labCtx.pCO2);
  return (
    <div class="ea-soporte-lab-feed">
      <div class="ea-soporte-lab-feed-label">Expediente</div>
      <div class="ea-soporte-lab-feed-body">
        <div class="ea-soporte-lab-feed-text">{labCtx.sourceLabel}</div>
        {values.length ? <div class="ea-soporte-lab-feed-values">{values.join(' · ')}</div> : null}
      </div>
    </div>
  );
}

function SoporteCalcHints({ ec, vitalsCtx }) {
  if (!soporteTier(ec.soporte != null ? String(ec.soporte) : '')) return null;
  const hints = buildVentilatorioCalcHints(ec, vitalsCtx || {});
  if (!hints.length) return null;
  return (
    <ul class="ea-soporte-calc-list" data-ea-soporte-calc="">
      {hints.map((h) => <li class="ea-soporte-calc-item">{h}</li>)}
    </ul>
  );
}

/** Soporte label; with gaso/cálculos it is highlighted and hover shows them over the page. */
function SoporteHead({ ec, vitalsCtx }) {
  const tier = soporteTier(ec.soporte != null ? String(ec.soporte) : '');
  if (tier !== 'hfnc' && tier !== 'vmni' && tier !== 'vm' && tier !== 'tqt') {
    return <span class="ea-label">Soporte respiratorio</span>;
  }
  return (
    <div class="ea-soporte-head" tabindex="0">
      <span class="ea-label ea-soporte-label--hints">Soporte respiratorio</span>
      <div class="ea-soporte-insights">
        <SoporteLabFeed labCtx={vitalsCtx && vitalsCtx.lab ? vitalsCtx.lab : null} />
        <SoporteCalcHints ec={ec} vitalsCtx={vitalsCtx} />
      </div>
    </div>
  );
}

function VitalsRow({ ec, vitalsCtx }) {
  const tier = soporteTier(ec.soporte != null ? String(ec.soporte) : '');
  const current = normalizeSoporteValue(ec.soporte);
  return (
    <>
      <div class="ea-sys-card ea-sys-card--neuro">
        <h4 class="ea-sys-title">Neurológico</h4>
        <div class="ea-sys-fields">
          <label class="ea-field">
            <span class="ea-label">FOUR</span>
            <input type="number" class="ea-input" data-ea-ec="four" min="0" max="16" step="1" value={escAttrNumeric(ec.four)} />
          </label>
          <label class="ea-field">
            <span class="ea-label">Esferas</span>
            <input type="number" class="ea-input" data-ea-ec="esferas" min="0" step="1" value={escAttrNumeric(ec.esferas)} />
          </label>
        </div>
      </div>
      <div class="ea-sys-card ea-sys-card--soporte">
        <SoporteHead ec={ec} vitalsCtx={vitalsCtx} />
        <div class="ea-field ea-field--soporte">
          <select class="ea-input" data-ea-ec="soporte" aria-label="Soporte respiratorio">
            {SOPORTE_OPTIONS.map((opt) => <option value={opt} selected={current === opt}>{opt}</option>)}
          </select>
        </div>
        {tier ? (
          <div class="ea-soporte-vent-block" data-ea-soporte-wrap="">
            <SoporteParams ec={ec} tier={tier} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function NutritionRow({ ec, dietPending, dietaSuplemento, kcalDisplay, dietaParenteral }) {
  return (
    <>
      <div class="ea-sys-card ea-sys-card--nutri">
        <h4 class="ea-sys-title">Nutrición</h4>
        <div class="ea-sys-fields">
          <label class="ea-field ea-field--dieta">
            <span class="ea-label">
              Dieta{dietPending ? [' ', <span class="ea-pendiente-badge">Propuesta</span>] : null}
            </span>
            <input type="text" class="ea-input" data-ea-ec="dieta" value={txt(ec.dieta)} />
          </label>
          {dietaSuplemento || dietaParenteral ? null : <KcalKgField ec={ec} />}
        </div>
      </div>
      {dietaSuplemento ? null : (
        <div class="ea-sys-card ea-sys-card--macros">
          <h4 class="ea-sys-title">Macros</h4>
          <div class="ea-sys-fields">
            <MacroFields ec={ec} kcalDisplay={kcalDisplay} />
          </div>
        </div>
      )}
    </>
  );
}

function DietProposalBar({ dietOptions, selectedIndex }) {
  const many = Array.isArray(dietOptions) && dietOptions.length > 1;
  return (
    <div class="ea-diet-proposal-bar">
      {many ? (
        <div class="ea-diet-options" role="radiogroup" aria-label="Opciones de dieta desde SOME">
          <span class="ea-diet-options-lead">Varias dietas detectadas — elige cuál aplicar:</span>
          {dietOptions.map((opt, idx) => (
            <label class="ea-diet-option">
              <input
                type="radio"
                name="ea-diet-option"
                value={String(idx)}
                checked={idx === selectedIndex}
                data-onchange="selectEaDietOption"
                data-onchange-args={'[' + idx + ']'}
              />
              <span>{opt.label || opt.descripcion || 'Opción ' + (idx + 1)}</span>
            </label>
          ))}
        </div>
      ) : null}
      <span class="ea-diet-proposal-lead">Dieta importada desde SOME — revisa los valores y confirma o descarta.</span>
      <div class="ea-diet-proposal-actions">
        <button type="button" class="ea-btn ea-btn--success" data-onclick="confirmEaDietProposal">Confirmar dieta</button>
        <button type="button" class="ea-btn" data-onclick="discardEaDietProposal">Descartar</button>
      </div>
    </div>
  );
}

/**
 * The whole `<details>`. The medication grid is still a string (estado-actual-med-ui.mjs): this
 * leaves its empty frame as the last child of `.ea-clinico-body` and the caller fills it.
 * @param {{ ec: object, dietPending: boolean, dietaSuplemento: boolean, dietaParenteral: boolean,
 *   kcalDisplay: string, dietWeight: number | null, dietOptions?: unknown[], dietOptionSelected?: number,
 *   vitalsCtx?: object, snapshot: object, balGlobal: number, now?: Date }} p
 */
export function EaClinicoSection(p) {
  return (
    <details class="ea-estado-clinico" open>
      <summary>Estado clínico general</summary>
      <div class="ea-clinico-body">
        <div class="ea-top-grid">
          <EaSnapshotSection snapshot={p.snapshot} balGlobal={p.balGlobal} now={p.now} />
          <div class="ea-clinico-grid ea-sys-grid">
            <VitalsRow ec={p.ec} vitalsCtx={p.vitalsCtx} />
            <NutritionRow
              ec={p.ec}
              dietPending={p.dietPending}
              dietaSuplemento={p.dietaSuplemento}
              kcalDisplay={p.kcalDisplay}
              dietaParenteral={p.dietaParenteral}
            />
            {p.dietaSuplemento || p.dietaParenteral ? null : <DietWeightRow dietWeight={p.dietWeight} />}
          </div>
        </div>
        {p.dietPending ? (
          <DietProposalBar dietOptions={p.dietOptions} selectedIndex={p.dietOptionSelected == null ? 0 : p.dietOptionSelected} />
        ) : null}
        <div class="ea-clinico-med-grid" data-ea-med-revealed="[]"></div>
      </div>
    </details>
  );
}
