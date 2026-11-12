/**
 * Manejo «Enviar a Estado Actual» footer. Preact: same DOM the string builder in
 * medications-soap-footer.mjs made. Every draw unmounts and empties the host first, so the DOM is
 * rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

export function MedNotaFooter({ sala }) {
  return (
    <div class="med-nota-toolbar">
      <div class="med-nota-actions">
        {sala && <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" data-onclick="mediAnadirATratamiento">Añadir a Tratamiento</button>}
        <button type="button" class={'wb-btn ' + (sala ? 'wb-btn-secondary' : 'wb-btn-primary wb-btn-lg')} data-onclick="mediLlevarASOAP">Enviar a Estado Actual</button>
        <button type="button" class="wb-btn wb-btn-secondary" data-onclick="limpiarManejoActual">Limpiar</button>
      </div>
    </div>
  );
}

export function drawMedNotaFooter(host, sala) {
  render(null, host);
  host.textContent = '';
  render(<MedNotaFooter sala={!!sala} />, host);
}

export function clearMedNotaFooter(host) {
  render(null, host);
  host.textContent = '';
}
