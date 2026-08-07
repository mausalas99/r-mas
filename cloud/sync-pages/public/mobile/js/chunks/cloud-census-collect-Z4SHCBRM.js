import {
  buildPatientEntry
} from "/mobile/js/chunks/chunk-H7HPBMWH.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import {
  filterPatientEntriesForLanTeamScope
} from "/mobile/js/chunks/chunk-MRCCGBKF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForLanPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-FHDPZLZP.js";
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
import {
  patients
} from "/mobile/js/chunks/chunk-TWV6UAYK.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import {
  storage
} from "/mobile/js/chunks/chunk-WXZVVY5M.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-J76D6PFX.js";
import "/mobile/js/chunks/chunk-WUQ6BLHZ.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-ARAHUBAM.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-NMJNQQZG.js";
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
  const { buildPatientEntry: buildPatientEntry2 } = await import("/mobile/js/chunks/patients-modal-commit-TOOMG462.js");
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
//# sourceMappingURL=/js/chunks/cloud-census-collect-Z4SHCBRM.js.map
