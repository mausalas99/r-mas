import {
  filterPatientEntriesForLanTeamScope,
  getClinicalScopeContextForEvaluate,
  getLanRuntime,
  isClinicalScopeReadyForLanPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-V7RKRU36.js";
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
import {
  patients
} from "/mobile/js/chunks/chunk-NFDNC4E2.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
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
import {
  storage
} from "/mobile/js/chunks/chunk-MWVG4DXC.js";
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
import "/mobile/js/chunks/chunk-AETSFPDT.js";
import "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-GZVXFENQ.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/features/cloud-sync/cloud-census-collect.mjs
function isLanPatientEntryCollectorReady() {
  if (!patients.length) return true;
  const first = patients.find(function(p) {
    return p && p.id && String(p.id).indexOf("demo-") !== 0;
  });
  if (!first?.id) return true;
  return !!getLanRuntime().buildPatientEntry(first.id);
}
async function buildAllLocalPatientEntries() {
  const { buildPatientEntry } = await import("/mobile/js/chunks/patients-modal-commit-BZYZVIFH.js");
  const out = [];
  for (let i = 0; i < patients.length; i += 1) {
    const p = patients[i];
    if (!p?.id || String(p.id).indexOf("demo-") === 0) continue;
    const entry = buildPatientEntry(p.id);
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
//# sourceMappingURL=/js/chunks/cloud-census-collect-7NDQ7CXH.js.map
