import {
  guardiaV7ProgressSummary,
  isGuardiaV7TrackComplete,
  loadGuardiaV7Progress,
  saveGuardiaV7Progress
} from "/mobile/js/chunks/chunk-ZUYL4WDU.js";
import {
  needsClinicalOnboarding
} from "/mobile/js/chunks/chunk-JHCY7JRY.js";

// public/js/features/settings-help/guardia-v7-upgrade-card.mjs
function wireGuardiaV7UpgradeCardOnce(el) {
  if (!el || el._rpcGuardiaV7CardWired) return;
  el._rpcGuardiaV7CardWired = true;
  el.querySelector("#guardia-v7-upgrade-start")?.addEventListener("click", () => {
    document.getElementById("guardia-v7-upgrade-card")?.remove();
    void import("/mobile/js/chunks/tour-runtime-JRGZFLMI.js").then((mod) => {
      if (typeof mod.startTourModule === "function") {
        mod.startTourModule("ch-guardia-modo");
      }
    });
  });
  el.querySelector("#guardia-v7-upgrade-later")?.addEventListener("click", () => {
    dismissGuardiaV7UpgradeCard();
  });
}
function dismissGuardiaV7UpgradeCard() {
  saveGuardiaV7Progress({ dismissedCard: true });
  document.getElementById("guardia-v7-upgrade-card")?.remove();
}
function maybeShowGuardiaV7UpgradeCard({ delayMs = 0 } = {}) {
  if (needsClinicalOnboarding()) return;
  const { dismissedCard } = loadGuardiaV7Progress();
  if (dismissedCard || isGuardiaV7TrackComplete()) return;
  const run = () => {
    if (needsClinicalOnboarding()) return;
    if (document.getElementById("guardia-v7-upgrade-card")) return;
    const main = document.getElementById("main-area");
    if (!main) return;
    const progress = guardiaV7ProgressSummary();
    const startLabel = progress.completed > 0 && progress.completed < progress.total ? "Continuar gu\xEDa de guardia" : "Empezar gu\xEDa de guardia";
    const el = document.createElement("div");
    el.id = "guardia-v7-upgrade-card";
    el.className = "clinical-onboarding-card guardia-v7-upgrade-card";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Novedades de guardia en R+");
    el.innerHTML = '<h3 class="clinical-onboarding-title">Novedades de guardia</h3><p class="guardia-v7-upgrade-progress" aria-live="polite">Progreso: <strong>' + progress.completed + "/" + progress.total + "</strong> cap\xEDtulos (" + progress.percent + '%)</p><div class="guardia-v7-upgrade-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progress.percent + '"><span class="guardia-v7-upgrade-meter-fill" style="width:' + progress.percent + '%"></span></div><ul class="guardia-v7-upgrade-bullets"><li><strong>Modo Guardia</strong> \u2014 tablero de turno, franja Nube/sala/equipo y alcance por rango.</li><li><strong>Modo Entrega</strong> \u2014 handoff, roster, pendientes y cierre de turno.</li><li><strong>R+ Cloud y rotaci\xF3n</strong> \u2014 sala Nube, Mi rotaci\xF3n, herencia de pacientes y enlace m\xF3vil.</li></ul><div class="modal-actions guardia-v7-upgrade-actions"><button type="button" class="btn-save" id="guardia-v7-upgrade-start">' + startLabel + '</button><button type="button" class="btn-med-secondary" id="guardia-v7-upgrade-later">Ver despu\xE9s</button></div>';
    main.prepend(el);
    wireGuardiaV7UpgradeCardOnce(el);
  };
  if (delayMs > 0) setTimeout(run, delayMs);
  else run();
}

export {
  dismissGuardiaV7UpgradeCard,
  maybeShowGuardiaV7UpgradeCard
};
//# sourceMappingURL=/js/chunks/chunk-TWAIII5B.js.map
