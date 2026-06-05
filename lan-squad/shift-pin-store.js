'use strict';

const crypto = require('node:crypto');

const PIN_MIN = 100000;
const PIN_MAX = 999999;
const MAX_PIN_COLLISION_ATTEMPTS = 10;

/** Midnight local time on the 1st of the next calendar month (PIN valid through last day of month). */
function endOfCalendarMonthMs(now = Date.now()) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
}

function createShiftPinStore({ getHostToken }) {
  if (typeof getHostToken !== 'function') {
    throw new Error('createShiftPinStore requires getHostToken');
  }

  /** @type {{ pin: string, expiresAt: number } | null} */
  let active = null;

  function mintUniquePin() {
    for (let i = 0; i < MAX_PIN_COLLISION_ATTEMPTS; i++) {
      const pin = String(crypto.randomInt(PIN_MIN, PIN_MAX + 1));
      if (!active || active.pin !== pin) return pin;
    }
    throw new Error('Could not mint unique shift PIN');
  }

  function isActive(now = Date.now()) {
    return !!(active && active.expiresAt > now);
  }

  function ensure(nowMs = Date.now()) {
    const now = nowMs;
    if (isActive(now)) {
      return {
        pin: active.pin,
        expiresAt: new Date(active.expiresAt).toISOString(),
      };
    }
    const pin = mintUniquePin();
    const expiresAt = endOfCalendarMonthMs(now);
    active = { pin, expiresAt };
    return {
      pin,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  function getStatus() {
    if (!isActive()) return null;
    return {
      pin: active.pin,
      expiresAt: new Date(active.expiresAt).toISOString(),
    };
  }

  function regenerate() {
    active = null;
    return ensure();
  }

  /** Reusable exchange — does not burn the PIN. */
  function exchange(pin) {
    const code = String(pin || '').trim();
    if (!/^\d{6}$/.test(code)) return null;
    if (!isActive()) return null;
    if (active.pin !== code) return null;
    return { token: getHostToken() };
  }

  return { ensure, getStatus, regenerate, exchange, endOfCalendarMonthMs };
}

module.exports = { createShiftPinStore, endOfCalendarMonthMs };
