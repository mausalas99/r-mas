/** Estado actual panel pieces rendered with Preact. Loaded lazily from estado-actual-panel-render.mjs. */
import { render } from 'preact';
import { EaClinicoSection } from './estado-actual-panel-clinico-view.jsx';
import { EaHistorialSection, EaSnapshotSection } from './estado-actual-panel-snapshot-view.jsx';

// One lazy entry for the panel and the registro form: fewer separately loaded chunks (boot chunk budget).
export { paintRegistroForm } from './estado-actual-panel-registro-form-view.jsx';

export function EmptyPanel() {
  return (
    <div class="estado-actual-panel ea-empty">
      <div class="empty-state empty-state--compact" role="status">
        <h3 class="empty-state-title">Selecciona un paciente para monitoreo</h3>
        <p class="empty-state-lead">Elige uno en el censo de la izquierda. Ahí podrás registrar signos, balance hídrico y dieta.</p>
      </div>
    </div>
  );
}

export function ChartsSummaryButton({ canOpen }) {
  return (
    <button
      type="button"
      id="ea-charts-summary"
      class="ea-btn ea-btn--ghost ea-charts-open-btn"
      {...(canOpen
        ? { 'data-onclick': 'openEstadoActualChartsModal' }
        : { disabled: true, title: 'Registra al menos 2 mediciones para ver gráficas.' })}
    >
      <svg class="ea-charts-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-10" />
        <path d="M3 12l5-4 4 3 9-7" />
      </svg>
      <span>Ver gráficas</span>
    </button>
  );
}

/** Sala: solo registro manual. Interconsulta: registro + enviar a nota. */
export function ActionBarButtons({ sala }) {
  return (
    <>
      <button type="button" class="ea-btn ea-btn--primary" data-onclick="openEstadoActualRegistroModal">Registro manual</button>
      {sala ? null : <button type="button" class="ea-btn ea-btn--success" data-onclick="estadoActualEnviarANota">Enviar a nota</button>}
    </>
  );
}

/** @param {{ savedLabel: string, chartsCanOpen: boolean, sala: boolean, clinico: object, historial: object }} p */
export function EaPanelShell(p) {
  return (
    <div class="estado-actual-panel">
      <div class="ea-action-bar">
        <h3 class="fit-title">Estado actual</h3>
        <span id="ea-meta-guardado" class="ea-meta-guardado">{p.savedLabel}</span>
        <div class="ea-action-bar__cluster" role="group" aria-label="Acciones de monitoreo">
          <ChartsSummaryButton canOpen={p.chartsCanOpen} />
          <ActionBarButtons sala={p.sala} />
        </div>
      </div>
      <div class="ea-main">
        <EaClinicoSection {...p.clinico} />
        <EaHistorialSection {...p.historial} />
      </div>
    </div>
  );
}

/**
 * Render into a scratch container and move the nodes in: `mount` is also written by other code
 * (patches, med grid), so it must not become a Preact root (stale vdom on the next render).
 */
function paint(scratchTarget, vnode) {
  const scratch = document.createElement('div');
  render(vnode, scratch);
  scratchTarget(scratch.childNodes);
}

export function renderEmptyPanel(mount) {
  paint((nodes) => mount.replaceChildren(...nodes), <EmptyPanel />);
}

export function paintShell(mount, props) {
  paint((nodes) => mount.replaceChildren(...nodes), <EaPanelShell {...props} />);
}

export function replaceClinico(el, clinico) {
  paint((nodes) => el.replaceWith(...nodes), <EaClinicoSection {...clinico} />);
}

export function replaceSnapshot(el, snapshot) {
  paint((nodes) => el.replaceWith(...nodes), <EaSnapshotSection {...snapshot} />);
}

export function replaceHistorial(el, historial) {
  paint((nodes) => el.replaceWith(...nodes), <EaHistorialSection {...historial} />);
}

export function replaceChartsSummary(el, canOpen) {
  paint((nodes) => el.replaceWith(...nodes), <ChartsSummaryButton canOpen={canOpen} />);
}
