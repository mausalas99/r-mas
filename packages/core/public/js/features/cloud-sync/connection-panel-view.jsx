/**
 * ⇄ Conexión fallback card (local-only / unsupported rotation). Preact: same markup the string
 * template in connection-panel.mjs wrote.
 */
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
