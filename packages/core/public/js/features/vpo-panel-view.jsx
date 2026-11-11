/**
 * VPO panel drawing (Preact). It draws the same DOM, classes and data-vpo-* attributes the old
 * string builders did; vpo-panel.mjs still owns data rules, listeners and callbacks.
 * The calculator inputs live in vpo-calc-form.jsx and mount into the empty `.vpo-risk-in` host.
 */
import { render } from 'preact';
import { VPO_SUGGESTED_SCALES, VPO_OFFICIAL_CALCULATOR_DISCLAIMER } from '../vpo-text.mjs';

/* UI copy only. Copy-output labels stay in vpo-text.mjs. */
const VPO_SCALE_UI_LABEL = { rcri: 'RCRI (Lee)', ahaCv: 'Riesgo CV AHA/ACC', ahaSurg: 'Riesgo quirúrgico AHA/ACC', guptaResp: 'Gupta resp.', guptaPneu: 'Gupta neumonía' };

/** Results shown in three cards by system; keys not listed here land in the last card. */
const VPO_GROUPS = [
  ['Función', ['mets', 'abvd', 'cfs', 'asa', 'nrs', 'awol']],
  ['Cardiaco', ['ahaSurg', 'ahaCv', 'ahaMod', 'rcri', 'gupta', 'aub', 'chads', 'escSurg', 'hasbled']],
  ['Pulmonar y trombosis', null],
];
const NAMED = [].concat(...VPO_GROUPS.map((g) => g[1] || []));

const OPEN_BUTTONS = [['ekg', 'EKG'], ['rx', 'Rx de tórax'], ['dx', 'Diagnósticos'], ['farm', 'Fármacos'], ['scales', 'Otras escalas']];

/** Same blanking as the old esc(): null, undefined, 0 and false draw as nothing. */
const t = (v) => (v ? String(v) : '');

/** Results: one row per scale, grouped in cards. A scale without data shows what it lacks and a «Completar» button. */
function ScaleRows({ state, calc, lines }) {
  const sr = state.scaleResults;
  const shown = VPO_SUGGESTED_SCALES.filter((s) => !s.optional || String(sr[s.key] || '').trim());
  const row = (s) => {
    const miss = !String(sr[s.key] || '').trim() && lines[s.key] && lines[s.key].missing;
    return (
      <div class="vpo-row" title={s.hint}>
        <span class="vpo-row-name">{VPO_SCALE_UI_LABEL[s.key] || s.label}</span>
        {miss ? (
          <>
            <span class="vpo-row-miss">Falta: {miss.join(', ')}</span>
            <button type="button" class="wb-btn" data-vpo-complete={miss.join('|')}>Completar</button>
          </>
        ) : (
          <input type="text" class="vpo-row-val" data-vpo-scale={s.key} value={t(sr[s.key])} placeholder={calc ? 'Calcular todo' : ''} autocomplete="off" aria-label={s.label} />
        )}
      </div>
    );
  };
  return (
    <div class="vpo-rows">
      {VPO_GROUPS.map((g) => {
        const list = shown.filter((s) => (g[1] ? g[1].indexOf(s.key) >= 0 : NAMED.indexOf(s.key) < 0));
        return list.length ? (
          <div class="vpo-card">
            <h4 class="vpo-card-title">{g[0]}</h4>
            {list.map(row)}
          </div>
        ) : null;
      })}
    </div>
  );
}

function RiskBody({ state, calc, lines, note }) {
  return (
    <div class="vpo-risk-grid">
      {calc && <div class="vpo-risk-in"></div>}
      <div class="vpo-risk-out">
        {note && <p class="vpo-disclaimer">{note}</p>}
        <ScaleRows state={state} calc={calc} lines={lines} />
        <details class="vpo-more">
          <summary class="ea-io-link">Introducción del texto</summary>
          <textarea id="vpo-intro" class="ea-input" data-vpo-field="valoracionIntro" rows="2" aria-label="Introducción">{t(state.valoracionIntro)}</textarea>
        </details>
        <p class="vpo-disclaimer">{VPO_OFFICIAL_CALCULATOR_DISCLAIMER}</p>
      </div>
    </div>
  );
}

function Section({ title, actions, children }) {
  return (
    <section class="vpo-section">
      <div class="vpo-section-head">
        <h3 class="vpo-section-title">{title}</h3>
        {actions && <div class="vpo-section-actions">{actions}</div>}
      </div>
      <div class="vpo-section-body">{children}</div>
    </section>
  );
}

function Dlg({ k, title, copyAction, copyLabel, children }) {
  return (
    <dialog class="vpo-dialog" data-vpo-dialog={k} aria-labelledby={'vpo-dlg-' + k}>
      <div class="vpo-dialog-head">
        <h3 id={'vpo-dlg-' + k} class="vpo-section-title">{title}</h3>
        <button type="button" class="ea-io-link" data-vpo-close>Cerrar</button>
      </div>
      {children}
      {copyAction && (
        <div class="vpo-calc-actions">
          <button type="button" class="wb-btn wb-btn-primary" data-vpo-action={copyAction}>{copyLabel}</button>
        </div>
      )}
    </dialog>
  );
}

function FarmList({ farmacos }) {
  if (!farmacos || !farmacos.length) return <p class="vpo-empty-hint">Aún no hay fármacos. «Tomar de SOME» trae los de hoy.</p>;
  return (
    <>
      {farmacos.map((f, idx) => (
        <div class="vpo-farm-row">
          <div class="vpo-farm-name">{t(f.nombreDisplay)}</div>
          <textarea class="vpo-farm-nota ea-input" data-vpo-farm-idx={idx} rows="1">{t(f.notaEditable)}</textarea>
        </div>
      ))}
    </>
  );
}

/** Always at least one (empty) row. */
const dxRows = (state) => {
  const list = (state.diagnosticosList || []).slice();
  return list.length ? list : [''];
};

function DxRows({ rows }) {
  return (
    <>
      {rows.map((dx, i) => (
        <div class="vpo-dx-row list-row">
          <input type="text" class="ea-input" data-vpo-dx-idx={i} value={t(dx)} placeholder={'Diagnóstico ' + (i + 1)} />
          <button type="button" class="ea-io-remove" data-vpo-dx-remove={i} style={rows.length > 1 ? undefined : 'visibility:hidden'} aria-label="Eliminar">×</button>
        </div>
      ))}
    </>
  );
}

function DxSection({ state }) {
  return (
    <>
      <div class="vpo-dx-list"><DxRows rows={dxRows(state)} /></div>
      <div class="vpo-dx-actions">
        <button type="button" class="ea-io-link" data-vpo-action="dx-add-row">+ Agregar</button>
        <details class="vpo-dx-paste">
          <summary class="ea-io-link">Pegar lista</summary>
          <textarea class="ea-input vpo-dx-paste-input" data-vpo-dx-paste placeholder="DX1 + DX2 + DX3…"></textarea>
          <button type="button" class="ea-io-link" data-vpo-action="dx-split-plus">Separar por +</button>
        </details>
      </div>
    </>
  );
}

/**
 * @param {{ state: object, calc: boolean, lines: Record<string, {missing?: string[]}>, note?: string }} p
 * `calc` = calculator setting on; `lines` = buildScaleLines(state) when on, else {}; `note` = «Faltan datos» line.
 */
export function VpoPanel({ state, calc, lines, note }) {
  return (
    <div class="vpo-panel vpo-form rpc-form-stack">
      <div class="vpo-columns">
        <div class="vpo-col">
          <Section
            title="Riesgo preoperatorio"
            actions={
              <>
                {OPEN_BUTTONS.map((b) => <button type="button" class="wb-btn" data-vpo-open={b[0]}>{b[1]}</button>)}
                <button type="button" class="wb-btn" data-vpo-action="copy-risk">Copiar riesgos</button>
                <button type="button" class="wb-btn wb-btn-primary" data-vpo-action="copy-full">Copiar valoración completa</button>
              </>
            }
          >
            <RiskBody state={state} calc={calc} lines={lines} note={note} />
          </Section>
        </div>
      </div>
      <Dlg k="ekg" title="EKG" copyAction="copy-ekg" copyLabel="Copiar EKG">
        <div class="vpo-inline-row">
          <label class="ea-label" for="vpo-fc">FC (lpm)</label>
          <input id="vpo-fc" class="ea-input vpo-fc-input" data-vpo-field="fcLpm" type="text" value={t(state.fcLpm)} />
          <button type="button" class="ea-io-link" data-vpo-action="tomar-estado">Tomar de Estado actual</button>
        </div>
        <label class="ea-label" for="vpo-ekg">EKG</label>
        <textarea id="vpo-ekg" class="ea-input" data-vpo-field="ekgText" rows="6">{t(state.ekgText)}</textarea>
      </Dlg>
      <Dlg k="rx" title="Rx de tórax" copyAction="copy-rx" copyLabel="Copiar Rx">
        <label class="ea-label" for="vpo-rx">Rx de tórax</label>
        <textarea id="vpo-rx" class="ea-input" data-vpo-field="rxText" rows="6">{t(state.rxText)}</textarea>
      </Dlg>
      <Dlg k="dx" title="Diagnósticos">
        <div class="vpo-calc-actions">
          <button type="button" class="ea-io-link" data-vpo-action="tomar-dx">Tomar de la nota</button>
          <button type="button" class="ea-io-link" data-vpo-action="push-dx-datos">Enviar a Datos</button>
        </div>
        <DxSection state={state} />
      </Dlg>
      <Dlg k="farm" title="Fármacos perioperatorios" copyAction="copy-farm" copyLabel="Copiar fármacos">
        <button type="button" class="ea-io-link" data-vpo-action="tomar-meds">Tomar de SOME</button>
        <div class="vpo-farm-list"><FarmList farmacos={state.farmacos} /></div>
      </Dlg>
    </div>
  );
}

/** Draw into `host`, replacing whatever was there (same effect as the old `host.innerHTML = html`). */
function draw(host, vnode) {
  const dx = host.querySelector('.vpo-dx-list');
  if (dx) render(null, dx);
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawVpoPanel = (host, props) => draw(host, <VpoPanel {...props} />);
export const drawVpoNoPatient = (host) => draw(host, <p class="overview-hint vpo-panel">Selecciona un paciente para valoración preoperatoria.</p>);

/** Redraw only the diagnostics rows inside the open dialog (keeps the rest of the panel untouched). */
export function drawVpoDxList(listEl, state) {
  render(null, listEl);
  listEl.textContent = '';
  render(<DxRows rows={dxRows(state)} />, listEl);
}
