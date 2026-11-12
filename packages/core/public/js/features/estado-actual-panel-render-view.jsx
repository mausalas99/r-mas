/** Estado actual panel pieces rendered with Preact. Loaded lazily from estado-actual-panel-render.mjs. */
import { render } from 'preact';

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

/**
 * Render into a scratch container and move the nodes in: `mount` is also written by innerHTML
 * elsewhere, so it must not become a Preact root (stale vdom on the next render).
 */
export function renderEmptyPanel(mount) {
  const scratch = document.createElement('div');
  render(<EmptyPanel />, scratch);
  mount.replaceChildren(...scratch.childNodes);
}
