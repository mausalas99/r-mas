import {
  buildPatientEntry,
  filterPatientEntriesForLanTeamScope,
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForLanPatientApply,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-SUHVKV2B.js";
import "/mobile/js/chunks/chunk-FQAQAHCP.js";
import "/mobile/js/chunks/chunk-DXT4XQM7.js";
import "/mobile/js/chunks/chunk-AGTBFRLI.js";
import "/mobile/js/chunks/chunk-R6FEF2OL.js";
import "/mobile/js/chunks/chunk-KWIGON6B.js";
import "/mobile/js/chunks/chunk-SERPYDDG.js";
import "/mobile/js/chunks/chunk-SPXDZARY.js";
import "/mobile/js/chunks/chunk-QGQYHCCP.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-OPWB7OTD.js";
import "/mobile/js/chunks/chunk-FGXLPOV7.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-FRFJRB37.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-WF64SOAI.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-3I74GVWN.js";
import "/mobile/js/chunks/chunk-VL2HB7CD.js";
import "/mobile/js/chunks/chunk-OGX35Y32.js";
import "/mobile/js/chunks/chunk-3O4YWJHW.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-EHHIMUZG.js";
import {
  patients
} from "/mobile/js/chunks/chunk-H66E52WF.js";
import "/mobile/js/chunks/chunk-IWCUDCPM.js";
import {
  storage
} from "/mobile/js/chunks/chunk-HNK3CY62.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-D3ZABJHJ.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-F52EEXUB.js";
import "/mobile/js/chunks/chunk-GJK2JHBF.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-YSMCQRZC.js";
import "/mobile/js/chunks/chunk-AWQNHSEL.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-BBXERARG.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-3VLOKES3.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TGGEFYRH.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
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
  const { buildPatientEntry: buildPatientEntry2 } = await import("/mobile/js/chunks/patients-modal-commit-WAPJK6DM.js");
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
//# sourceMappingURL=/js/chunks/cloud-census-collect-HBSILKCD.js.map
