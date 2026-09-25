import { isPatientBulkSelectMode } from './patients-bulk-select.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { setPatientSearchFilter } from './patients-scope.mjs';
import { rt } from './patients-runtime-state.mjs';
import { nextCensusPatientId } from './patients-census-walk.mjs';

var _lastRondaNavIds = [];

export function setLastRondaNavIds(ids) {
  _lastRondaNavIds = ids;
}

export function getLastRondaNavIds() {
  return _lastRondaNavIds;
}

export function onPatientSearchInput(val) {
  setPatientSearchFilter(val);
  patientsBridge.renderPatientList();
}

/** ↑/↓ — walk the rendered census in any work mode. */
export function advanceRondaPatient(delta) {
  if (isPatientBulkSelectMode()) return;
  var next = nextCensusPatientId(_lastRondaNavIds, rt.getActiveId(), delta);
  if (next == null) return;
  patientsBridge.selectPatient(next);
}

export function scrollActiveRondaCardIntoView() {
  if (!rt.getActiveId()) return;
  var list = document.getElementById('patient-list');
  if (!list) return;
  var cards = list.querySelectorAll('.patient-card[data-patient-id]');
  var want = String(rt.getActiveId());
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute('data-patient-id') === want) {
      try {
        cards[i].scrollIntoView({
          block: 'nearest',
          behavior: rt.rpcPrefersReducedMotion() ? 'auto' : 'smooth',
        });
      } catch {
        cards[i].scrollIntoView(true);
      }
      break;
    }
  }
}
