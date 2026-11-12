/**
 * Entrega (handoff) modal, Preact. Same ids, classes and aria as the static form it replaced, so the
 * CSS and the E2E scripts keep working. State lives here (no expandos on the form); the caller gets
 * a `draftRef` getter and the submit / nav / cancel callbacks. Loaded lazily from clinical-entrega-modal.mjs.
 */
import { render } from 'preact';
import { useRef, useState } from 'preact/hooks';
import {
  CLINICAL_STATUS_OPTIONS,
  VASOPRESSOR_AGENTS,
  VASOPRESSOR_INFUSION_DEFAULTS,
  VASOPRESSOR_UNIT_LABELS,
  VENTILATION_MODES,
  coerceVasopressorUnit,
  handoffContextSummary,
} from '../../../lib/entrega/entrega-handoff-context.mjs';
import {
  VITALS_FREQ_HOUR_PRESETS,
  VITALS_FREQ_SHIFT_OPTIONS,
  VITALS_METRIC_KEYS,
  VITALS_METRIC_LABELS,
  vitalsPlanSummary,
} from '../../../lib/entrega/entrega-vitals-plan.mjs';
import { canDeletePendienteItem, createProcedimientoItem, pendingRequirementBadges } from '../../../lib/entrega/entrega-pendientes.mjs';
import { GUARDIA_ESFUERZO_OPTIONS, GUARDIA_PRONOSTICO_OPTIONS, normalizeGuardiaMarksPatch } from './guardia-census-table.mjs';
import { findPatient, saveGuardiaMarks } from './guardia-marks.mjs';
import { openConfirm } from './workbench/confirm.mjs';
import { notify } from '../toast-notify.mjs';
import {
  defaultProcedureTimeHHmm,
  formatHHmm,
  handoffContextFromFields,
  parseTimeParts,
  scheduledAtFromTimeInput,
  vitalsPlanFromUi,
  withVasoDefaults,
} from './entrega-modal-state.mjs';

const BADGE_LABELS = { consentimiento: 'Consent', anestesia: 'Anest', familiar: 'Familiar' };
const pad2 = (n) => String(n).padStart(2, '0');

function CheckPill({ name, label, checked, onChange, id, extraClass }) {
  return (
    <label class={['entrega-check-pill', extraClass].filter(Boolean).join(' ')}>
      <input type="checkbox" name={name} id={id} checked={!!checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function TimeSelect({ hour, minute, onHour, onMinute, hourName = 'entrega-proc-hour', minuteName = 'entrega-proc-minute',
  ariaLabel = 'Hora programada', allowBlank = true, picker, wrapperClass, disabled }) {
  const blank = allowBlank ? <option value="">—</option> : null;
  const hours = Array.from({ length: 24 }, (_, h) => pad2(h));
  const mins = Array.from({ length: 12 }, (_, i) => pad2(i * 5));
  const odd = minute && !mins.includes(minute) ? <option value={minute} selected>{minute}</option> : null;
  const cls = [picker ? 'entrega-time-picker' : 'entrega-time-combo', wrapperClass].filter(Boolean).join(' ');
  return (
    <div class={cls} role="group" aria-label={ariaLabel}>
      <div class="entrega-time-picker__part">
        <span class="entrega-time-picker__hint">H</span>
        <select name={hourName} class="profile-input entrega-time-select" aria-label="Hora" disabled={disabled}
          value={hour} onChange={(e) => onHour(e.currentTarget.value)}>
          {blank}{hours.map((v) => <option value={v}>{v}</option>)}
        </select>
      </div>
      <span class="entrega-time-sep" aria-hidden="true">:</span>
      <div class="entrega-time-picker__part">
        <span class="entrega-time-picker__hint">M</span>
        <select name={minuteName} class="profile-input entrega-time-select" aria-label="Minutos" disabled={disabled}
          value={minute} onChange={(e) => onMinute(e.currentTarget.value)}>
          {blank}{mins.map((v) => <option value={v}>{v}</option>)}{odd}
        </select>
      </div>
    </div>
  );
}

/** «Esfuerzo terapéutico» / «Pronóstico» toggle group; saving goes through saveGuardiaMarks. */
export function GuardiaMarksGroup({ label, mark, options, current, patientId }) {
  const [value, setValue] = useState(current);
  const pick = async (id) => {
    const patient = findPatient(patientId);
    if (!patient) return;
    const next = patient[mark] === id ? null : id;
    const res = await saveGuardiaMarks(patient, { [mark]: next });
    if (!res.ok) return notify('No se pudo guardar.', 'error');
    setValue(next);
  };
  return (
    <div class="guardia-marks-group" role="group" aria-label={label} data-mark={mark}>
      <span class="guardia-marks-group__label">{label}</span>
      {options.map((o) => (
        <button type="button" class="guardia-marks-btn" data-value={o.id} aria-pressed={o.id === value ? 'true' : 'false'}
          onClick={() => pick(o.id)}>{o.icon} {o.label}</button>
      ))}
    </div>
  );
}

export function ClinicalStatusField({ value, onChange }) {
  return (
    <>
      <label for="entrega-clinical-status">Estado general</label>
      <select id="entrega-clinical-status" class="profile-input" value={value} onChange={(e) => onChange(e.currentTarget.value)}>
        {CLINICAL_STATUS_OPTIONS.map((o) => <option value={o.value}>{o.label}</option>)}
      </select>
    </>
  );
}

function VasoDose({ vaso, set }) {
  const agent = vaso.agent;
  const isVasopresina = agent === 'vasopresina';
  return (
    <div class="entrega-vaso-dose">
      <div class="field-group">
        <label for="entrega-vaso-agent">Agente</label>
        <select id="entrega-vaso-agent" class="profile-input" value={agent}
          onChange={(e) => set((f) => withVasoDefaults(f, e.currentTarget.value))}>
          {VASOPRESSOR_AGENTS.map((a) => <option value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <div class="field-group entrega-vaso-dose-row">
        <label for="entrega-vaso-dose">Infusión</label>
        <div class="entrega-vaso-dose-input-wrap">
          <input id="entrega-vaso-dose" class="profile-input entrega-vaso-dose-input" type="number" inputmode="decimal"
            step="0.01" min="0" placeholder={VASOPRESSOR_INFUSION_DEFAULTS[agent]?.dose || '0.05'} value={vaso.dose}
            onInput={(e) => { const dose = e.currentTarget.value; set((f) => ({ ...f, vasopressor: { ...f.vasopressor, dose } })); }} />
          <div class="entrega-vaso-unit-inline" role="group" aria-label="Unidad de infusión">
            <div class={'entrega-vaso-unit-chips' + (isVasopresina ? ' is-hidden' : '')} data-vaso-unit-chips="">
              {['mcg_kg_min', 'mcg_min'].map((u) => (
                <button type="button" class={'entrega-freq-chip entrega-vaso-unit-pill' + (vaso.unit === u && !isVasopresina ? ' is-selected' : '')}
                  data-vaso-unit={u}
                  onClick={() => set((f) => ({ ...f, vasopressor: { ...f.vasopressor, unit: coerceVasopressorUnit(f.vasopressor.agent, u) } }))}>
                  {VASOPRESSOR_UNIT_LABELS[u]}
                </button>
              ))}
            </div>
            <span class={'entrega-vaso-unit-pill-fixed' + (isVasopresina ? '' : ' is-hidden')} data-vaso-unit-fixed="">
              {VASOPRESSOR_UNIT_LABELS.ui_min}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UntilTime({ scope, u, setU }) {
  return (
    <div class="entrega-freq-until">
      <label class="entrega-check-pill entrega-freq-until-toggle">
        <input type="checkbox" data-vitals-until-enable="" checked={u.on}
          onChange={(e) => {
            const on = e.currentTarget.checked;
            setU({ ...u, on, h: on && !u.h ? '07' : u.h, m: on && !u.m ? '00' : u.m });
          }} />
        <span>Detener a las</span>
      </label>
      <TimeSelect hour={u.h} minute={u.m} onHour={(h) => setU({ ...u, h })} onMinute={(m) => setU({ ...u, m })}
        hourName={`entrega-vitals-until-hour-${scope}`} minuteName={`entrega-vitals-until-minute-${scope}`}
        ariaLabel="Hora de fin" allowBlank={false} picker
        wrapperClass={'entrega-freq-until-time entrega-time-picker--compact' + (u.on ? '' : ' is-disabled')} disabled={!u.on} />
    </div>
  );
}

/** Vitals plan panel: `ui` is entrega-modal-state's vitalsUiFromPlan shape. */
export function VitalsPanel({ ui, setUi }) {
  const plan = vitalsPlanFromUi(ui);
  const hoursN = Number(ui.hours);
  const setHours = (h) => setUi((v) => ({ ...v, hours: String(h) }));
  const setMode = (mode) => setUi((v) => ({ ...v, mode, hours: mode === 'interval' ? '2' : v.hours, shiftTimes: mode === 'shift' ? 1 : v.shiftTimes }));
  const setUntil = (scope) => (u) => setUi((v) => ({ ...v, until: { ...v.until, [scope]: u } }));
  const modeLabels = { interval: 'Intervalo', shift: 'Por turno', routine: 'Sin signos' };
  return (
    <div class="entrega-vitals-form">
      <div class="entrega-vitals-form__scroll">
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-metrics-label">
          <span class="entrega-field-label" id="entrega-vitals-metrics-label">Parámetros</span>
          <div class="entrega-check-pills entrega-vitals-metrics" role="group" aria-labelledby="entrega-vitals-metrics-label">
            {VITALS_METRIC_KEYS.map((key) => (
              <label class="entrega-check-pill">
                <input type="checkbox" data-vital-metric={key} checked={!!ui.metrics[key]}
                  onChange={(e) => { const on = e.currentTarget.checked; setUi((v) => ({ ...v, metrics: { ...v.metrics, [key]: on } })); }} />
                <span>{VITALS_METRIC_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </section>
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-freq-label">
          <span class="entrega-field-label" id="entrega-vitals-freq-label">Frecuencia</span>
          <div class="entrega-vitals-freq" role="group" aria-labelledby="entrega-vitals-freq-label">
            <div class="entrega-freq-segment entrega-check-pills entrega-freq-modes" role="radiogroup" aria-label="Modo de frecuencia">
              {['interval', 'shift', 'routine'].map((mode) => (
                <label class="entrega-check-pill entrega-freq-mode-pill">
                  <input type="radio" name="entrega-freq-mode" value={mode} checked={ui.mode === mode} onChange={() => setMode(mode)} />
                  <span>{modeLabels[mode]}</span>
                </label>
              ))}
            </div>
            <div class="entrega-vitals-freq-detail-slot" aria-hidden="false">
              <div class={'entrega-freq-panel' + (ui.mode === 'interval' ? '' : ' is-hidden')} id="entrega-freq-interval-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Atajos</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Atajos cada N horas">
                      {VITALS_FREQ_HOUR_PRESETS.map((h) => (
                        <button type="button" class={'entrega-freq-chip' + (ui.mode === 'interval' && hoursN === h ? ' is-selected' : '')}
                          data-freq-hours={h} onClick={() => setHours(h)}>{h} h</button>
                      ))}
                    </div>
                  </div>
                  <div class="entrega-freq-detail__row-split">
                    <div class="entrega-freq-detail__cell">
                      <span class="entrega-freq-detail__cell-label">Cada</span>
                      <div class="entrega-freq-stepper" role="group" aria-label="Intervalo en horas">
                        <button type="button" class="entrega-freq-step" data-hours-dec="" aria-label="Menos horas"
                          onClick={() => setHours(Math.min(24, Math.max(1, (Number(ui.hours) || 2) - 1)))}>−</button>
                        <input type="number" id="entrega-vitals-hours" class="entrega-freq-hours-input" min="1" max="24" step="1"
                          inputmode="numeric" value={ui.hours} aria-label="Cada cuántas horas" onInput={(e) => setHours(e.currentTarget.value)} />
                        <button type="button" class="entrega-freq-step" data-hours-inc="" aria-label="Más horas"
                          onClick={() => setHours(Math.min(24, Math.max(1, (Number(ui.hours) || 2) + 1)))}>+</button>
                      </div>
                      <span class="entrega-freq-interval-suffix">horas</span>
                    </div>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">
                      <UntilTime scope="interval" u={ui.until.interval} setU={setUntil('interval')} />
                    </div>
                  </div>
                </div>
              </div>
              <div class={'entrega-freq-panel' + (ui.mode === 'shift' ? '' : ' is-hidden')} id="entrega-freq-shift-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Veces</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Veces por turno">
                      {VITALS_FREQ_SHIFT_OPTIONS.map((t) => (
                        <button type="button" class={'entrega-freq-chip' + (ui.mode === 'shift' && ui.shiftTimes === t ? ' is-selected' : '')}
                          data-freq-shift={t} onClick={() => setUi((v) => ({ ...v, shiftTimes: t }))}>{t}×</button>
                      ))}
                    </div>
                  </div>
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Fin</span>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">
                      <UntilTime scope="shift" u={ui.until.shift} setU={setUntil('shift')} />
                    </div>
                  </div>
                </div>
              </div>
              <p class={'entrega-freq-routine-hint' + (ui.mode === 'routine' ? '' : ' is-hidden')} id="entrega-freq-routine-hint">
                No aparece en internos para signos vitales. Si agregas un estudio pendiente, sí se listará ahí.
              </p>
            </div>
          </div>
        </section>
      </div>
      <p class="entrega-vitals-summary" id="entrega-vitals-summary" role="status">{vitalsPlanSummary(plan)}</p>
    </div>
  );
}

/** Markers, notes, support (vasopressor / ventilation) and the vitals panel. `f` = handoff fields. */
export function HandoffPanel({ f, set, isCritical, setCritical, markPatientId, vitalsUi, setVitalsUi }) {
  const supportOpen = useRef(f.vasopressor.active || f.ventilation.active).current;
  const marks = markPatientId ? normalizeGuardiaMarksPatch({
    guardiaEsfuerzo: findPatient(markPatientId)?.guardiaEsfuerzo,
    guardiaPronostico: findPatient(markPatientId)?.guardiaPronostico,
  }) : null;
  const vent = f.ventilation;
  const patchVent = (patch) => set((x) => ({ ...x, ventilation: { ...x.ventilation, ...patch } }));
  return (
    <>
      <div class="entrega-markers-block">
        <div class="entrega-check-pills entrega-chip-marker-pills" role="group" aria-label="Marcadores de entrega">
          <CheckPill name="entrega-critical" id="entrega-critical" label="Crítico" checked={isCritical}
            onChange={(e) => setCritical(e.currentTarget.checked)} />
          <CheckPill name="entrega-signed-refusal" id="entrega-signed-refusal" label="Negativas firmadas" checked={f.signedRefusal}
            onChange={(e) => { const v = e.currentTarget.checked; set((x) => ({ ...x, signedRefusal: v })); }} />
          <CheckPill name="entrega-show" id="entrega-show" label="Show" checked={f.show}
            onChange={(e) => { const v = e.currentTarget.checked; set((x) => ({ ...x, show: v })); }} />
        </div>
        {marks && (
          <>
            <GuardiaMarksGroup label="Esfuerzo terapéutico" mark="guardiaEsfuerzo" options={GUARDIA_ESFUERZO_OPTIONS}
              current={marks.guardiaEsfuerzo} patientId={markPatientId} />
            <GuardiaMarksGroup label="Pronóstico" mark="guardiaPronostico" options={GUARDIA_PRONOSTICO_OPTIONS}
              current={marks.guardiaPronostico} patientId={markPatientId} />
          </>
        )}
      </div>
      <div class="field-group entrega-handoff-notes">
        <label for="entrega-handoff-notes">Notas breves de entrega</label>
        <textarea id="entrega-handoff-notes" class="profile-input entrega-handoff-notes-input" maxlength="240" rows="2"
          placeholder="Antecedentes relevantes para la guardia…" value={f.notes}
          onInput={(e) => { const notes = e.currentTarget.value; set((x) => ({ ...x, notes })); }} />
      </div>
      <details class="entrega-proc-details" open={supportOpen}>
        <summary class="entrega-proc-summary">
          <h4 class="clinical-teams-section-title">Soporte · Signos vitales</h4>
        </summary>
        <div class="entrega-panel-body entrega-middle-row">
          <div class="entrega-support-stack">
            <div class={'entrega-handoff-support-card' + (f.vasopressor.active ? ' is-active' : '')} data-handoff-card="vasopressor">
              <div class="entrega-handoff-support-card__head">
                <CheckPill name="entrega-vaso-active" label="Vasopresor" checked={f.vasopressor.active}
                  onChange={(e) => {
                    const on = e.currentTarget.checked;
                    set((x) => {
                      const y = { ...x, vasopressor: { ...x.vasopressor, active: on } };
                      return on ? withVasoDefaults(y) : y;
                    });
                  }} />
              </div>
              <div class={'entrega-handoff-support-detail' + (f.vasopressor.active ? '' : ' is-hidden')} data-handoff-detail="vasopressor">
                <VasoDose vaso={f.vasopressor} set={set} />
              </div>
            </div>
            <div class={'entrega-handoff-support-card' + (vent.active ? ' is-active' : '')} data-handoff-card="ventilation">
              <div class="entrega-handoff-support-card__head">
                <CheckPill name="entrega-vent-active" label="Ventilación / soporte resp." checked={vent.active}
                  onChange={(e) => patchVent({ active: e.currentTarget.checked })} />
              </div>
              <div class={'entrega-handoff-support-detail' + (vent.active ? '' : ' is-hidden')} data-handoff-detail="ventilation">
                <div class="field-group">
                  <label for="entrega-vent-mode">Modalidad</label>
                  <select id="entrega-vent-mode" class="profile-input" value={vent.mode} onChange={(e) => patchVent({ mode: e.currentTarget.value })}>
                    {VENTILATION_MODES.map((m) => <option value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div class="field-group">
                  <label for="entrega-vent-fio2">FiO₂ / flujo</label>
                  <input id="entrega-vent-fio2" class="profile-input" type="text" placeholder="ej. 40% · 50 L/min" value={vent.fio2}
                    onInput={(e) => patchVent({ fio2: e.currentTarget.value })} />
                </div>
                <div class="field-group">
                  <label for="entrega-vent-settings">Parámetros</label>
                  <input id="entrega-vent-settings" class="profile-input" type="text" placeholder="PEEP, VT, presiones…" value={vent.settings}
                    onInput={(e) => patchVent({ settings: e.currentTarget.value })} />
                </div>
              </div>
            </div>
          </div>
          <div class="entrega-vitals-col" aria-label="Signos vitales en guardia">
            <div id="entrega-vitals-panel" class="entrega-vitals-panel">
              <VitalsPanel ui={vitalsUi} setUi={setVitalsUi} />
            </div>
          </div>
        </div>
      </details>
    </>
  );
}

function ProcCard({ item, actor, onFlag, onDelete }) {
  const del = canDeletePendienteItem(item, actor) ? (
    <button type="button" class="wb-btn wb-btn-danger-outline entrega-proc-delete" data-action="delete" onClick={() => onDelete(item)}>Eliminar</button>
  ) : null;
  if (item.type === 'legacy_text') {
    return (
      <li class="entrega-proc-card entrega-proc-card--legacy" data-item-id={item.id}>
        <div class="entrega-proc-card-main">
          <span class="entrega-proc-label">{item.text || ''}</span>
          <span class="entrega-proc-meta">Texto legado</span>
        </div>
        {del}
      </li>
    );
  }
  if (item.type !== 'procedimiento') return null;
  const time = formatHHmm(item.scheduledAt);
  const flag = (name, label) => (
    <label><input type="checkbox" data-flag={name} checked={!!item[name]} onChange={(e) => onFlag(item.id, name, e.currentTarget.checked)} /> {label}</label>
  );
  return (
    <li class="entrega-proc-card" data-item-id={item.id}>
      <div class="entrega-proc-card-main">
        <div class="entrega-proc-title-row">
          <span class="entrega-proc-label">{item.label}</span>
          {time ? <span class="entrega-proc-time">{time}</span> : null}
          <span class="entrega-proc-kind">{item.kind === 'imagen' ? 'Imagen' : 'Otro'}</span>
        </div>
        <div class="entrega-proc-chips">
          {item.comentado && <span class="entrega-proc-chip">Comentado</span>}
          {item.autorizado && <span class="entrega-proc-chip">Autorizado</span>}
          {item.agendado && <span class="entrega-proc-chip">Agendado</span>}
          {item.lockedBase && <span class="entrega-proc-chip entrega-proc-chip--lock">Base</span>}
          {pendingRequirementBadges(item).map((b) => <span class="entrega-proc-chip entrega-proc-chip--req">{BADGE_LABELS[b] || b}</span>)}
        </div>
        <div class="entrega-proc-flags">
          {flag('comentado', 'Comentado')}{flag('autorizado', 'Autorizado')}{flag('agendado', 'Agendado')}
        </div>
      </div>
      {del}
    </li>
  );
}

/** «Nuevo procedimiento» inline form. `initial` pre-fills it; `now` sets the default time. */
export function AddProcForm({ initial = {}, now, actor, onAdd, onCancel }) {
  const t = parseTimeParts(initial.scheduledAt ? formatHHmm(initial.scheduledAt) : defaultProcedureTimeHHmm(now));
  const [f, setF] = useState({
    kind: initial.kind === 'otro' ? 'otro' : 'imagen', label: initial.label || '', hour: t.hour, minute: t.minute,
    comentado: !!initial.comentado, autorizado: !!initial.autorizado, agendado: !!initial.agendado,
    familiar: !!initial.requires?.familiar, consentimiento: !!initial.requires?.consentimiento, anestesia: !!initial.requires?.anestesia,
  });
  const [err, setErr] = useState('');
  const labelRef = useRef(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const pill = (name, key, label) => (
    <CheckPill name={name} label={label} checked={f[key]} onChange={(e) => set({ [key]: e.currentTarget.checked })} />
  );
  const add = () => {
    const label = f.label.trim();
    if (!label) {
      const msg = 'Indica la etiqueta del procedimiento.';
      notify(msg, 'error');
      setErr(msg);
      labelRef.current?.focus();
      return;
    }
    const time = f.hour && f.minute ? `${f.hour}:${f.minute}` : f.hour ? `${f.hour}:00` : f.minute ? `00:${f.minute}` : '';
    onAdd(createProcedimientoItem({
      kind: f.kind, label, scheduledAt: scheduledAtFromTimeInput(time),
      comentado: f.comentado, autorizado: f.autorizado, agendado: f.agendado,
      requires: { familiar: f.familiar, consentimiento: f.consentimiento, anestesia: f.anestesia },
      lockedBase: actor.role === 'diurno',
      createdBy: actor.userId ? { userId: actor.userId, rank: actor.rank || '' } : null,
    }));
  };
  return (
    <div class="entrega-inline-form" role="group" aria-label="Agregar procedimiento">
      <div class="entrega-inline-form__head">
        <h4 class="entrega-inline-form__title">Nuevo procedimiento</h4>
        <button type="button" class="entrega-inline-form__close" data-action="cancel-form" aria-label="Cerrar" onClick={onCancel}>×</button>
      </div>
      <div class="entrega-inline-form__grid">
        <div class="field-group">
          <label for="entrega-proc-kind">Tipo</label>
          <select id="entrega-proc-kind" name="entrega-proc-kind" class="profile-input" value={f.kind} onChange={(e) => set({ kind: e.currentTarget.value })}>
            <option value="imagen">Imagen</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div class="field-group entrega-inline-form__label-wide">
          <label for="entrega-proc-label">Descripción</label>
          <input id="entrega-proc-label" name="entrega-proc-label" class="profile-input" type="text" required
            placeholder="Ej. TAC tórax, endoscopia…" value={f.label} ref={labelRef}
            aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'entrega-proc-label-error' : undefined}
            onInput={(e) => { set({ label: e.currentTarget.value }); setErr(''); }} />
          {err ? (
            <span id="entrega-proc-label-error" class="field-invalid-msg"
              style="display:block;color:var(--danger, #c0392b);font-size:12px;margin-top:4px;">{err}</span>
          ) : null}
        </div>
        <div class="field-group entrega-inline-form__time">
          <span class="entrega-field-label-block">Hora</span>
          <TimeSelect hour={f.hour} minute={f.minute} onHour={(hour) => set({ hour })} onMinute={(minute) => set({ minute })} allowBlank={false} picker />
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Estado</span>
        <div class="entrega-check-pills">
          {pill('entrega-proc-comentado', 'comentado', 'Comentado')}
          {pill('entrega-proc-autorizado', 'autorizado', 'Autorizado')}
          {pill('entrega-proc-agendado', 'agendado', 'Agendado')}
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Requiere</span>
        <div class="entrega-check-pills">
          {pill('entrega-req-familiar', 'familiar', 'Familiar')}
          {pill('entrega-req-consentimiento', 'consentimiento', 'Consentimiento')}
          {pill('entrega-req-anestesia', 'anestesia', 'Anestesia')}
        </div>
      </div>
      <div class="entrega-inline-form__foot">
        <div class="entrega-inline-form__foot-actions entrega-inline-form__foot-actions--end">
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" data-action="cancel-form" onClick={onCancel}>Cancelar</button>
          <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" data-action="add-item" onClick={add}>Añadir</button>
        </div>
      </div>
    </div>
  );
}

/** «Procedimientos y estudios»: list, flags, delete and the add form. */
export function ProcedimientosPanel({ items, setItems, actor, getNow = () => new Date() }) {
  const [adding, setAdding] = useState(false);
  const onFlag = (id, flag, checked) => setItems((list) => list.map((it) =>
    it.id !== id || it.type !== 'procedimiento' ? it : { ...it, [flag]: !!checked, updatedAt: new Date().toISOString() }));
  const onDelete = async (item) => {
    if (!canDeletePendienteItem(item, actor)) return notify('No puedes eliminar este procedimiento.', 'error');
    const result = await openConfirm({
      weight: 'destructive',
      title: '¿Eliminar procedimiento?',
      message: item.label ? `Se eliminará «${item.label}» de la lista de pendientes.` : 'Se eliminará este procedimiento de la lista de pendientes.',
      confirmLabel: 'Eliminar',
    });
    if (result === 'confirm') setItems((list) => list.filter((it) => it.id !== item.id));
  };
  return (
    <section class="clinical-teams-section clinical-teams-section--directory entrega-panel entrega-panel--pendientes" aria-label="Procedimientos y estudios">
      <details class="entrega-proc-details" open={items.length > 0 || adding}>
        <summary class="entrega-proc-summary">
          <h4 class="clinical-teams-section-title">Procedimientos y estudios</h4>
        </summary>
        <div class="entrega-panel-body entrega-proc-block">
          <div class="entrega-proc-toolbar">
            <button type="button" id="btn-entrega-add-proc" class="wb-btn wb-btn-secondary" onClick={() => setAdding(true)}>
              + Procedimiento
            </button>
          </div>
          <ul id="entrega-proc-list" class="entrega-proc-list">
            {items.length
              ? items.map((item) => <ProcCard key={item.id} item={item} actor={actor} onFlag={onFlag} onDelete={onDelete} />)
              : <li class="entrega-proc-empty">Sin procedimientos. Usa + Agregar.</li>}
          </ul>
          <div id="entrega-proc-form" class={'entrega-proc-form' + (adding ? '' : ' hidden')} aria-hidden={adding ? 'false' : 'true'}>
            {adding ? (
              <AddProcForm now={getNow()} actor={actor} onCancel={() => setAdding(false)}
                onAdd={(item) => { setItems((list) => [...list, item]); setAdding(false); }} />
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}

const NavChevron = ({ points }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points={points} /></svg>
);

/**
 * @param {{ model: object, draftRef: { current: (() => object) | null }, onCancel: () => void,
 *   onSubmit: () => void, onNav: (delta: number) => void, getNow?: () => Date }} props
 */
export function EntregaModal({ model, draftRef, onCancel, onSubmit, onNav, getNow }) {
  const [covering, setCovering] = useState(model.covering.value);
  const [team, setTeam] = useState(model.team.value);
  const [handoff, setHandoff] = useState(model.initial.handoff);
  const [isCritical, setCritical] = useState(model.initial.isCritical);
  const [vitalsUi, setVitalsUi] = useState(model.initial.vitalsUi);
  const [items, setItems] = useState(model.initial.items);
  draftRef.current = () => ({
    coveringUserId: covering, sourceTeamId: team, isCritical,
    handoffContext: handoffContextFromFields(handoff), vitalsPlan: vitalsPlanFromUi(vitalsUi), items,
  });
  const summary = handoffContextSummary(handoffContextFromFields(handoff));
  const nav = model.nav;
  return (
    <div class="modal entrega-modal entrega-modal--wide wb-modal" id="entrega-modal" role="dialog" aria-modal="true"
      aria-labelledby="entrega-modal-nav-name" data-stop-propagation="">
      <header class="entrega-modal-nav wb-modal-head" id="entrega-modal-nav">
        <button type="button" class="entrega-nav-btn" id="entrega-nav-prev" aria-label="Paciente anterior" disabled={nav.prevDisabled}
          onClick={() => onNav(-1)}><NavChevron points="15 18 9 12 15 6" /></button>
        <div class="entrega-nav-patient wb-modal-title">
          <span class="entrega-nav-patient-name" id="entrega-modal-nav-name" title={nav.name}>{nav.name}</span>
          <span class="entrega-nav-patient-dx" id="entrega-modal-nav-dx">{nav.dx}</span>
        </div>
        <div class="entrega-nav-meta">
          <span class="entrega-active-badge hidden" id="entrega-modal-active-badge">
            <svg width="6" height="6" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
            Entrega activa
          </span>
          <span class="entrega-nav-counter" id="entrega-modal-nav-counter">{nav.counter}</span>
        </div>
        <button type="button" class="entrega-nav-btn" id="entrega-nav-next" aria-label="Paciente siguiente" disabled={nav.nextDisabled}
          onClick={() => onNav(1)}><NavChevron points="9 18 15 12 9 6" /></button>
        <button type="button" class="wb-btn wb-btn-ghost wb-btn-icon wb-modal-close" data-wb-close="" aria-label="Cerrar" onClick={onCancel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </header>
      <h3 id="entrega-modal-title" class="visually-hidden">{model.title}</h3>
      <form id="entrega-form" class="entrega-modal-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div class="entrega-form-body wb-modal-body">
          <section class="entrega-top-strip clinical-teams-create-form" aria-label="Datos de entrega">
            <div class="field-group entrega-field-group--r1">
              <label for="entrega-covering-user">R1 de guardia</label>
              <p id="entrega-covering-hint" class="clinical-teams-section-desc entrega-field-hint">{model.covering.hint}</p>
              <select id="entrega-covering-user" class="profile-input" required value={covering} onChange={(e) => setCovering(e.currentTarget.value)}>
                {model.covering.options.map((o) => <option value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div class="field-group entrega-field-group--patient-team">
              <label for="entrega-source-team">Equipo del paciente</label>
              <p id="entrega-source-team-hint" class={'clinical-teams-section-desc entrega-field-hint' + (model.team.hint ? '' : ' hidden')}>{model.team.hint}</p>
              <select id="entrega-source-team" class="profile-input" required={!model.team.disabled} disabled={model.team.disabled}
                value={team} onChange={(e) => setTeam(e.currentTarget.value)}>
                {model.team.options.map((o) => <option value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div id="entrega-clinical-status-slot" class="field-group">
              <ClinicalStatusField value={handoff.clinicalStatus} onChange={(v) => setHandoff((f) => ({ ...f, clinicalStatus: v }))} />
            </div>
          </section>
          <p id="entrega-flow-hint" class={'clinical-teams-section-desc entrega-modal-lead' + (model.flowHint ? '' : ' hidden')}>{model.flowHint}</p>
          <div id="entrega-handoff-panel" class="entrega-handoff-panel">
            <HandoffPanel f={handoff} set={setHandoff} isCritical={isCritical} setCritical={setCritical}
              markPatientId={model.markPatientId} vitalsUi={vitalsUi} setVitalsUi={setVitalsUi} />
          </div>
          <p id="entrega-handoff-summary" class="entrega-handoff-summary" aria-live="polite">
            {summary === 'Sin resumen clínico' ? '' : summary}
          </p>
          <ProcedimientosPanel items={items} setItems={setItems} actor={model.actor} getNow={getNow} />
        </div>
        <footer class="modal-actions entrega-modal-foot wb-modal-foot">
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" id="btn-entrega-cancel" data-wb-cancel="" onClick={onCancel}>Cancelar</button>
          <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg" id="btn-entrega-save">Guardar paciente</button>
        </footer>
      </form>
    </div>
  );
}

/** Draw the modal into the backdrop host; a new `model.key` remounts it (patient switch). */
export function drawEntregaModal(host, props) {
  render(<EntregaModal key={props.model.key} {...props} />, host);
}

export function clearEntregaModal(host) {
  render(null, host);
}
