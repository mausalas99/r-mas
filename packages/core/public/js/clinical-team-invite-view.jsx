/**
 * Safari / browser gate card for a team invite link: explains that only the desktop app can join.
 * Preact: same DOM the old innerHTML template in clinical-team-invite.mjs built. The caller owns the
 * wrapper element (id, role, aria-modal) and passes `onDismiss`.
 */
import { render } from 'preact';

/** @param {{ code: string, onDismiss: () => void }} p */
export function BrowserGateCard({ code, onDismiss }) {
  return (
    <div class="clinical-team-invite-browser-gate-card">
      <h2>Únete desde la app R+ en Mac</h2>
      <p>Los enlaces en Safari no agregan al equipo clínico (solo la app de escritorio con tu base de datos).</p>
      <p class="clinical-team-invite-browser-gate-code">Código: <strong>{code}</strong></p>
      <ol>
        <li>Abre la aplicación <strong>R+</strong> en tu Mac (no el navegador).</li>
        <li>Ve a <strong>Mi rotación</strong>.</li>
        <li>En <strong>Unirte con código de equipo</strong>, pega: <code>{code}</code></li>
      </ol>
      <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" id="clinical-team-invite-browser-gate-dismiss" onClick={onDismiss}>Entendido</button>
    </div>
  );
}

export function drawBrowserGate(host, props) {
  render(<BrowserGateCard {...props} />, host);
}
