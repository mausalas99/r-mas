/**
 * Mi rotación panel host states: loading skeleton and load error.
 * Preact: same markup the string templates in clinical-panel-host.mjs wrote.
 */
import { render } from 'preact';

/** @param {{ className?: string, lines?: number }} p */
export function PanelSkeleton({ className, lines }) {
  const count = Math.max(1, Number(lines) || 3);
  return (
    <div class={className || 'skel-panel'} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div class="skel-line" style={`width:${55 + ((i * 17) % 35)}%`}></div>
      ))}
    </div>
  );
}

/** @param {{ message: string }} p */
export function PanelError({ message }) {
  return (
    <>
      <p class="clinical-registration-error">{message}</p>
      <p class="clinical-teams-lead">Cierra este diálogo y vuelve a abrir <strong>Mi rotación</strong>. Si sigue vacío, reinicia R+ por completo (Cmd+Q).</p>
    </>
  );
}

/** Replace whatever is in `host` with `vnode` (also drops a previous Preact tree). */
export function drawPanelHost(host, vnode) {
  render(null, host);
  if (vnode) render(vnode, host);
}

export const drawPanelSkeleton = (host) =>
  drawPanelHost(host, <PanelSkeleton className="clinical-teams-skeleton skel-panel" lines={3} />);
export const drawPanelError = (host, message) => drawPanelHost(host, <PanelError message={message} />);
