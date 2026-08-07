import {
  buildOnboardingStageHtml
} from "/mobile/js/chunks/chunk-RL7MVLBF.js";
import "/mobile/js/chunks/chunk-V7RKRU36.js";
import "/mobile/js/chunks/chunk-I7TKUVLA.js";
import "/mobile/js/chunks/chunk-OZWIHN57.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-RI6AP5AE.js";
import "/mobile/js/chunks/chunk-WWZFTPFJ.js";
import "/mobile/js/chunks/chunk-L2AHBXEQ.js";
import "/mobile/js/chunks/chunk-YAV7LD7W.js";
import "/mobile/js/chunks/chunk-FQRMD6ZB.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-MI3IWYVD.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-DVAK5LQO.js";
import "/mobile/js/chunks/chunk-NFDNC4E2.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-DYX4ICUP.js";
import "/mobile/js/chunks/chunk-IVC2VWFL.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-7V3KAWVG.js";
import "/mobile/js/chunks/chunk-VQEQYC4S.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-5X65DZ36.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-SI7XDBY4.js";
import "/mobile/js/chunks/chunk-MWVG4DXC.js";
import "/mobile/js/chunks/chunk-I4NFL7CB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-CR432C3M.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-JSBTNZIE.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-IIOGZLID.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-R6TRWWWV.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-73TLMPZ4.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-6WZSBH4P.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import {
  isCloudSala
} from "/mobile/js/chunks/chunk-AETSFPDT.js";
import {
  getCloudSyncToken
} from "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-GZVXFENQ.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";

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
    const { refreshClinicalOpsDirectory } = await import("/mobile/js/chunks/teams-guardia-bridge-PW5WEV4I.js");
    await refreshClinicalOpsDirectory({ force: true });
    const { needsTeamOnboardingStep } = await import("/mobile/js/chunks/clinical-onboarding-gates-7K3GGYYS.js");
    if (!needsTeamOnboardingStep()) {
      const { hideMainClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-main-5D4T7BZW.js");
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
  const { openClinicalTeamsPanel } = await import("/mobile/js/chunks/teams-roster-R2LJUWPQ.js");
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
//# sourceMappingURL=/js/chunks/clinical-onboarding-team-ETVXG7YG.js.map
