/** «¿Es este paciente?» confirm dialog. Preact: same DOM the string builder in patient-registro-tunnel.mjs wrote. */
import { render } from 'preact';

export function TunnelConfirm({ title, nombre, reg, studyCount, omitLabel, showStop }) {
  return (
    <div class="lab-conflict-modal" role="dialog" aria-modal="true">
      <h3>{title}</h3>
      <p><strong>{nombre}</strong><br />Registro: {reg}{studyCount ? <><br />{studyCount + ' estudio' + (studyCount === 1 ? '' : 's') + ' en el rango'}</> : null}</p>
      <div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">
        {showStop ? <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" id="patient-registro-tunnel-stop">Detener cola</button> : null}
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" id="patient-registro-tunnel-cancel">{omitLabel}</button>
        <button type="button" class="wb-btn wb-btn-primary wb-btn-block" id="patient-registro-tunnel-confirm">Agregar al censo</button>
      </div>
    </div>
  );
}

export function drawTunnelConfirm(backdrop, props) {
  render(null, backdrop);
  backdrop.textContent = '';
  render(<TunnelConfirm {...props} />, backdrop);
}
