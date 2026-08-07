import {
  filterPatientEntriesForLanTeamScope,
  getClinicalScopeContextForEvaluate,
  getLanRuntime,
  isClinicalScopeReadyForLanPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-4RWHEAJO.js";
import "/mobile/js/chunks/chunk-T5MFACW3.js";
import "/mobile/js/chunks/chunk-L6DKKZAW.js";
import "/mobile/js/chunks/chunk-UYGGXIVE.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-3WHKYJ7V.js";
import "/mobile/js/chunks/chunk-4ZYP54QF.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-5OEZNMAY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-WVWWVYPL.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import {
  patients
} from "/mobile/js/chunks/chunk-2VPNV3XW.js";
import "/mobile/js/chunks/chunk-MWUHDPML.js";
import "/mobile/js/chunks/chunk-S2OQTBTO.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-IFN2KBEN.js";
import "/mobile/js/chunks/chunk-K4LYOQAP.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-FXT4EGAN.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-VFWQPPKQ.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-J2US57NE.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TRTQ4CW2.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-SUI526FO.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-CCQC427D.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import "/mobile/js/chunks/chunk-AETSFPDT.js";
import "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-2VO3CNBC.js";
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
  const { buildPatientEntry } = await import("/mobile/js/chunks/patients-modal-commit-U5BY5JI3.js");
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
//# sourceMappingURL=/js/chunks/cloud-census-collect-HSR7FYCS.js.map
