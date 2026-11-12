/**
 * Estado actual "Registro manual" form (Preact). The form is painted once into the registro modal body,
 * then estado-actual-panel-registro.mjs wires listeners and fills the rows on the real DOM.
 * Loaded lazily (dynamic import) so Preact stays off the boot path.
 * Props only (built by buildRegistroFormProps in estado-actual-panel-registro.mjs): no data imports.
 */
import { render } from 'preact';

const IO_TURNO_IDS = ['t1', 't2', 't3'];
const IO_TURNO_NAMES = { t1: 'Matutino', t2: 'Vespertino', t3: 'Nocturno' };
const REGISTRO_STEP_NAMES = ['Signos', 'Glucosa', 'Balance', 'Revisar'];
// TAS and TAD are two stored series but one reading (TAS / TAD) in the form, with a single "+1".
const TA_ADD_KEY = 'ta';

function VitalChip({ baseKey, label, unit, layerIdx }) {
  const boxKey = baseKey + '__L' + layerIdx;
  return (
    <div class="vital-box ea-vital-box ea-vital-chip" data-ea-vital-box={boxKey}>
      <div class="vital-label">
        <span class="ea-vital-name">{label}</span>
        <span class="ea-vital-unit">{unit}</span>
      </div>
      <div class="ea-vital-value-wrap">
        <input
          type="number"
          class="ea-vital-input"
          data-ea-vital={baseKey}
          data-ea-layer-idx={String(layerIdx)}
          step="any"
          inputmode="decimal"
          placeholder="—"
          aria-label={label}
        />
      </div>
      <div class="ea-altered-slot ea-altered-slot--hidden" data-ea-altered-wrap={boxKey} hidden>
        <span class="ea-altered-label visually-hidden">Alterado</span>
        <input type="time" class="ea-altered-time-input" data-ea-altered={boxKey} aria-label={'Hora ' + label + ' alterado'} />
      </div>
    </div>
  );
}

function VitalStack({ v, addKey, maxLayers, maxReadings }) {
  const vitalKey = v.key;
  const label = v.label;
  const addLabel = addKey === TA_ADD_KEY ? 'TA' : label;
  const slots = [];
  for (let li = 0; li < maxLayers; li++) {
    slots.push(
      <div class="ea-vital-slot" data-ea-layer={String(li)} hidden={li > 0}>
        <VitalChip baseKey={vitalKey} label={label} unit={v.unit} layerIdx={li} />
      </div>
    );
  }
  return (
    <div class="ea-vital-stack" data-ea-vital-stack={vitalKey} data-ea-layer-count="1">
      {slots}
      {addKey ? (
        <button
          type="button"
          class="ea-vital-add-btn ea-temp-add-btn"
          data-ea-vital-add={addKey}
          hidden
          title={'Otra lectura de ' + addLabel + ' (máx. ' + maxReadings + '/día)'}
        >
          +1
        </button>
      ) : null}
    </div>
  );
}

/** All the stacks of the form; TAS and TAD go together under one "+1". */
function VitalFields({ vitals, maxLayers, maxReadings }) {
  const by = (k) => vitals.find((v) => v.key === k);
  return (
    <>
      {vitals.map((v) => {
        if (v.key === 'tas') return null;
        if (v.key === 'tad') {
          return (
            <div class="ea-ta-pair">
              <VitalStack v={by('tas')} addKey={null} maxLayers={maxLayers} maxReadings={maxReadings} />
              <VitalStack v={v} addKey={TA_ADD_KEY} maxLayers={maxLayers} maxReadings={maxReadings} />
            </div>
          );
        }
        return <VitalStack v={v} addKey={v.key} maxLayers={maxLayers} maxReadings={maxReadings} />;
      })}
    </>
  );
}

function VitalsSection(p) {
  return (
    <section class="ea-registro-section" aria-labelledby="ea-vitals-section-lbl">
      <div class="ea-registro-section-head">
        <h4 id="ea-vitals-section-lbl" class="ea-registro-section-label">Signos vitales</h4>
        <span class="ea-registro-section-hint">+1 lectura previa</span>
      </div>
      <div class="vitals-grid ea-vitals-grid">
        <VitalFields vitals={p.vitals} maxLayers={p.maxLayers} maxReadings={p.maxReadings} />
      </div>
    </section>
  );
}

function GluSection() {
  return (
    <section class="ea-registro-section ea-glu-section" aria-labelledby="ea-glu-section-lbl">
      <div class="ea-glu-mode-row lab-pref-row ea-registro-section-head">
        <h4 class="ea-registro-section-label lab-pref-row-label" id="ea-glu-section-lbl">Glucometrías</h4>
        <div class="ea-glu-mode-switch">
          <span class="ea-glu-mode-switch-label" id="ea-bomba-enabled-lbl">Bomba</span>
          <label class="rpc-switch">
            <input type="checkbox" id="ea-bomba-enabled" class="rpc-switch-input" role="switch" aria-labelledby="ea-bomba-enabled-lbl" />
            <span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span>
          </label>
          <button type="button" class="ea-btn ea-btn--ghost ea-glu-add-inline" id="ea-add-glu">+ Agregar hora</button>
        </div>
      </div>
      <div id="ea-glu-normal-block" class="ea-glu-pane ea-glu-block">
        <div id="ea-glu-list" class="ea-glu-list"></div>
      </div>
      <div id="ea-bomba-block" class="ea-glu-pane ea-glu-block ea-bomba-block ea-glu-pane--off" hidden>
        <p id="ea-bomba-algoritmo-hint" class="ea-bomba-algoritmo-hint ea-muted" hidden></p>
        <div class="ea-bomba-head" aria-hidden="true"><span>Hora</span><span>mg/dL</span><span>U</span><span></span></div>
        <div id="ea-bomba-list" class="ea-bomba-list"></div>
        <button type="button" class="ea-io-link" id="ea-add-bomba">+ Hora</button>
      </div>
    </section>
  );
}

function IoTurnoBox({ prefix, turno, inputmode, label }) {
  const T = turno.toUpperCase();
  return (
    <div class="ea-turno-box">
      <input
        type="text"
        aria-label={label + ' ' + T}
        id={'ea-io-' + prefix + '-' + turno}
        inputmode={inputmode}
        autocomplete="off"
        placeholder=""
        data-ea-io-turno={prefix}
      />
      <button type="button" class="ea-turno-nc-btn" data-ea-io-turno-nc="" aria-pressed="false" title={'Marcar ' + T + ' como NC'}>NC</button>
    </div>
  );
}

function IoTableRow({ label, cells, total, cls }) {
  return (
    <div class={'ea-io-table-row' + (cls ? ' ' + cls : '')}>
      <span class="ea-io-table-label">{label}</span>
      {cells}
      <span class="ea-turno-total">{total}</span>
    </div>
  );
}

/**
 * Balance hídrico as one table: columns are the turns, rows go from what counts in the balance
 * (ingresos, egresos, otras fuentes) to the balance itself, then what only annotates it (evacuaciones, eventos).
 */
function IoSection({ ioExtraKinds, ioEventKinds }) {
  const turnoCells = (prefix, label, inputmode) =>
    IO_TURNO_IDS.map((t) => <IoTurnoBox prefix={prefix} turno={t} inputmode={inputmode} label={label} />);
  return (
    <section class="ea-registro-section" aria-labelledby="ea-io-section-lbl">
      <div class="ea-registro-section-head">
        <h4 id="ea-io-section-lbl" class="ea-registro-section-label">Balance hídrico <span class="ea-muted">cc</span></h4>
      </div>
      <div class="ea-io-grid ea-io-table">
        <IoTableRow
          label=""
          cells={IO_TURNO_IDS.map((t) => <span class="ea-io-table-head" title={t.toUpperCase()}>{IO_TURNO_NAMES[t]}</span>)}
          total="Total"
          cls="ea-io-table-row--head"
        />
        <IoTableRow label="Ingresos" cells={turnoCells('ing', 'Ingresos', 'decimal')} total={<span id="ea-io-ing-total">—</span>} />
        <IoTableRow label="Egresos" cells={turnoCells('egr', 'Egresos', 'text')} total={<span id="ea-io-egr-total">—</span>} />
        <div id="ea-io-extra-list" class="ea-io-extra-list"></div>
        <IoTableRow
          label="Evacuaciones"
          cells={[<span></span>, <span></span>, <span></span>]}
          total={<input type="text" class="ea-input" id="ea-io-evac" autocomplete="off" aria-label="Evacuaciones de los 3 turnos" />}
        />
        <IoTableRow
          label="Balance"
          cells={IO_TURNO_IDS.map((t) => <span class="ea-io-bal" id={'ea-io-bal-' + t}>—</span>)}
          total={<span id="ea-balance-turno-live" class="ea-balance-live">—</span>}
          cls="ea-io-table-row--balance"
        />
        <div id="ea-io-event-list" class="ea-io-extra-list ea-io-event-list"></div>
        <div class="ea-io-adds">
          <select class="ea-io-link" id="ea-add-io-extra" aria-label="Agregar fuente">
            <option value="">+ Otra fuente</option>
            {ioExtraKinds.map((k) => <option value={k.value}>{k.label}</option>)}
            <option value="__custom__">Otra…</option>
          </select>
          <select class="ea-io-link" data-ea-io-event-add="" aria-label="Agregar evento">
            <option value="">+ Evento</option>
            {ioEventKinds.map((k) => <option value={k.value}>{k.label}</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}

/** Progress bars, step rail and the four panes (all stay in the form so the reader finds every field). */
function Steps(p) {
  const { ioExtraKinds, ioEventKinds } = p;
  return (
    <>
      <div class="ea-steps-progress" aria-hidden="true">
        {REGISTRO_STEP_NAMES.map(() => <div class="ea-steps-bar"><i></i></div>)}
      </div>
      <div class="ea-steps">
        <nav class="ea-steps-rail" aria-label="Pasos del registro">
          {REGISTRO_STEP_NAMES.map((name, i) => (
            <button type="button" class="ea-steps-item" data-ea-step-go={String(i)}>
              <span class="ea-steps-dot" aria-hidden="true">{i + 1}</span>
              <span class="ea-steps-text">
                <span class="ea-steps-name">{name}</span>
                <span class="ea-steps-sub">{i === 3 ? 'Un solo envío' : 'Sin datos'}</span>
              </span>
            </button>
          ))}
        </nav>
        <div class="ea-steps-panes">
          <div class="ea-step-pane" data-ea-step="0"><VitalsSection vitals={p.vitals} maxLayers={p.maxLayers} maxReadings={p.maxReadings} /></div>
          <div class="ea-step-pane" data-ea-step="1" hidden><GluSection /></div>
          <div class="ea-step-pane" data-ea-step="2" hidden><IoSection ioExtraKinds={ioExtraKinds} ioEventKinds={ioEventKinds} /></div>
          <div class="ea-step-pane" data-ea-step="3" hidden>
            <section class="ea-registro-section">
              <div class="ea-registro-section-head"><h4 class="ea-registro-section-label">Revisar</h4></div>
              <div id="ea-step-review"></div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function Footer() {
  return (
    <>
      <div class="ea-steps-advance" aria-hidden="true"><i></i></div>
      <footer class="ea-registro-modal-foot wb-modal-foot">
        <button type="button" class="wb-btn wb-btn-ghost ea-registro-paste-btn" data-onclick="openEstadoActualPasteModal" data-onclick-args='[{"skipRegistro":true}]'>Pegar monitoreo</button>
        <label class="ea-steps-auto">
          <span class="rpc-switch">
            <input type="checkbox" class="rpc-switch-input" role="switch" data-ea-auto="" checked />
            <span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span>
          </span>
          <span>Avance automático</span>
        </label>
        <span class="ea-steps-msg ea-muted" data-ea-step-msg="" role="status" aria-live="polite"></span>
        <span class="ea-steps-spacer"></span>
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" data-ea-layout-switch="" aria-pressed="false">Vista anterior</button>
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" data-ea-step-back="">Atrás</button>
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" data-onclick="closeEstadoActualRegistroModal">Cancelar</button>
        <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" data-ea-step-next="">Siguiente: Glucosa</button>
        <button type="button" class="wb-btn wb-btn-primary wb-btn-lg ea-registro-submit" data-onclick="registrarEstadoActualMedicion" hidden>Registrar</button>
      </footer>
    </>
  );
}

/**
 * @param {ReturnType<typeof import('./estado-actual-panel-registro.mjs').buildRegistroFormProps>} p
 * `recordedAt`: the datetime-local value the date field opens with.
 */
export function RegistroForm(p) {
  const { recordedAt } = p;
  return (
    <div class="ea-registro-shell">
      <div class="ea-registro-form-scroll wb-modal-body">
        <form id="ea-form" class="ea-form ea-form--registro" data-prevent-submit="">
          <div class="ea-registro-top">
            <div class="ea-registro-when">
              <label class="ea-field ea-field--datetime">
                <span class="ea-label">Fecha y hora</span>
                <input type="datetime-local" class="ea-input rpc-datetime-input" id="ea-recorded-at" value={recordedAt} />
              </label>
              <button type="button" class="ea-turno-pill" data-ea-turno="" aria-pressed="false">Turno en curso</button>
              <span class="ea-turno-hint" hidden>Cierra esta noche 00:00 · se ve como hoy</span>
            </div>
            <p class="ea-registro-hint">Basta un dato para registrar · <span class="ea-registro-kbd-hint">⌘↵</span></p>
          </div>
          <Steps {...p} />
        </form>
      </div>
      <Footer />
    </div>
  );
}

/**
 * Replace the children of `body` with the form. Rendered in a scratch container and moved in:
 * the form is wired and mutated by plain DOM code, so `body` must not become a Preact root.
 */
export function paintRegistroForm(body, props) {
  const scratch = document.createElement('div');
  render(<RegistroForm {...props} />, scratch);
  body.replaceChildren(...scratch.childNodes);
}
