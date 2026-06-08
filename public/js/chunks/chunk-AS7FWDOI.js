import {
  isGuardiaV7TrackComplete,
  loadGuardiaV7Progress,
  saveGuardiaV7Progress
} from "/js/chunks/chunk-TVNIPUSB.js";
import {
  needsClinicalOnboarding
} from "/js/chunks/chunk-PWJP6NI4.js";

// public/js/features/settings-help/guardia-v7-upgrade-card.mjs
function wireGuardiaV7UpgradeCardOnce(el) {
  if (!el || el._rpcGuardiaV7CardWired) return;
  el._rpcGuardiaV7CardWired = true;
  el.querySelector("#guardia-v7-upgrade-start")?.addEventListener("click", () => {
    document.getElementById("guardia-v7-upgrade-card")?.remove();
    void import("/js/chunks/tour-runtime-BWC2LM2B.js").then((mod) => {
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
    const el = document.createElement("div");
    el.id = "guardia-v7-upgrade-card";
    el.className = "clinical-onboarding-card guardia-v7-upgrade-card";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Novedades de guardia en R+ 7");
    el.innerHTML = '<h3 class="clinical-onboarding-title">Novedades de guardia en R+ 7</h3><ul class="guardia-v7-upgrade-bullets"><li><strong>Modo Guardia</strong> \u2014 tablero de turno, censo y alcance por rango.</li><li><strong>Modo Entrega</strong> \u2014 handoff por paciente, roster y pendientes v2.</li><li><strong>LAN 7.x</strong> \u2014 PIN del turno, directorio y enlace m\xF3vil permanente.</li></ul><div class="modal-actions guardia-v7-upgrade-actions"><button type="button" class="btn-save" id="guardia-v7-upgrade-start">Empezar gu\xEDa de guardia</button><button type="button" class="btn-med-secondary" id="guardia-v7-upgrade-later">Ver despu\xE9s</button></div>';
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
//# sourceMappingURL=/js/chunks/chunk-AS7FWDOI.js.map
