/**
 * Update-modal action buttons. Preact: same DOM the createElement/appendChild code in electron-handlers.mjs
 * made. Each draw unmounts first and empties the host, like the old `innerHTML = ''`, because modal-ui.mjs
 * and downgrade.mjs still clear and fill the same two hosts by hand.
 */
import { render } from 'preact';

/** Primary row when a new version is found. Nothing for a downgrade. */
export function AvailablePrimary({ isDowngrade, onLater }) {
  return isDowngrade ? null : <button class="btn-secondary" onClick={onLater}>Más tarde</button>;
}

/** Secondary row when a new version is found. Nothing for a downgrade. */
export function AvailableSecondary({ isDowngrade, onNotes }) {
  return isDowngrade ? null : <button type="button" class="btn-link" onClick={onNotes}>Ver notas en GitHub</button>;
}

/** Primary row once the download is done. */
export function ReadyPrimary({ isDowngrade, onInstall, onLater }) {
  return (
    <>
      <button class="btn-primary" onClick={onInstall}>{isDowngrade ? 'Restaurar y reiniciar' : 'Instalar y reiniciar'}</button>
      {isDowngrade ? null : <button class="btn-secondary" onClick={onLater}>Instalar al cerrar</button>}
    </>
  );
}

/** Error modal: retry. */
export function ErrorPrimary({ onRetry }) {
  return <button class="btn-primary" onClick={onRetry}>Reintentar</button>;
}

/** Native-runtime failure modal, primary row. */
export function RecoveryPrimary({ onSettings, onReleases }) {
  return (
    <>
      <button class="btn-primary" onClick={onSettings}>Abrir restaurar versión estable…</button>
      <button class="btn-secondary" onClick={onReleases}>Ver releases en GitHub</button>
    </>
  );
}

/** Native-runtime failure modal, secondary row. */
export function RecoverySecondary({ onClose }) {
  return <button class="btn-secondary" onClick={onClose}>Continuar de todos modos</button>;
}

/** Empty the host (and any Preact tree in it); with a vnode, draw it fresh. */
export function drawUpdateActions(host, vnode) {
  render(null, host);
  host.textContent = '';
  if (vnode) render(vnode, host);
}

export const drawAvailablePrimary = (host, props) => drawUpdateActions(host, <AvailablePrimary {...props} />);
export const drawAvailableSecondary = (host, props) => drawUpdateActions(host, <AvailableSecondary {...props} />);
export const drawErrorPrimary = (host, props) => drawUpdateActions(host, <ErrorPrimary {...props} />);
export const drawRecoveryPrimary = (host, props) => drawUpdateActions(host, <RecoveryPrimary {...props} />);
export const drawRecoverySecondary = (host, props) => drawUpdateActions(host, <RecoverySecondary {...props} />);
export const drawReadyPrimary = (host, props) => drawUpdateActions(host, <ReadyPrimary {...props} />);
