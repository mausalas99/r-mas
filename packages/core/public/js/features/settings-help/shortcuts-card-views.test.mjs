import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { ShortcutsBody } from './shortcuts-modal-view.jsx';
  import { GuardiaV7Card } from './guardia-v7-upgrade-card-view.jsx';
  export const keys = (p) => renderToString(<ShortcutsBody {...p} />);
  export const card = (p) => renderToString(<GuardiaV7Card {...p} />);`);

// Expected strings are what the old string builders wrote for the same synthetic input.
test('shortcuts body equals the old markup', () => {
  const groups = [{ title: 'Gen & más', items: [{ label: 'Abrir', hint: 'rápido', keys: ['⌘', 'K'] }, { label: 'Pegar', keys: ['Ctrl+V'] }] }];
  sameHtml(view.keys({ groups, mod: '⌘' }),
    '<section class="shortcuts-section"><h4 class="shortcuts-section-title">Gen &amp; más</h4><ul class="shortcuts-rows">' +
    '<li class="shortcuts-row"><div class="shortcuts-row-copy"><span class="shortcuts-row-label">Abrir</span><span class="shortcuts-row-hint">rápido</span></div><span class="shortcuts-key-group"><kbd class="shortcuts-key">⌘</kbd><kbd class="shortcuts-key">K</kbd></span></li>' +
    '<li class="shortcuts-row"><div class="shortcuts-row-copy"><span class="shortcuts-row-label">Pegar</span></div><span class="shortcuts-key-group"><kbd class="shortcuts-key">⌘+V</kbd></span></li>' +
    '</ul></section>', 'shortcuts');
});

test('guardia v7 card equals the old markup', () => {
  sameHtml(view.card({ progress: { completed: 2, total: 5, percent: 40 }, startLabel: 'Continuar guía de guardia' }),
    '<h3 class="clinical-onboarding-title">Novedades de guardia</h3>' +
    '<p class="guardia-v7-upgrade-progress" aria-live="polite">Progreso: <strong>2/5</strong> capítulos (40%)</p>' +
    '<div class="guardia-v7-upgrade-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"><span class="guardia-v7-upgrade-meter-fill" style="width:40%"></span></div>' +
    '<ul class="guardia-v7-upgrade-bullets"><li><strong>Modo Guardia</strong>: tablero de turno, franja Nube/sala/equipo y alcance por rango.</li>' +
    '<li><strong>Modo Entrega</strong>: handoff, roster, pendientes y cierre de turno.</li>' +
    '<li><strong>R+ Cloud y rotación</strong>: sala Nube, Mi rotación, herencia de pacientes y enlace móvil.</li></ul>' +
    '<div class="modal-actions guardia-v7-upgrade-actions"><button type="button" class="wb-btn wb-btn-primary wb-btn-lg" id="guardia-v7-upgrade-start">Continuar guía de guardia</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary" id="guardia-v7-upgrade-later">Ver después</button></div>', 'card');
});
