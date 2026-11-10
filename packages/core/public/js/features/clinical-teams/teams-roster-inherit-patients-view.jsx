/**
 * Body of the «Heredar pacientes» modal (`#inherit-patients-body`), one component per step.
 * Preact: same DOM, classes and data-* hooks the string builders in teams-roster-inherit-patients-modal.mjs
 * made. The modal keeps the step state, the footer and the events; this view is pure.
 */
import { render } from 'preact';
import { Button } from '../../ui-kit/kit.jsx';

const STEP_LABELS = ['Destino', 'Origen', 'Pacientes', 'Confirmar'];

/** @param {{ step: number }} p step 0..3 */
export function InheritStepDots({ step }) {
  return (
    <ol class="inherit-steps" aria-label="Pasos de herencia">
      {STEP_LABELS.map((label, i) => (
        <li class={i === step ? 'inherit-step inherit-step--current' : i < step ? 'inherit-step inherit-step--done' : 'inherit-step'}>
          <span class="inherit-step-num">{i + 1}</span>
          <span class="inherit-step-label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** @param {{ targetName?: string, sala?: string, cycle?: string }} p */
export function StepDestino({ targetName, sala, cycle }) {
  const name = String(targetName || 'tu equipo').trim();
  const meta = [sala, cycle ? `ciclo ${cycle}` : ''].filter(Boolean).join(' · ');
  return (
    <>
      <InheritStepDots step={0} />
      <p class="inherit-patients-lead">Paso 1 — Tu equipo <strong>nuevo</strong> (destino de los pacientes).</p>
      <div class="inherit-dest-card">
        <p class="inherit-dest-eyebrow">Te uniste a</p>
        <p class="inherit-dest-name">{name}</p>
        {meta ? <p class="inherit-dest-meta">{meta}</p> : null}
      </div>
    </>
  );
}

/** @param {{ targetName: string, sources?: object[], unassignedCount?: number, selectedSourceId?: string }} p */
export function StepOrigen({ targetName, sources, unassignedCount, selectedSourceId }) {
  const list = Array.isArray(sources) ? sources : [];
  const selected = String(selectedSourceId ?? '');
  return (
    <>
      <InheritStepDots step={1} />
      <p class="inherit-patients-lead">Paso 2 — ¿Qué equipo del mes anterior te <strong>hereda</strong> pacientes hacia <strong>{targetName}</strong>?</p>
      {list.length === 0 ? <p class="profile-hint">No hay equipos archivados en esta sala. Usa la opción de abajo.</p> : null}
      <ul class="inherit-source-list">
        {list.map((s) => {
          const id = String(s.teamId || '');
          const count = s.patientCount > 0 ? `${s.patientCount} en este Mac` : 'sin expedientes locales aún';
          const meta = [s.sala, s.cycle ? `ciclo ${s.cycle}` : '', count].filter(Boolean).join(' · ');
          return (
            <li>
              <label class="inherit-source-pick">
                <input type="radio" name="inherit-source" data-inherit-source={id} checked={id === selected} />
                <span>
                  <strong>{s.name}</strong>
                  {s.preferred ? <span class="inherit-patients-badge">Sugerido · misma sala y ciclo</span> : null}
                  <span class="inherit-patients-reg">{meta}</span>
                </span>
              </label>
            </li>
          );
        })}
        <li>
          <label class="inherit-source-pick">
            <input type="radio" name="inherit-source" data-inherit-source="" checked={selected === ''} />
            <span>
              <strong>Solo sin equipo / otros</strong>
              <span class="inherit-patients-reg">{`${unassignedCount || 0} paciente(s) locales sin equipo activo`}</span>
            </span>
          </label>
        </li>
      </ul>
    </>
  );
}

/** @param {{ targetName: string, sourceName?: string, patients?: object[], includeUnassigned?: boolean, unassignedCount?: number }} p */
export function StepPacientes({ targetName, sourceName, patients, includeUnassigned, unassignedCount }) {
  const list = Array.isArray(patients) ? patients : [];
  return (
    <>
      <InheritStepDots step={2} />
      <p class="inherit-patients-lead">Paso 3 — Pacientes de <strong>{sourceName || 'sin equipo'}</strong> → <strong>{targetName}</strong>.</p>
      <div class="inherit-patients-toolbar">
        <Button class="wb-btn-secondary" data-inherit-select="all">Seleccionar todos</Button>
        <Button class="wb-btn-secondary" data-inherit-select="none">Ninguno</Button>
      </div>
      {unassignedCount > 0 && sourceName ? (
        <label class="inherit-patients-check inherit-unassigned-toggle">
          <input type="checkbox" data-inherit-include-unassigned="" checked={!!includeUnassigned} />
          <span>{`Incluir también ${unassignedCount} sin equipo asignado`}</span>
        </label>
      ) : null}
      {list.length === 0 ? (
        <p class="inherit-patients-lead">No hay pacientes locales de ese origen en este Mac. Puedes continuar o elegir otro equipo.</p>
      ) : (
        <ul class="inherit-patients-list">
          {list.map((p) => (
            <li>
              <label class="inherit-patients-check">
                <input type="checkbox" data-inherit-patient={String(p.id || '')} checked />
                <span>
                  <strong>{String(p.nombre || 'Sin nombre')}</strong>
                  <span class="inherit-patients-reg">{String(p.registro || 's/reg')}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p class="inherit-patients-count" data-inherit-count="" aria-live="polite"></p>
    </>
  );
}

/** @param {{ targetName: string, sourceName?: string, selectedCount?: number }} p */
export function StepConfirm({ targetName, sourceName, selectedCount }) {
  const n = Number(selectedCount || 0);
  return (
    <>
      <InheritStepDots step={3} />
      <p class="inherit-patients-lead">Paso 4 — Confirma el movimiento.</p>
      <div class="inherit-confirm-card">
        <p><span class="inherit-confirm-label">Desde</span> <strong>{sourceName || 'Sin equipo'}</strong></p>
        <p class="inherit-confirm-arrow" aria-hidden="true">↓</p>
        <p><span class="inherit-confirm-label">Hacia</span> <strong>{targetName}</strong></p>
        <p class="inherit-confirm-count">{n === 1 ? '1 paciente' : `${n} pacientes`}</p>
      </div>
    </>
  );
}

const STEPS = [StepDestino, StepOrigen, StepPacientes, StepConfirm];

/** Draw step `step` (0..3) into `host`. Unmounts first: ticks and the footer edit this DOM behind Preact's back. */
export function drawInheritStep(host, step, props) {
  if (!host) return;
  const Step = STEPS[step] || StepConfirm;
  render(null, host);
  render(<Step {...props} />, host);
}
