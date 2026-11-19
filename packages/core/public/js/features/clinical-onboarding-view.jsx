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

export function Stage({ title, stepperIndex, lead, children }) {
  return (
    <div class="clinical-onboarding-stage">
      <div class="clinical-onboarding-stage-inner">
        {stepperIndex != null ? <Stepper index={stepperIndex} /> : null}
        <h3 class="clinical-onboarding-title">{title}</h3>
        {lead != null ? <div class="clinical-onboarding-lead">{lead}</div> : null}
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

const ICON = { class: 'clinical-onboard-mode-card-icon', width: '22', height: '22', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };

function ModeCard({ mode, icon, title, desc, primary }) {
  return (
    <button type="button" class={`clinical-onboard-mode-card${primary ? ' clinical-onboard-mode-card--primary' : ''}`} data-sync-mode={mode}>
      <span class="clinical-onboard-mode-card-icon-wrap"><svg {...ICON}>{icon}</svg></span>
      <span class="clinical-onboard-mode-card-head">
        <span class="clinical-onboard-mode-card-title">{title}</span>
        <span class="clinical-onboard-mode-card-desc">{desc}</span>
      </span>
      <svg class="clinical-onboard-mode-card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  );
}

/** Step 1: Nube / ya tengo cuenta / solo este equipo. */
export function SyncModeChoice() {
  return (
    <Stage title="¿Cómo usarás R+?" stepperIndex={1} lead={<p>Elige cómo usarás R+ en este equipo. Con Nube creas cuenta o entras si ya tienes una; en solo equipo trabajas sin sincronizar.</p>}>
      <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
        <ModeCard mode="nube" primary title="Guardia con R+ Cloud" icon={<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />}
          desc={<>Crea tu @usuario, elige rotación y sincroniza censo y equipos por <strong>Nube</strong>.</>} />
        <ModeCard mode="existing" title="Ya tengo cuenta"
          icon={<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></>}
          desc={<>Inicia sesión en Nube, recuerda este dispositivo y restaura tu censo y <strong>Mi rotación</strong>.</>} />
        <ModeCard mode="local" title="Solo este equipo"
          icon={<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></>}
          desc="Sin Nube: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida." />
      </div>
    </Stage>
  );
}

/** Step 3: join a team. `who` is "@user · R2 · Sala 1" or ''; `cloudSala` picks the hint list. */
export function TeamStep({ who, cloudSala, skipCloudSync }) {
  return (
    <Stage title="Únete a un equipo" stepperIndex={3}
      lead={<>
        {who ? <p>Tu perfil y Nube están listos (<strong>{who}</strong>). Elige tu equipo de guardia.</p> : <p>Tu perfil y Nube están listos. Elige tu equipo de guardia.</p>}
        <ul class="clinical-onboard-team-hints">
          {cloudSala ? <>
            <li>En <strong>Mi rotación → Explorar</strong> verás equipos de tu sala sincronizados por Nube; pulsa <strong>Unirme</strong>.</li>
            <li>Si no hay ninguno, <strong>Crear nuevo equipo</strong> (queda publicado a la sala).</li>
            <li>O pega el <strong>código de invitación</strong> de tu R2.</li>
          </> : <li>En <strong>Mi rotación</strong> explora equipos de tu sala o pide código a tu R2.</li>}
        </ul>
      </>}>
      <p class="clinical-onboarding-status" id="clinical-onboard-team-status">{skipCloudSync ? 'Listo. Abre Mi rotación para unirte o crear equipo.' : 'Buscando equipos en tu sala…'}</p>
      <div class="clinical-onboard-team-actions">
        <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" data-team-onboard-open="">Abrir Mi rotación</button>
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
export const drawSyncModeChoice = (host) => paint(host, <SyncModeChoice />);
export const drawTeamStep = (host, props) => paint(host, <TeamStep {...props} />);
