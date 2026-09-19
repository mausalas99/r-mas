import {
  loadGuardiaV7Progress,
  saveGuardiaV7Progress,
  isGuardiaV7TrackComplete,
  guardiaV7ProgressSummary,
} from '../../guardia-v7-progress.mjs';
import { needsClinicalOnboarding } from '../clinical-onboarding.mjs';

function wireGuardiaV7UpgradeCardOnce(el) {
  if (!el || el._rpcGuardiaV7CardWired) return;
  el._rpcGuardiaV7CardWired = true;
  el.querySelector('#guardia-v7-upgrade-start')?.addEventListener('click', () => {
    document.getElementById('guardia-v7-upgrade-card')?.remove();
    void import('./tour-runtime.mjs').then((mod) => {
      if (typeof mod.startTourModule === 'function') {
        mod.startTourModule('ch-guardia-modo');
      }
    });
  });
  el.querySelector('#guardia-v7-upgrade-later')?.addEventListener('click', () => {
    dismissGuardiaV7UpgradeCard();
  });
}

export function dismissGuardiaV7UpgradeCard() {
  saveGuardiaV7Progress({ dismissedCard: true });
  document.getElementById('guardia-v7-upgrade-card')?.remove();
}

export function maybeShowGuardiaV7UpgradeCard({ delayMs = 0 } = {}) {
  if (needsClinicalOnboarding()) return;
  const { dismissedCard } = loadGuardiaV7Progress();
  if (dismissedCard || isGuardiaV7TrackComplete()) return;

  const run = () => {
    if (needsClinicalOnboarding()) return;
    if (document.getElementById('guardia-v7-upgrade-card')) return;
    const main = document.getElementById('main-area');
    if (!main) return;

    const progress = guardiaV7ProgressSummary();
    const startLabel =
      progress.completed > 0 && progress.completed < progress.total
        ? 'Continuar guía de guardia'
        : 'Empezar guía de guardia';

    const el = document.createElement('div');
    el.id = 'guardia-v7-upgrade-card';
    el.className = 'clinical-onboarding-card guardia-v7-upgrade-card';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Novedades de guardia en R+');
    el.innerHTML =
      '<h3 class="clinical-onboarding-title">Novedades de guardia</h3>' +
      '<p class="guardia-v7-upgrade-progress" aria-live="polite">' +
      'Progreso: <strong>' +
      progress.completed +
      '/' +
      progress.total +
      '</strong> capítulos (' +
      progress.percent +
      '%)</p>' +
      '<div class="guardia-v7-upgrade-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      progress.percent +
      '">' +
      '<span class="guardia-v7-upgrade-meter-fill" style="width:' +
      progress.percent +
      '%"></span></div>' +
      '<ul class="guardia-v7-upgrade-bullets">' +
      '<li><strong>Modo Guardia</strong> — tablero de turno, franja Nube/sala/equipo y alcance por rango.</li>' +
      '<li><strong>Modo Entrega</strong> — handoff, roster, pendientes y cierre de turno.</li>' +
      '<li><strong>R+ Cloud y rotación</strong> — sala Nube, Mi rotación, herencia de pacientes y enlace móvil.</li>' +
      '</ul>' +
      '<div class="modal-actions guardia-v7-upgrade-actions">' +
      '<button type="button" class="btn-save" id="guardia-v7-upgrade-start">' +
      startLabel +
      '</button>' +
      '<button type="button" class="btn-med-secondary" id="guardia-v7-upgrade-later">Ver después</button>' +
      '</div>';
    main.prepend(el);
    wireGuardiaV7UpgradeCardOnce(el);
  };

  if (delayMs > 0) setTimeout(run, delayMs);
  else run();
}
