/**
 * Small ⇄ Conexión pieces inserted next to existing DOM: the «Siguiente paso» card and the Equipo
 * embed host. Preact: same markup the string builders in panel-conexion-html.mjs wrote. They are
 * drawn off-page and the nodes moved in, so the neighbours are left alone.
 */
import { render } from 'preact';

export const NextStep = () => (
  <div class="cloud-sync-next-step">
    <p class="cloud-sync-next-step-lead">Siguiente paso</p>
    <p class="cloud-sync-hint">Configura tu equipo en ⇄ Conexión → Opciones → Equipo.</p>
    <button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cloud-action="open-rotation">Ir a Equipo</button>
  </div>
);

export const EquipoEmbedHost = () => (
  <div class="cloud-sync-equipo-embed" data-cloud-equipo-host="">
    <div class="clinical-teams-panel-body clinical-teams-panel-body--embed"></div>
  </div>
);

/** @param {import('preact').VNode} vnode @returns {Node[]} */
function nodesOf(vnode) {
  const tmp = document.createElement('div');
  render(vnode, tmp);
  return Array.from(tmp.childNodes);
}

/** Put the card right after `anchor`. */
export const insertNextStepAfter = (anchor) => anchor.after(...nodesOf(<NextStep />));
/** Put the Equipo host first inside `body`. */
export const prependEquipoHost = (body) => body.prepend(...nodesOf(<EquipoEmbedHost />));
