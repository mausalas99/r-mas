import {
  filterPatientEntriesForLanTeamScope
} from "/mobile/js/chunks/chunk-TBKNEONY.js";
import {
  buildPatientEntry
} from "/mobile/js/chunks/chunk-BP4QC5UJ.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForLanPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-QQOJTZU6.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-LTZPVWLE.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-PEG2E4FB.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-IVOJHSUB.js";
import "/mobile/js/chunks/chunk-GTJXSHII.js";
import "/mobile/js/chunks/chunk-KPMBH6IG.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  patients
} from "/mobile/js/chunks/chunk-LUBBZBEB.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import {
  storage
} from "/mobile/js/chunks/chunk-RU5G223P.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-B4Q7USSM.js";
import "/mobile/js/chunks/chunk-T2MO3KS5.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-MGEK6PHD.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-GRJDNRYE.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";

// public/js/features/cloud-sync/cloud-census-collect.mjs
function isLanPatientEntryCollectorReady() {
  if (!patients.length) return true;
  const first = patients.find(function(p) {
    return p && p.id && String(p.id).indexOf("demo-") !== 0;
  });
  if (!first?.id) return true;
  return !!buildPatientEntry(first.id);
}
async function buildAllLocalPatientEntries() {
  const { buildPatientEntry: buildPatientEntry2 } = await import("/mobile/js/chunks/patients-modal-commit-MRZS5KJI.js");
  const out = [];
  for (let i = 0; i < patients.length; i += 1) {
    const p = patients[i];
    if (!p?.id || String(p.id).indexOf("demo-") === 0) continue;
    const entry = buildPatientEntry2(p.id);
    if (entry) out.push(entry);
  }
  return out;
}
function scopeEntriesForCloudPush(entries) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return entries;
  if (shouldUseElevatedPatientCensus(user)) return entries;
  if (!isClinicalScopeReadyForLanPatientApply()) return entries;
  return filterPatientEntriesForLanTeamScope(
    entries,
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
}
async function collectPatientEntriesForCloudPush() {
  if (!patients.length) return [];
  const entries = await buildAllLocalPatientEntries();
  return scopeEntriesForCloudPush(entries);
}
function collectTodosMapForCloudPush() {
  const out = {};
  for (let i = 0; i < patients.length; i += 1) {
    const p = patients[i];
    if (!p?.id || String(p.id).indexOf("demo-") === 0) continue;
    const list = storage.getTodos(p.id);
    if (list.length) out[p.id] = list;
  }
  return out;
}
function collectAgendaForCloudPush() {
  return storage.getScheduledProcedures().filter(function(ev) {
    return ev && String(ev.patientId || "").indexOf("demo-") !== 0;
  });
}
export {
  collectAgendaForCloudPush,
  collectPatientEntriesForCloudPush,
  collectTodosMapForCloudPush,
  isLanPatientEntryCollectorReady
};
//# sourceMappingURL=/js/chunks/cloud-census-collect-FU4JXMZQ.js.map
