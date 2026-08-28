import {
  buildOnboardingStageHtml
} from "/mobile/js/chunks/chunk-JAVEC37I.js";
import "/mobile/js/chunks/chunk-SEHESZ4A.js";
import "/mobile/js/chunks/chunk-G2QTTDSA.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-77VTEV4X.js";
import "/mobile/js/chunks/chunk-RBUONLJQ.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-G75IBCW4.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-XS2CWLHC.js";
import "/mobile/js/chunks/chunk-WF6PJVIL.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-4V75H66Y.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-VH7DMNPL.js";
import "/mobile/js/chunks/chunk-LF5B36KU.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-FBUYMHQK.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-YUYECAQZ.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-4ALI7FVW.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-QFKCJNWT.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-7CF6AX3C.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  isCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncToken
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/clinical-onboarding-team.mjs
function buildTeamOnboardLeadHtml() {
  const rank = String(clinicalSessionContext.user?.rank || "R1").trim();
  const sala = String(clinicalSessionContext.user?.sala || "").trim();
  const handle = normalizeUsername(clinicalSessionContext.user?.username || "");
  const who = [handle ? "@" + handle : "", rank, sala].filter(Boolean).join(" \xB7 ");
  const intro = who ? `<p>Tu perfil y Nube est\xE1n listos (<strong>${escapeHtml(who)}</strong>). Elige tu equipo de guardia.</p>` : "<p>Tu perfil y Nube est\xE1n listos. Elige tu equipo de guardia.</p>";
  const nubeLine = isCloudSala(sala) ? "<li>En <strong>Mi rotaci\xF3n \u2192 Explorar</strong> ver\xE1s equipos de tu sala sincronizados por Nube; pulsa <strong>Unirme</strong>.</li><li>Si no hay ninguno, <strong>Crear nuevo equipo</strong> (queda publicado a la sala).</li><li>O pega el <strong>c\xF3digo de invitaci\xF3n</strong> de tu R2.</li>" : "<li>En <strong>Mi rotaci\xF3n</strong> explora equipos de tu sala o pide c\xF3digo a tu R2.</li>";
  return intro + '<ul class="clinical-onboard-team-hints">' + nubeLine + "</ul>";
}
async function syncTeamsBeforeTeamStep() {
  if (!getCloudSyncToken() || !isCloudSala(clinicalSessionContext.user?.sala)) return;
  try {
    const { refreshClinicalOpsDirectory } = await import("/mobile/js/chunks/teams-guardia-bridge-HNU52HJ5.js");
    await refreshClinicalOpsDirectory({ force: true });
    const { needsTeamOnboardingStep } = await import("/mobile/js/chunks/clinical-onboarding-gates-KMJGY55O.js");
    if (!needsTeamOnboardingStep()) {
      const { hideMainClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-main-TRAQBRY5.js");
      hideMainClinicalOnboarding();
      return;
    }
    const status = document.getElementById("clinical-onboard-team-status");
    if (status) status.textContent = "Listo \u2014 abre Mi rotaci\xF3n para unirte o crear equipo.";
  } catch {
    const status = document.getElementById("clinical-onboard-team-status");
    if (status) status.textContent = "Listo \u2014 abre Mi rotaci\xF3n para unirte o crear equipo.";
  }
}
function renderTeamOnboardingInto(host, opts = {}) {
  host.innerHTML = buildOnboardingStageHtml({
    title: "\xDAnete a un equipo",
    leadHtml: buildTeamOnboardLeadHtml(),
    stepperIndex: 3,
    bodyHtml: '<p class="clinical-onboarding-status" id="clinical-onboard-team-status">' + (opts.skipCloudSync ? "Listo \u2014 abre Mi rotaci\xF3n para unirte o crear equipo." : "Buscando equipos en tu sala\u2026") + '</p><div class="clinical-onboard-team-actions"><button type="button" class="btn-save" data-team-onboard-open>Abrir Mi rotaci\xF3n</button></div>'
  });
  if (opts.skipCloudSync || host._rpcTeamOnboardSyncDone) return;
  host._rpcTeamOnboardSyncDone = true;
  void syncTeamsBeforeTeamStep();
}
async function openMiRotacionFromTeamOnboard() {
  const { openClinicalTeamsPanel } = await import("/mobile/js/chunks/teams-roster-KIZ2Z54J.js");
  await openClinicalTeamsPanel();
}
function wireTeamOnboardingInteractions(host) {
  if (!host || host._rpcTeamOnboardWired) return;
  host._rpcTeamOnboardWired = true;
  host.addEventListener("click", (ev) => {
    const openBtn = ev.target instanceof Element ? ev.target.closest("[data-team-onboard-open]") : null;
    if (openBtn) void openMiRotacionFromTeamOnboard();
  });
}
export {
  renderTeamOnboardingInto,
  wireTeamOnboardingInteractions
};
//# sourceMappingURL=/js/chunks/clinical-onboarding-team-3OBHCP5S.js.map
