import {
  buildOnboardingStageHtml
} from "/mobile/js/chunks/chunk-BCJKJMLF.js";
import "/mobile/js/chunks/chunk-JB63TG4Y.js";
import "/mobile/js/chunks/chunk-BZPGDWNR.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-HKGXY6ZZ.js";
import "/mobile/js/chunks/chunk-FVMS5JSH.js";
import "/mobile/js/chunks/chunk-CYT2QRK7.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-F5H6MC3T.js";
import "/mobile/js/chunks/chunk-FHX6BQST.js";
import "/mobile/js/chunks/chunk-HHFYYXCN.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-C345P2AA.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-XJ7JWVS5.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
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
import "/mobile/js/chunks/chunk-6CH64UGD.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-PJKQGVLW.js";
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
    const { refreshClinicalOpsDirectory } = await import("/mobile/js/chunks/teams-guardia-bridge-ENA3P4UD.js");
    await refreshClinicalOpsDirectory({ force: true });
    const { needsTeamOnboardingStep } = await import("/mobile/js/chunks/clinical-onboarding-gates-3QWD4DMJ.js");
    if (!needsTeamOnboardingStep()) {
      const { hideMainClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-main-RY7HE6NV.js");
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
  const { openClinicalTeamsPanel } = await import("/mobile/js/chunks/teams-roster-M5ZVOJB2.js");
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
//# sourceMappingURL=/js/chunks/clinical-onboarding-team-URUN4C5N.js.map
