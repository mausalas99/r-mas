/**
 * ⇄ Conexión fallback card (local-only / unsupported rotation). Preact: same markup the string
 * template in connection-panel.mjs wrote. Also the small pieces ⇄ Conexión inserts next to existing DOM
 * (the «Siguiente paso» card, the Equipo embed host): drawn off-page, nodes moved in, neighbours left alone.
 */
import { render } from 'preact';
import { mount } from './panel-admin-view.jsx';

export const FALLBACK_COPY = {
  'local-only': {
    title: 'Solo este equipo',
    body: <>Este modo no usa R+ Cloud ni ⇄ Conexión. Para sincronizar censo y equipos, activa guardia en <strong>Ajustes → Respaldos, sync y recuperación</strong>.</>,
  },
  'unsupported-sala': {
    title: 'Conexión no disponible',
    body: 'Tu rotación actual no usa Nube. Completa el registro en la pantalla principal o elige una rotación con sincronización.',
  },
};

export function ConnectionFallback({ kind }) {
  const copy = FALLBACK_COPY[kind] || FALLBACK_COPY['unsupported-sala'];
  return (
    <section class="cloud-sync-conexion cloud-sync-conexion--fallback" data-cloud-nube-fallback="1">
      <h4 class="cloud-sync-conexion-title">{copy.title}</h4>
      <p class="cloud-sync-hint">{copy.body}</p>
    </section>
  );
}

export const drawConnectionFallback = (root, kind) => mount(root, <ConnectionFallback kind={kind} />);

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
