/**
 * LAN invite join flow — paste parsing, PIN connect, ticket exchange.
 */
import { storage } from '../../storage.js';
import { parseLanInviteInput, parseLanJoinQuery } from '../../lan-join-link.mjs';
import { normalizeLanHostBase } from '../../lan-host-subnet-discovery.mjs';
import {
  configureLanFromMobileJoin,
  exchangeLanJoinFromInvite,
} from './transport.mjs';
import { isLanSkipShiftPin } from '../../lan-shift-pin-bypass.mjs';
import { bundledWardInviteUrl } from '../../clinical-settings.mjs';

/** Read invite paste from the field the user actually used (avoids duplicate-id mismatch). */
export function readLanInviteInputValue(nearEl) {
  if (nearEl && nearEl.closest) {
    var card = nearEl.closest(
      '.lan-connect-card, .lan-connect-other-mac, .lan-hub-status-card, .lan-mobile-join-card'
    );
    if (card) {
      var local = card.querySelector('[data-lan-invite-input]');
      if (local) return String(local.value || '').trim();
    }
  }
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) {
    var legacy = document.getElementById('lan-input-invite-link');
    return String(legacy && legacy.value ? legacy.value : '').trim();
  }
  var inputs = root.querySelectorAll('[data-lan-invite-input]');
  for (var i = 0; i < inputs.length; i += 1) {
    var filled = String(inputs[i].value || '').trim();
    if (filled) return filled;
  }
  return inputs.length ? String(inputs[0].value || '').trim() : '';
}

export function runShiftPinConnectFromUi(deps, fromBtn, opts) {
  if (fromBtn instanceof HTMLButtonElement) {
    fromBtn.disabled = true;
    fromBtn.textContent = 'Conectando…';
  }
  void import('../../lan-shift-pin-connect.mjs')
    .then(function (m) {
      return m.tryEasyLanShiftPinConnect(
        Object.assign({ force: true }, opts || {})
      );
    })
    .then(function (result) {
      if (result && result.ok) {
        deps.renderLanPanel({ force: true });
        return;
      }
      var msg =
        result && result.reason === 'invalid_pin'
          ? 'PIN incorrecto para esa dirección. Pide el PIN actual al anfitrión.'
          : result && result.reason === 'host_unreachable'
            ? 'No hay R+ en esa dirección. Verifica la URL y que el anfitrión tenga R+ abierto.'
            : 'No encontramos el turno con ese PIN. Revisa el Wi‑Fi clínico o pide otro PIN.';
      deps.runtime().showToast(msg, 'error');
    })
    .finally(function () {
      if (fromBtn instanceof HTMLButtonElement) {
        fromBtn.disabled = false;
        fromBtn.textContent = 'Unirse con enlace';
      }
    });
}

export function joinFromBareHost(deps, fromBtn, parsed) {
  prefillLanShiftPinHostUrl(parsed.hostUrl);
  var wardPin =
    String(parsed.shiftPin || '').trim() ||
    (typeof storage.getLanShiftPin === 'function' ? storage.getLanShiftPin() : '');
  if (isLanSkipShiftPin()) {
    runShiftPinConnectFromUi(deps, fromBtn, {
      shiftPin: wardPin || undefined,
      hostUrl: parsed.hostUrl,
    });
    return true;
  }
  if (!/^\d{6}$/.test(wardPin)) {
    deps.runtime().showToast(
      'Dirección del anfitrión reconocida. Ingresa el PIN del turno (6 dígitos) y pulsa Conectar.',
      'info'
    );
    focusLanShiftPinInput();
    return true;
  }
  runShiftPinConnectFromUi(deps, fromBtn, { shiftPin: wardPin, hostUrl: parsed.hostUrl });
  return true;
}

export function joinFromMobileTeamCode(raw, parsed) {
  var mobileJoin = parseLanJoinQuery(raw.includes('?') ? raw.slice(raw.indexOf('?')) : '', parsed.hostUrl);
  configureLanFromMobileJoin(parsed.hostUrl, String(parsed.teamCode || '').trim(), mobileJoin.roomId || parsed.roomId);
  return true;
}

function resolveInviteHostUrl(parsed) {
  var hostUrl = String(parsed.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (hostUrl) return hostUrl;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  return String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
}

export function joinFromTicket(deps, fromBtn, parsed, raw) {
  var hostUrl = resolveInviteHostUrl(parsed);
  if (!hostUrl) {
    deps.runtime().showToast(
      'Pega el enlace completo (http://…/join/req_…) con la dirección del anfitrión.',
      'error'
    );
    return true;
  }
  if (fromBtn instanceof HTMLButtonElement) {
    fromBtn.disabled = true;
    fromBtn.textContent = 'Conectando…';
  }
  void exchangeLanJoinFromInvite(hostUrl, String(parsed.ticketId || '').trim(), parsed.roomId, raw).finally(
    function () {
      if (fromBtn instanceof HTMLButtonElement) {
        fromBtn.disabled = false;
        fromBtn.textContent = 'Unirse con enlace';
      }
    }
  );
  return true;
}

export function joinLanFromInviteUi(deps, fromBtn) {
  var raw = readLanInviteInputValue(fromBtn);
  if (!raw) {
    deps.runtime().showToast('Pega el enlace de invitación que te envió el anfitrión.', 'error');
    return;
  }
  if (/^\d{6}$/.test(raw)) {
    runShiftPinConnectFromUi(deps, fromBtn, { shiftPin: raw });
    return;
  }
  var parsed = parseLanInviteInput(raw);
  if (parsed.bareHost && parsed.hostUrl && joinFromBareHost(deps, fromBtn, parsed)) return;
  if (parsed.legacyInvite) {
    deps.runtime().showToast(
      'Este enlace ya no es válido. Pide al anfitrión un nuevo enlace o PIN.',
      'error'
    );
    return;
  }
  if (parsed.teamCode && parsed.hostUrl && joinFromMobileTeamCode(raw, parsed)) return;
  if (parsed.ticketId && joinFromTicket(deps, fromBtn, parsed, raw)) return;
  deps.runtime().showToast(
    'No reconocimos un enlace válido. Pide al anfitrión un enlace /join/req_… o el PIN del turno.',
    'error'
  );
}

export function focusLanShiftPinInput() {
  function tryFocus(attempt) {
    var input = document.getElementById('lan-input-shift-pin');
    if (input) {
      input.focus();
      if (typeof input.select === 'function') input.select();
      return true;
    }
    if (attempt < 10) {
      window.setTimeout(function () {
        tryFocus(attempt + 1);
      }, 80);
    }
    return false;
  }
  return tryFocus(0);
}

export function prefillBundledWardInviteInput(input) {
  if (!input || String(input.value || '').trim()) return;
  var bundled = String(bundledWardInviteUrl() || '').trim();
  if (bundled) input.value = bundled;
}

export function prefillLanShiftPinHostUrl(hostUrl) {
  var url = normalizeLanHostBase(String(hostUrl || '').trim());
  if (!url) return false;
  var input = document.getElementById('lan-input-host-url-ward');
  if (input) {
    input.value = url;
    return true;
  }
  return false;
}
