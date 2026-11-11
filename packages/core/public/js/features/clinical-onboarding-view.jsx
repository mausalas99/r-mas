/**
 * First-run onboarding panels that are pure drawing. Preact: same DOM, classes and ids the string
 * builders in clinical-onboarding-shell.mjs / -main.mjs / -render.mjs made. Those files keep the gates,
 * the DB checks and every handler; the boot progress bar and the `hidden` flags are edited in place
 * after a draw, so each draw unmounts first and repaints from scratch.
 * The Stage frame and Stepper mirror buildOnboardingStageHtml / buildClinicalOnboardingStepperHtml,
 * which stay for the panels not ported yet (and clinical-onboarding-early-boot.js).
 */
import { render } from 'preact';
import { Button } from '../ui-kit/kit.jsx';

const STEP_LABELS = ['Modo', 'Perfil', 'Equipo'];

/** @param {{ index: 1|2|3 }} p */
export function Stepper({ index }) {
  const total = STEP_LABELS.length;
  return (
    <div class="clinical-onboarding-progress" role="progressbar" aria-label="Progreso del registro" aria-valuemin="1" aria-valuemax={String(total)} aria-valuenow={String(index)}>
      <span class="clinical-onboarding-progress-label">{`Paso ${index} de ${total} · ${STEP_LABELS[index - 1]}`}</span>
      <span class="clinical-onboarding-progress-track">
        {STEP_LABELS.map((_, i) => <span class={i + 1 < index ? 'is-done' : i + 1 === index ? 'is-active' : ''}></span>)}
      </span>
    </div>
  );
}

function Stage({ title, stepperIndex, children }) {
  return (
    <div class="clinical-onboarding-stage">
      <div class="clinical-onboarding-stage-inner">
        {stepperIndex != null ? <Stepper index={stepperIndex} /> : null}
        <h3 class="clinical-onboarding-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** @param {{ title?: string, message?: string, stepperIndex?: number|null }} p */
export function BootLoading({ title, message, stepperIndex }) {
  return (
    <Stage title={title || 'Preparando R+'} stepperIndex={stepperIndex}>
      <div class="clinical-onboard-boot-loader" role="status" aria-live="polite" aria-busy="true">
        <div class="clinical-onboard-boot-loader-row">
          <span class="clinical-onboard-boot-spinner" aria-hidden="true"></span>
          <p class="clinical-onboarding-status clinical-onboard-boot-progress-label">{message || 'Iniciando R+…'}</p>
        </div>
        <div class="clinical-onboard-boot-progress-track" aria-hidden="true">
          <div class="clinical-onboard-boot-progress-bar" style="width:3%"></div>
        </div>
      </div>
    </Stage>
  );
}

/** @param {{ lead: string, retry: boolean }} p retry: show «Reintentar» (not when the native module is missing) */
export function SessionBlock({ lead, retry }) {
  return (
    <Stage title="Sesión clínica">
      <div class="clinical-onboarding-lead"><p>{lead}</p></div>
      {retry ? (
        <div class="modal-actions clinical-onboard-session-actions">
          <Button primary class="wb-btn-lg" id="clinical-onboard-retry-session-btn">Reintentar</Button>
        </div>
      ) : null}
    </Stage>
  );
}

export function LocalOnlyConfirm() {
  return (
    <Stage title="Solo este equipo" stepperIndex={2}>
      <div class="clinical-onboarding-lead"><p>Los expedientes y notas quedan solo en esta Mac. Sin Nube, rotaciones ni sala compartida.</p></div>
      <p id="onboard-local-only-error" class="clinical-registration-error" hidden></p>
      <div class="modal-actions clinical-onboard-form-actions">
        <Button primary class="wb-btn-lg" id="clinical-onboard-local-confirm-btn">Entrar a R+</Button>
        <button type="button" id="clinical-onboard-mode-back-btn" class="wb-btn wb-btn-secondary">Cambiar modo</button>
      </div>
    </Stage>
  );
}

/** @param {{ message: string }} p */
export function LoadError({ message }) {
  return <p class="clinical-registration-error">{message}</p>;
}

/** Repaint `host` from scratch with `vnode`. Edited in place after a draw, so never diffed twice. */
function paint(host, vnode) {
  render(null, host);
  host.replaceChildren();
  render(vnode, host);
}

export const drawBootLoading = (host, props) => paint(host, <BootLoading {...props} />);
export const drawSessionBlock = (host, props) => paint(host, <SessionBlock {...props} />);
export const drawLocalOnlyConfirm = (host) => paint(host, <LocalOnlyConfirm />);
export const drawLoadError = (host, message) => paint(host, <LoadError message={message} />);
