/** «Novedades de guardia» card content. Preact: same markup the string builder wrote. */
import { render } from 'preact';

export function GuardiaV7Card({ progress, startLabel }) {
  return (
    <>
      <h3 class="clinical-onboarding-title">Novedades de guardia</h3>
      <p class="guardia-v7-upgrade-progress" aria-live="polite">Progreso: <strong>{progress.completed}/{progress.total}</strong> capítulos ({progress.percent}%)</p>
      <div class="guardia-v7-upgrade-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={String(progress.percent)}>
        <span class="guardia-v7-upgrade-meter-fill" style={'width:' + progress.percent + '%'}></span>
      </div>
      <ul class="guardia-v7-upgrade-bullets">
        <li><strong>Modo Guardia</strong> — tablero de turno, franja Nube/sala/equipo y alcance por rango.</li>
        <li><strong>Modo Entrega</strong> — handoff, roster, pendientes y cierre de turno.</li>
        <li><strong>R+ Cloud y rotación</strong> — sala Nube, Mi rotación, herencia de pacientes y enlace móvil.</li>
      </ul>
      <div class="modal-actions guardia-v7-upgrade-actions">
        <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" id="guardia-v7-upgrade-start">{startLabel}</button>
        <button type="button" class="wb-btn wb-btn-secondary" id="guardia-v7-upgrade-later">Ver después</button>
      </div>
    </>
  );
}

export function drawGuardiaV7Card(host, props) {
  render(null, host);
  host.textContent = '';
  render(<GuardiaV7Card {...props} />, host);
}
