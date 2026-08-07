import {
  buildOnboardingStageHtml
} from "/mobile/js/chunks/chunk-FGKC3QPA.js";
import "/mobile/js/chunks/chunk-FHDPZLZP.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-T5EKEMCK.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-M75YYGQZ.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-56R66ES7.js";
import "/mobile/js/chunks/chunk-3NNHG3MC.js";
import "/mobile/js/chunks/chunk-PD77VH7Y.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-TWV6UAYK.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-WXZVVY5M.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-J76D6PFX.js";
import "/mobile/js/chunks/chunk-WUQ6BLHZ.js";
import {
  isCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncToken
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-ARAHUBAM.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-NMJNQQZG.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";

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
    const { refreshClinicalOpsDirectory } = await import("/mobile/js/chunks/teams-guardia-bridge-FK2GGSR4.js");
    await refreshClinicalOpsDirectory({ force: true });
    const { needsTeamOnboardingStep } = await import("/mobile/js/chunks/clinical-onboarding-gates-JVZVG3YE.js");
    if (!needsTeamOnboardingStep()) {
      const { hideMainClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-main-ZM6SYRA6.js");
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
  const { openClinicalTeamsPanel } = await import("/mobile/js/chunks/teams-roster-YA5DDHZ5.js");
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
//# sourceMappingURL=/js/chunks/clinical-onboarding-team-3CFZFWQC.js.map
