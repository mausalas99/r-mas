import {
  filterPatientEntriesForLanTeamScope
} from "/mobile/js/chunks/chunk-ZB32STDD.js";
import {
  buildPatientEntry
} from "/mobile/js/chunks/chunk-KCX5U3HW.js";
import "/mobile/js/chunks/chunk-GXFOOQYK.js";
import "/mobile/js/chunks/chunk-2MXQFCGD.js";
import "/mobile/js/chunks/chunk-SOQEY2U2.js";
import "/mobile/js/chunks/chunk-IUWKNPSX.js";
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
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
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  getSyncablePatients
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import {
  storage
} from "/mobile/js/chunks/chunk-YUYECAQZ.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-4ALI7FVW.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-HDEGXLWA.js";
import "/mobile/js/chunks/chunk-QFKCJNWT.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-7CF6AX3C.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/cloud-sync/cloud-census-collect.mjs
function isLanPatientEntryCollectorReady() {
  if (!getSyncablePatients().length) return true;
  const first = getSyncablePatients().find(function(p) {
    return p && p.id && String(p.id).indexOf("demo-") !== 0;
  });
  if (!first?.id) return true;
  return !!buildPatientEntry(first.id);
}
async function buildAllLocalPatientEntries() {
  const { buildPatientEntry: buildPatientEntry2 } = await import("/mobile/js/chunks/patients-modal-commit-KAWQP33K.js");
  const out = [];
  for (let i = 0; i < getSyncablePatients().length; i += 1) {
    const p = getSyncablePatients()[i];
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
  if (!getSyncablePatients().length) return [];
  const entries = await buildAllLocalPatientEntries();
  return scopeEntriesForCloudPush(entries);
}
function collectTodosMapForCloudPush() {
  const out = {};
  for (let i = 0; i < getSyncablePatients().length; i += 1) {
    const p = getSyncablePatients()[i];
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
//# sourceMappingURL=/js/chunks/cloud-census-collect-WJXTLGOM.js.map
