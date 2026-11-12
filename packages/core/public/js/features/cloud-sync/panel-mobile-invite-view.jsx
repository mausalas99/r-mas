/**
 * Nube ⇄ iPad / R+ Móvil invite card: hint, copy-link button, copy-QR button and the QR preview.
 * Preact: same DOM, classes and inline styles the old hand-built elements had. UI only: the toasts and
 * clipboard calls are passed in by panel-mobile-invite.mjs. The QR is drawn on the canvas after it is
 * in the page; if drawing throws the preview is left empty and hidden from screen readers, as before.
 */
import { render } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { drawInternoQrCanvas } from '../../interno-qr-render.mjs';

function QrPreview({ url }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => {
    try {
      drawInternoQrCanvas(canvasRef.current, url, { cellPx: 2, margin: 10 });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [url]);
  return (
    <div class="cloud-mobile-invite-qr-host" style="margin-top:8px;display:flex;justify-content:center;" aria-hidden={failed ? 'true' : undefined}>
      {failed ? null : <canvas ref={canvasRef} class="cloud-mobile-invite-qr-canvas" role="img" aria-label="Código QR del enlace móvil Nube" />}
    </div>
  );
}

export function InviteCard({ url, onCopyLink, onCopyQr }) {
  return (
    <div class="cloud-mobile-invite-panel lan-invite-collapsible--mobile lan-invite-collapsible--cloud">
      <p class="lan-connect-card-hint" style="margin:0 0 8px;">Enlace <strong>permanente</strong> ligado a <strong>tu @usuario</strong>. No cambia con la rotación — el iPad entra a tu sala nube activa. Ábrelo en Safari → <strong>Añadir a pantalla de inicio</strong>.</p>
      <button type="button" class="wb-btn wb-btn-primary cloud-mobile-invite-copy-btn" style="width:100%;" onClick={onCopyLink}>Copiar enlace móvil (Nube)</button>
      <div class="lan-connect-actions-row" style="margin-top:8px;">
        <button type="button" class="wb-btn wb-btn-secondary" style="flex:1;" onClick={onCopyQr}>Copiar QR</button>
      </div>
      <QrPreview url={url} />
    </div>
  );
}

/** Draw the card into `host`, or empty it when there is no invite (`props` null). */
export function drawInviteCard(host, props) {
  render(null, host);
  host.textContent = '';
  if (props) render(<InviteCard {...props} />, host);
}
