import {
  loadGuardiaV7Progress,
  saveGuardiaV7Progress,
  isGuardiaV7TrackComplete,
  guardiaV7ProgressSummary,
} from '../../guardia-v7-progress.mjs';
import { drawGuardiaV7Card } from './guardia-v7-upgrade-card-view.jsx';
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
    drawGuardiaV7Card(el, { progress: progress, startLabel: startLabel });
    main.prepend(el);
    wireGuardiaV7UpgradeCardOnce(el);
  };

  if (delayMs > 0) setTimeout(run, delayMs);
  else run();
}
