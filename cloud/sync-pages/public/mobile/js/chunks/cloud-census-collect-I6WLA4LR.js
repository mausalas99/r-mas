import {
  buildPatientEntry
} from "/mobile/js/chunks/chunk-L3ORSVMJ.js";
import "/mobile/js/chunks/chunk-PMGUO7FX.js";
import {
  filterPatientEntriesForLanTeamScope
} from "/mobile/js/chunks/chunk-GHYXKSAH.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForLanPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-JB63TG4Y.js";
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
import {
  patients
} from "/mobile/js/chunks/chunk-C345P2AA.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import {
  storage
} from "/mobile/js/chunks/chunk-XJ7JWVS5.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-6CH64UGD.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-PJKQGVLW.js";
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
  const { buildPatientEntry: buildPatientEntry2 } = await import("/mobile/js/chunks/patients-modal-commit-K2TQM72O.js");
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
//# sourceMappingURL=/js/chunks/cloud-census-collect-I6WLA4LR.js.map
