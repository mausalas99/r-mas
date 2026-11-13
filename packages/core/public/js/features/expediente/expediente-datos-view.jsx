/**
 * Expediente → Datos pane. Preact: same DOM, classes and data-* hooks the string builders in
 * expediente-datos.mjs made. The .mjs keeps the data rules (patient, censo, accesos, ingreso models)
 * and the wiring; typing never redraws (inputs are uncontrolled), the pane is rebuilt only like the
 * old `innerHTML` swap: render(null) first, so every node is fresh.
 */
import { render } from 'preact';
import { DxRows, CensoCount, CensoList } from '../../patient-data-censo-view.jsx';
import { AccesoRows } from '../../patient-data-accesos-view.jsx';
import { SalaOptions } from '../../patient-sala-view.jsx';

const UPPER = 'text-transform:uppercase;';
const jsonArgs = (...a) => JSON.stringify(a);

/** Quiet text input: looks like plain text until hover or focus. */
function Q({ k, value, ...rest }) {
  return <input type="text" class="exp-datos-q" value={String(value || '')} data-oninput="updatePatient" data-oninput-args={jsonArgs(k)} data-oninput-pass="value" {...rest} />;
}

/** One property line: muted label left, value right. The <label> wraps its control. */
function Prop({ label, title, children }) {
  return <label class="exp-datos-prop" title={title || undefined}><span class="exp-datos-prop__k">{label}</span>{children}</label>;
}

/** Two values on one line; each keeps its own (visually hidden) label. items: [{ name, control, unit? }]. */
function Pair({ label, items }) {
  return (
    <div class="exp-datos-prop"><span class="exp-datos-prop__k" aria-hidden="true">{label}</span><div class="exp-datos-pair">
      {items.map((it) => <label class="exp-datos-unit"><span class="visually-hidden">{it.name}</span>{it.control}{it.unit ? <small>{it.unit}</small> : null}</label>)}
    </div></div>
  );
}

/** Titled group; `action` sits on the title line. */
function Section({ title, action, children }) {
  return <section class="exp-datos-sec"><div class="exp-datos-sec__head"><h4 class="exp-datos-sec__title">{title}</h4>{action}</div>{children}</section>;
}

function Identidad({ patient }) {
  const sexo = (
    <select class="exp-datos-q" data-onchange="updatePatient" data-onchange-args='["sexo"]' data-onchange-pass="value">
      <option value="M" selected={patient.sexo === 'M'}>M</option>
      <option value="F" selected={patient.sexo === 'F'}>F</option>
    </select>
  );
  return (
    <Section title="Identidad">
      <Prop label="Nombre"><Q k="nombre" value={patient.nombre} style={UPPER} /></Prop>
      <Prop label="Registro"><Q k="registro" value={patient.registro} /></Prop>
      <Pair label="Edad · Sexo" items={[{ name: 'Edad', control: <Q k="edad" value={patient.edad} inputmode="numeric" /> }, { name: 'Sexo', control: sexo }]} />
      <Pair label="Peso · Talla" items={[
        { name: 'Peso', control: <Q k="peso" value={patient.peso} inputmode="decimal" placeholder="—" />, unit: 'kg' },
        { name: 'Talla', control: <Q k="talla" value={patient.talla} inputmode="decimal" placeholder="—" />, unit: 'm' },
      ]} />
    </Section>
  );
}

function CamaIngreso({ patient, salas, ingreso, accesos }) {
  return (
    <>
      <Section title="Cama">
        <Pair label="Cuarto · Cama" items={[{ name: 'Cuarto', control: <Q k="cuarto" value={patient.cuarto} /> }, { name: 'Cama', control: <Q k="cama" value={patient.cama} /> }]} />
        <Prop label="Sala">
          <select id="patient-sala-select" class="exp-datos-q" title="Ubicación clínica para censo y ⇄" data-onchange="updatePatient" data-onchange-args='["sala"]' data-onchange-pass="value">
            <SalaOptions selected={patient.sala} values={salas} />
          </select>
        </Prop>
        <Prop label="Servicio"><Q k="servicio" value={patient.servicio} style={UPPER} /></Prop>
        <Prop label="Área"><Q k="area" value={patient.area} style={UPPER} /></Prop>
      </Section>
      <Section title="Ingreso" action={<button type="button" class="exp-datos-sec__action" data-onclick="addPatientAccesoRow">+ Acceso</button>}>
        {ingreso.map((r) => (
          <Prop label={r.label} title={r.title}>
            <input type="date" class="rpc-date-input" value={r.value} data-oninput="updatePatient" data-oninput-args={jsonArgs(r.field)} data-oninput-pass="value" />
          </Prop>
        ))}
        <div class="patient-accesos-list" id="patient-accesos-list"><AccesoRows {...accesos} /></div>
      </Section>
    </>
  );
}

function CensoActions({ kind, fn, what }) {
  return (
    <span class="exp-datos-sec__actions">
      <button type="button" class="exp-datos-sec__action exp-datos-sec__action--muted" data-onclick={fn} title={'Tomar de ' + what}>↻ Tomar de lista</button>
      <button type="button" class="exp-datos-sec__action" data-onclick="addCensoLine" data-onclick-args={jsonArgs(kind)}>+ Agregar</button>
    </span>
  );
}

function Censo({ censo }) {
  return (
    <>
      <div class="exp-datos-censo-col">
        <Section title="Diagnósticos" action={<button type="button" class="exp-datos-sec__action" data-onclick="addPatientDxRow">+ Agregar</button>}>
          <ol class="exp-datos-list exp-datos-list--dx" id="patient-dx-list"><DxRows rows={censo.dx} /></ol>
        </Section>
      </div>
      <div class="exp-datos-censo-col">
        <Section title={<>{'Antibióticos '}<CensoCount kind="atb" count={censo.atb.count} /></>} action={<CensoActions kind="atb" fn="censoTomarDeAntibioticos" what="Antibióticos" />}>
          <CensoList {...censo.atb.list} />
        </Section>
        <Section title={<>{'Medicamentos '}<CensoCount kind="meds" count={censo.meds.count} /></>} action={<CensoActions kind="meds" fn="censoTomarDeMedicamentos" what="Medicamentos" />}>
          <CensoList {...censo.meds.list} />
        </Section>
      </div>
    </>
  );
}

function Summary() {
  return (
    <div class="exp-datos-summary" data-datos-summary="">
      <span class="exp-datos-summary__bed" data-datos-sum="bed"></span>
      <div class="exp-datos-summary__who"><p class="exp-datos-summary__name" data-datos-sum="name"></p>
        <p class="exp-datos-summary__meta" data-datos-sum="meta"></p></div>
      <div class="exp-datos-summary__stay"><p class="exp-datos-summary__day" data-datos-sum="day"></p>
        <p class="exp-datos-summary__since" data-datos-sum="since"></p></div>
      <div id="exp-datos-team-slot" class="exp-datos-team-slot"></div>
    </div>
  );
}

function Pane({ id, active, children }) {
  return <div class={'exp-datos-pane exp-datos-pane--' + id} id={'exp-datos-pane-' + id} role="tabpanel" data-datos-pane={id} hidden={id !== active}>{children}</div>;
}

/** props: { patient, tabs: [{ id, label }], active, salas, ingreso, accesos, censo } */
export function DatosFields({ patient, tabs, active, salas, ingreso, accesos, censo }) {
  return (
    <div class="exp-datos-fields">
      <Summary />
      <div class="exp-datos-tabs" role="tablist" aria-label="Secciones">
        {tabs.map((t) => (
          <button type="button" role="tab" class={'exp-datos-tab' + (t.id === active ? ' is-on' : '')} data-datos-tab={t.id} aria-selected={String(t.id === active)} aria-controls={'exp-datos-pane-' + t.id}>{t.label}</button>
        ))}
      </div>
      <Pane id="censo" active={active}><Censo censo={censo} /></Pane>
      <Pane id="cama" active={active}><CamaIngreso patient={patient} salas={salas} ingreso={ingreso} accesos={accesos} /></Pane>
      <Pane id="identidad" active={active}><Identidad patient={patient} /></Pane>
    </div>
  );
}

/** Fresh render each time (null first), like the old `innerHTML` swap. `props` null clears the pane. */
export function drawDatosFields(wrap, props) {
  render(null, wrap);
  wrap.textContent = '';
  if (props) render(<DatosFields {...props} />, wrap);
}


const Option = ({ o }) => <option value={o.value} selected={o.selected}>{o.label}</option>;

export function TeamAssign({ readOnly, currentLabel, placeholder, hint, select }) {
  if (readOnly) {
    return (
      <div class="field-group patient-team-assign-block">
        <label>Equipo</label>
        {currentLabel
          ? <input type="text" class="field-readonly" readonly value={currentLabel} aria-label="Equipo asignado" />
          : <p class="profile-hint profile-hint--field">Sin equipo asignado.</p>}
        <p class="profile-hint profile-hint--field">Únete a un equipo en <strong>Mi rotación</strong> para cambiar la asignación.</p>
      </div>
    );
  }
  return (
    <div class="field-group patient-team-assign-block">
      <label for="patient-team-assign-select">Equipo</label>
      <select id="patient-team-assign-select" class="profile-input patient-team-assign-select" data-onchange="onPatientTeamAssignChange" data-onchange-pass="value">
        <option value="">{placeholder}</option>
        {select.groups
          ? select.groups.map((g) => <optgroup label={g.label}>{g.options.map((o) => <Option o={o} />)}</optgroup>)
          : select.options.map((o) => <Option o={o} />)}
      </select>
      {currentLabel && <p class="profile-hint profile-hint--field">Equipo actual: <strong>{currentLabel}</strong></p>}
      <p class="profile-hint profile-hint--field">{hint}</p>
    </div>
  );
}

/** Fresh render each time (null first), like the old `innerHTML` swap. `props` null clears the slot. */
export function drawTeamAssign(slot, props) {
  render(null, slot);
  slot.textContent = '';
  if (props) render(<TeamAssign {...props} />, slot);
}
