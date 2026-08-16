import {
  filterPatientEntriesForLanTeamScope
} from "/mobile/js/chunks/chunk-U3XNJFTE.js";
import {
  buildPatientEntry
} from "/mobile/js/chunks/chunk-M6MLPK4W.js";
import "/mobile/js/chunks/chunk-4QI24DFU.js";
import "/mobile/js/chunks/chunk-ZVJAFSHG.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import "/mobile/js/chunks/chunk-NPWWQWKW.js";
import "/mobile/js/chunks/chunk-KESF4FLC.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-3PL7T3ZN.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-7FIP2ETS.js";
import "/mobile/js/chunks/chunk-CZ2M277B.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-BUGU4R5K.js";
import "/mobile/js/chunks/chunk-4SMSHN53.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-P7EHNYUF.js";
import "/mobile/js/chunks/chunk-S2E4QGRL.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";
import "/mobile/js/chunks/chunk-C4OBKXWW.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-VVADIT4K.js";
import "/mobile/js/chunks/chunk-HDD2EUC6.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-VRNWC4P2.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-KZT7D6I2.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-EE5CSOUC.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-75QM3TGW.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/features/cloud-sync/cloud-census-collect.mjs
function isLanPatientEntryCollectorReady() {
  if (!getPatients().length) return true;
  const first = getPatients().find(function(p) {
    return p && p.id && String(p.id).indexOf("demo-") !== 0;
  });
  if (!first?.id) return true;
  return !!buildPatientEntry(first.id);
}
async function buildAllLocalPatientEntries() {
  const { buildPatientEntry: buildPatientEntry2 } = await import("/mobile/js/chunks/patients-modal-commit-Q7UQEZFQ.js");
  const out = [];
  for (let i = 0; i < getPatients().length; i += 1) {
    const p = getPatients()[i];
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
  if (!isClinicalScopeReadyForPatientApply()) return entries;
  return filterPatientEntriesForLanTeamScope(
    entries,
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
}
async function collectPatientEntriesForCloudPush() {
  if (!getPatients().length) return [];
  const entries = await buildAllLocalPatientEntries();
  return scopeEntriesForCloudPush(entries);
}
function collectTodosMapForCloudPush() {
  const out = {};
  for (let i = 0; i < getPatients().length; i += 1) {
    const p = getPatients()[i];
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
//# sourceMappingURL=/js/chunks/cloud-census-collect-AUYVLCQX.js.map
