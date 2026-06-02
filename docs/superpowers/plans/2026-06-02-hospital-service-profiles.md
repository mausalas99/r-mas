# Perfiles de servicio hospitalario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir perfiles de servicio hospitalario (MI, UTI, Infecto, Cirugía) con manifiesto modular, selector antes de Mi rotación, LAN lógica separada por sufijo derivado del token base, y pestaña sandbox para iterar configuración.

**Architecture:** Capa `serviceProfileId` persistida en `rpc-settings` y espejada en `userData/service-profile.json` para el proceso host. Token LAN efectivo = `deriveEffectiveTeamPlain(baseToken, profileId)` compartido entre `lan-squad/` (Node) y `public/js/` (renderer). Fases 1–4 del spec; prioridad Fase 1 (LAN + selector).

**Tech Stack:** Electron 41, Express 5, vanilla JS ESM en renderer, CommonJS en `lan-squad/`, `node --test`, `npm run build:ui` + `node scripts/bundle-renderer.mjs`.

**Spec reference:** [`docs/superpowers/specs/2026-06-02-hospital-service-profiles-design.md`](../specs/2026-06-02-hospital-service-profiles-design.md)

---

## File map (nuevo / modificado)

| File | Responsibility |
|------|----------------|
| `lan-squad/service-profile-token.js` | `deriveEffectiveTeamPlain`, `normalizeServiceProfileId`, `LEGACY_PROFILE_ID` |
| `lan-squad/service-profile-token.test.js` | Tests derivación token |
| `lan-squad/effective-team-code.js` | Exponer `readLanEffectiveTeamCode({ userDataPath })` |
| `lan-squad/host-router.js` | `GET /api/lan/v1/host-rank` con `{ rank, serviceProfileId }` |
| `server.js` | Host store usa token efectivo al boot |
| `main.js` | IPC `service-profile:sync`, actualizar `lan-get-effective-team-code` |
| `preload.js` | `syncServiceProfile`, `getServiceProfile` |
| `public/js/service-profile-token.mjs` | Espejo ESM (mantener en sync con lan-squad) |
| `public/js/service-profile.mjs` | `getActiveServiceProfileId`, `resolveServiceManifest`, persistencia |
| `public/js/service-profiles/presets.mjs` | Cuatro presets + `legacy` |
| `public/js/service-modules.mjs` | `resolveServiceModules(settings)` |
| `public/js/service-modules.test.mjs` | Tests módulos + agenda on |
| `public/js/features/service-profile-onboarding.mjs` | Paso “Elige tu servicio” |
| `public/js/features/service-profile-settings.mjs` | UI Perfil + sandbox |
| `public/js/features/clinical-onboarding.mjs` | Gate: servicio antes de username |
| `public/js/features/lan-sync.mjs` | Bearer efectivo, filtro peers, etiqueta hub |
| `public/js/features/profile.mjs` | Bloque Servicio hospitalario en Mi Perfil |
| `public/partials/layout/app-body.html` | Markup Perfil + Ajustes sandbox |
| `public/styles/settings.css` | Estilos sandbox / selector servicio |

---

## Phase 1 — LAN + perfil (prioridad)

### Task 1: Derivación de token efectivo (Node)

**Files:**
- Create: `lan-squad/service-profile-token.js`
- Create: `lan-squad/service-profile-token.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
'use strict';
const assert = require('node:assert');
const { test } = require('node:test');
const { hashTeamCode } = require('./team-code.js');
const {
  deriveEffectiveTeamPlain,
  normalizeServiceProfileId,
  LEGACY_PROFILE_ID,
} = require('./service-profile-token.js');

test('legacy profile uses base token unchanged', () => {
  assert.strictEqual(normalizeServiceProfileId(''), LEGACY_PROFILE_ID);
  assert.strictEqual(normalizeServiceProfileId(undefined), LEGACY_PROFILE_ID);
  assert.strictEqual(deriveEffectiveTeamPlain('base64chars', LEGACY_PROFILE_ID), 'base64chars');
});

test('service profile suffix changes effective plain and hash', () => {
  const base = 'a'.repeat(64);
  const mi = deriveEffectiveTeamPlain(base, 'mi');
  const uti = deriveEffectiveTeamPlain(base, 'uti');
  assert.notStrictEqual(mi, uti);
  assert.notStrictEqual(hashTeamCode(mi), hashTeamCode(uti));
  assert.strictEqual(mi, base + ':mi');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lan-squad/service-profile-token.test.js`  
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement**

```javascript
'use strict';

const LEGACY_PROFILE_ID = '';

function normalizeServiceProfileId(id) {
  const s = String(id || '').trim().toLowerCase();
  if (!s || s === 'legacy') return LEGACY_PROFILE_ID;
  return s;
}

function deriveEffectiveTeamPlain(baseToken, serviceProfileId) {
  const base = String(baseToken || '').trim();
  const profile = normalizeServiceProfileId(serviceProfileId);
  if (!profile) return base;
  return base + ':' + profile;
}

module.exports = {
  LEGACY_PROFILE_ID,
  normalizeServiceProfileId,
  deriveEffectiveTeamPlain,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lan-squad/service-profile-token.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lan-squad/service-profile-token.js lan-squad/service-profile-token.test.js
git commit -m "feat(lan): derive effective team token per service profile"
```

---

### Task 2: Espejo ESM + lectura de perfil activo (renderer)

**Files:**
- Create: `public/js/service-profile-token.mjs`
- Create: `public/js/service-profile.mjs`
- Create: `public/js/service-profile.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveServiceProfileId,
  needsServiceProfileSelection,
} from './service-profile.mjs';

describe('service-profile', () => {
  it('needs selection when serviceProfileId missing and not legacy-claimed', () => {
    global.localStorage = {
      _d: {},
      getItem(k) { return this._d[k] ?? null; },
      setItem(k, v) { this._d[k] = v; },
    };
    localStorage.setItem('rpc-settings', JSON.stringify({}));
    assert.equal(needsServiceProfileSelection(), true);
    localStorage.setItem('rpc-settings', JSON.stringify({ serviceProfileId: 'mi' }));
    assert.equal(needsServiceProfileSelection(), false);
    localStorage.setItem('rpc-settings', JSON.stringify({ serviceProfileLegacy: true }));
    assert.equal(needsServiceProfileSelection(), false);
  });

  it('getActiveServiceProfileId returns legacy when flagged', () => {
    localStorage.setItem('rpc-settings', JSON.stringify({ serviceProfileLegacy: true }));
    assert.equal(getActiveServiceProfileId(), '');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/service-profile.test.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement `service-profile-token.mjs`** (copy logic from Task 1)

- [ ] **Step 4: Implement `service-profile.mjs`**

```javascript
import { readRpcSettings } from './clinical-settings.mjs';
import {
  deriveEffectiveTeamPlain,
  LEGACY_PROFILE_ID,
  normalizeServiceProfileId,
} from './service-profile-token.mjs';

export function getActiveServiceProfileId(settings) {
  const st = settings || readRpcSettings();
  if (st.serviceProfileLegacy) return LEGACY_PROFILE_ID;
  return normalizeServiceProfileId(st.serviceProfileId);
}

export function needsServiceProfileSelection(settings) {
  const st = settings || readRpcSettings();
  if (st.serviceProfileLegacy) return false;
  if (st.serviceProfileId) return false;
  return true;
}

export function deriveEffectiveTeamCodeFromSettings(settings, baseToken) {
  return deriveEffectiveTeamPlain(baseToken, getActiveServiceProfileId(settings));
}

export function persistServiceProfileId(profileId, opts = {}) {
  const st = readRpcSettings();
  delete st.serviceProfileLegacy;
  st.serviceProfileId = normalizeServiceProfileId(profileId);
  if (opts.markLegacy) {
    delete st.serviceProfileId;
    st.serviceProfileLegacy = true;
  }
  localStorage.setItem('rpc-settings', JSON.stringify(st));
  return st;
}
```

- [ ] **Step 5: Run tests and commit**

Run: `node --test public/js/service-profile.test.mjs`  
Add test file to `package.json` `"test"` script.

```bash
git add public/js/service-profile-token.mjs public/js/service-profile.mjs public/js/service-profile.test.mjs package.json
git commit -m "feat: service profile settings helpers in renderer"
```

---

### Task 3: Sync perfil a userData + IPC token efectivo

**Files:**
- Modify: `main.js` (IPC handlers)
- Modify: `preload.js`
- Modify: `lan-squad/effective-team-code.js`
- Modify: `lan-squad/effective-team-code.test.js`

- [ ] **Step 1: Add `readServiceProfileIdFromDisk` in effective-team-code.js**

```javascript
function readServiceProfileIdFromDisk(userDataPath) {
  const filePath = path.join(String(userDataPath || ''), 'service-profile.json');
  try {
    if (!fs.existsSync(filePath)) return '';
    const j = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (j && j.serviceProfileLegacy) return '';
    return String(j.serviceProfileId || '').trim().toLowerCase();
  } catch (_e) {
    return '';
  }
}

function readLanEffectiveTeamCode({ userDataPath }) {
  const base = readLanTeamCodeFile({ userDataPath });
  if (!base.ok) return base;
  const { deriveEffectiveTeamPlain } = require('./service-profile-token.js');
  const profileId = readServiceProfileIdFromDisk(userDataPath);
  const code = deriveEffectiveTeamPlain(base.code, profileId);
  return { ok: true, code, baseSource: base.source, serviceProfileId: profileId };
}
```

Export `readLanEffectiveTeamCode`, `writeServiceProfileFile`.

- [ ] **Step 2: IPC in main.js**

```javascript
ipcMain.handle('service-profile:sync', (_e, payload) => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'service-profile.json');
  const body = {
    serviceProfileId: String(payload?.serviceProfileId || '').trim().toLowerCase(),
    serviceProfileLegacy: !!payload?.serviceProfileLegacy,
  };
  fs.writeFileSync(filePath, JSON.stringify(body) + '\n', 'utf8');
  // Rehash host if host state exists
  const { readLanTeamCodeFile, rehashLanHostState } = require('./lan-squad/effective-team-code.js');
  const { deriveEffectiveTeamPlain } = require('./lan-squad/service-profile-token.js');
  const base = readLanTeamCodeFile({ userDataPath });
  if (base.ok) {
    const profileId = body.serviceProfileLegacy ? '' : body.serviceProfileId;
    const effective = deriveEffectiveTeamPlain(base.code, profileId);
    rehashLanHostState(path.join(userDataPath, 'lan-squad-host-state.json'), effective);
  }
  return { ok: true };
});

ipcMain.handle('lan-get-effective-team-code', () => {
  const { readLanEffectiveTeamCode } = require('./lan-squad/effective-team-code.js');
  return readLanEffectiveTeamCode({ userDataPath: app.getPath('userData') });
});
```

- [ ] **Step 3: preload.js**

```javascript
syncServiceProfile: function(payload) {
  return ipcRenderer.invoke('service-profile:sync', payload);
},
```

- [ ] **Step 4: Test effective read**

Add test in `effective-team-code.test.js`: write base token + `service-profile.json` with `{ serviceProfileId: 'uti' }`, assert `readLanEffectiveTeamCode` returns `base:uti`.

Run: `node --test lan-squad/effective-team-code.test.js`

- [ ] **Step 5: Commit**

```bash
git add lan-squad/effective-team-code.js lan-squad/effective-team-code.test.js main.js preload.js
git commit -m "feat: sync service profile to disk and expose effective LAN token via IPC"
```

---

### Task 4: Host boot con token efectivo

**Files:**
- Modify: `server.js:114-137`

- [ ] **Step 1: After bootstrapLanTeamCode, derive effective token**

```javascript
const { deriveEffectiveTeamPlain } = require('./lan-squad/service-profile-token.js');
const { readServiceProfileIdFromDisk } = require('./lan-squad/effective-team-code.js');

const lanBoot = bootstrapLanTeamCode({ userDataPath: userData, hostStatePath: lanStatePath });
const profileId = readServiceProfileIdFromDisk(userData);
const LAN_TEAM_CODE = deriveEffectiveTeamPlain(lanBoot.token, profileId);
```

Use `LAN_TEAM_CODE` (effective) for `createHostStore`, `ticketStore`, `getHostToken`.

- [ ] **Step 2: Verify host-store tests still pass**

Run: `node --test lan-squad/host-store.test.js lan-squad/auth-router.test.js`

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: LAN host authenticates with service-scoped effective team code"
```

---

### Task 5: Cliente LAN — Bearer efectivo y reconexión

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (`resolveHostBearerToken`, `syncLanSavedTeamCodeWithEffectiveHostCode`, `getLanTeamCodeFromConfig`)

- [ ] **Step 1: Import helpers**

```javascript
import {
  deriveEffectiveTeamCodeFromSettings,
  getActiveServiceProfileId,
} from '../service-profile.mjs';
import { readRpcSettings } from '../clinical-settings.mjs';
```

- [ ] **Step 2: Update `resolveHostBearerToken`**

After reading base from IPC (`info.code` is already effective from Task 3), persist effective code in `rpc-lan-config`. For remote join mode with saved base in config, re-derive:

```javascript
async function resolveHostBearerToken() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var fromCfg = trimStoredLanBearer(cfg.teamCode);
  if (window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === 'function') {
    try {
      var info = await window.electronAPI.getLanEffectiveTeamCode();
      if (info && info.ok && info.code) return String(info.code).trim();
    } catch (_e) {}
  }
  if (fromCfg.length >= 32) {
    return deriveEffectiveTeamCodeFromSettings(readRpcSettings(), fromCfg);
  }
  return '';
}
```

- [ ] **Step 3: Add `peerMatchesServiceProfile(data)` helper**

```javascript
function peerMatchesServiceProfile(envelope) {
  var local = getActiveServiceProfileId();
  var remote = String(envelope?.serviceProfileId ?? '').trim().toLowerCase();
  if (!remote) return local === '';
  return remote === local;
}
```

- [ ] **Step 4: Filter in `onLiveSyncWireMessage`**

At top of hello/host-handoff handler, before `recordLivePeer`:

```javascript
if (!peerMatchesServiceProfile(data)) return;
```

Same guard in `scanLanHosts` after parsing `host-rank` JSON:

```javascript
if (data.serviceProfileId && !peerMatchesServiceProfile(data)) continue;
```

- [ ] **Step 5: Extend `buildLiveSyncHelloPayload`**

```javascript
payload.serviceProfileId = getActiveServiceProfileId();
```

Run bundle: `node scripts/bundle-renderer.mjs`  
Commit: `feat(lan): client uses effective bearer and ignores cross-service peers`

---

### Task 6: Endpoint host-rank con serviceProfileId

**Files:**
- Modify: `lan-squad/host-router.js` or `server.js` mount
- Create: `lan-squad/host-rank-router.js` (small router)

- [ ] **Step 1: Add route**

```javascript
router.get('/host-rank', bearerAuth, (req, res) => {
  const profilePath = path.join(process.env.R_PLUS_USER_DATA || '', 'service-profile.json');
  let serviceProfileId = '';
  try {
    const j = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    serviceProfileId = j.serviceProfileLegacy ? '' : String(j.serviceProfileId || '').trim().toLowerCase();
  } catch (_e) {}
  const rank = String(req.headers['x-clinical-rank'] || '').trim() || 'R1';
  res.json({ rank, serviceProfileId });
});
```

(Client sends `X-Clinical-Rank` from rpc-settings in `scanLanHosts` fetch headers.)

- [ ] **Step 2: Test with auth-router pattern**

Run: `node --test lan-squad/host-router.test.js` (extend with host-rank case)

- [ ] **Step 3: Commit**

---

### Task 7: Onboarding “Elige tu servicio” (antes de Mi rotación)

**Files:**
- Create: `public/js/features/service-profile-onboarding.mjs`
- Modify: `public/js/features/clinical-onboarding.mjs`
- Modify: `public/js/features/clinical-onboarding-main.mjs`

- [ ] **Step 1: Gate in `needsClinicalOnboarding` chain**

In `clinical-onboarding-main.mjs` / new module, before username step:

```javascript
import { needsServiceProfileSelection, persistServiceProfileId } from '../service-profile.mjs';
import { SERVICE_PROFILE_PRESETS } from '../service-profiles/presets.mjs';

export function needsServiceProfileOnboarding() {
  return needsServiceProfileSelection();
}
```

In `renderOnboardingPanelInto`, if `needsServiceProfileOnboarding()` render card with 4 buttons (MI, UTI, Infecto, Cirugía) + link “Instalación anterior (sin servicio)” → sets `serviceProfileLegacy: true`.

On select:

```javascript
persistServiceProfileId(id);
await window.electronAPI.syncServiceProfile({ serviceProfileId: id });
// apply defaults.servicioCenso to settings-default-servicio if present
```

- [ ] **Step 2: Wire into clinical-onboarding.mjs**

First branch in `renderOnboardingPanelInto` before `needsUsernameClaim()`.

- [ ] **Step 3: Manual test**

Unlock DB → onboarding shows service picker → pick UTI → proceeds to username step.

- [ ] **Step 4: Commit**

---

### Task 8: Selector en Mi Perfil + cambio con confirmación

**Files:**
- Modify: `public/partials/layout/app-body.html` (profile block before Modo de trabajo)
- Modify: `public/js/features/profile.mjs`
- Modify: `public/styles/settings.css`

- [ ] **Step 1: HTML block `profile-service-profile`**

Radio/card grid: Medicina Interna, Terapia Intensiva, Infectología, Cirugía. Hint: cambiar servicio desconecta LAN y reinicia Mi rotación.

- [ ] **Step 2: `onServiceProfileChange()` in profile.mjs**

```javascript
export async function onServiceProfileChange(nextId) {
  if (!confirm('Cambiar servicio desconecta la red LAN y puede reiniciar equipos. ¿Continuar?')) return;
  const { disconnectLanFully } = await import('./lan-sync.mjs'); // export helper if missing
  disconnectLanFully();
  persistServiceProfileId(nextId);
  if (window.electronAPI?.syncServiceProfile) {
    await window.electronAPI.syncServiceProfile({ serviceProfileId: nextId });
  }
  const manifest = resolveServiceManifest(nextId);
  if (manifest?.defaults?.servicioCenso) {
    st.defaultServicio = manifest.defaults.servicioCenso;
  }
  saveSettings(st);
  runtime.showToast('Servicio actualizado. Revisa Mi rotación.', 'info');
}
```

- [ ] **Step 3: Hub LAN label**

In `lan-sync.mjs` renderLanPanelOnce status card, add:

```javascript
'<p class="lan-connect-hint">Red: ' + escapeHtml(getServiceProfileLabel()) + '</p>'
```

- [ ] **Step 4: `npm run build:ui` + bundle**

- [ ] **Step 5: Commit**

**Phase 1 checkpoint:** Dos Macs mismo Wi‑Fi, perfil `mi` vs `uti`, no sync cruzado; legacy install sin regresión.

---

## Phase 2 — Manifiestos preset + resolveServiceModules

### Task 9: Presets embebidos

**Files:**
- Create: `public/js/service-profiles/presets.mjs`
- Create: `public/js/service-profiles/presets.test.mjs`

- [ ] **Step 1: Define four presets per spec table**

All include `procedureAgenda: true`. Export:

```javascript
export const SERVICE_PROFILE_PRESETS = {
  mi: { id: 'mi', label: 'Medicina Interna', lan: { teamCodeSuffix: 'mi' }, modules: { /* ... */ } },
  uti: { /* ... */ },
  infecto: { /* ... */ },
  cir: { /* ... */ },
};
export const SERVICE_PROFILE_OPTIONS = ['mi', 'uti', 'infecto', 'cir'];
```

- [ ] **Step 2: Test agenda on all four**

```javascript
for (const id of SERVICE_PROFILE_OPTIONS) {
  assert.equal(SERVICE_PROFILE_PRESETS[id].modules.procedureAgenda, true);
}
```

- [ ] **Step 3: Implement `resolveServiceManifest` in service-profile.mjs**

Merge `settings.serviceManifest` override deep-merge on preset.

- [ ] **Step 4: Commit**

---

### Task 10: resolveServiceModules + wire UI

**Files:**
- Create: `public/js/service-modules.mjs`
- Create: `public/js/service-modules.test.mjs`
- Modify: `public/js/expediente-tabs.mjs`
- Modify: `public/js/features/chrome.mjs` (sidebar agenda tab)
- Modify: `public/js/features/clinical-teams.mjs` (filter `CLINICAL_TEAM_SERVICES` by manifest)

- [ ] **Step 1: `resolveServiceModules(settings)` returns merged booleans**

```javascript
export function resolveServiceModules(settings) {
  const manifest = resolveServiceManifest(getActiveServiceProfileId(settings), settings);
  return { ...DEFAULT_ALL_TRUE, ...manifest.modules };
}
```

- [ ] **Step 2: Gate agenda sidebar**

In chrome/sidebar render, skip agenda nav item when `!modules.procedureAgenda` (should stay true for presets).

- [ ] **Step 3: Gate eventualidades segment**

In expediente-tabs / composite pane builder, hide segments when module false.

- [ ] **Step 4: Tests + commit**

---

## Phase 3 — Sandbox

### Task 11: Preview state + banner

**Files:**
- Create: `public/js/features/service-profile-settings.mjs`
- Modify: `public/partials/layout/app-body.html` (Ajustes accordion)
- Modify: `public/js/features/profile.mjs`

- [ ] **Step 1: `servicePreviewState` in sessionStorage**

```javascript
export function startServicePreview(presetId) {
  sessionStorage.setItem('servicePreviewState', JSON.stringify({ presetId, modules: { ... } }));
}
export function getEffectiveSettingsForUi(baseSettings) {
  const preview = readPreview();
  if (!preview) return baseSettings;
  return { ...baseSettings, _servicePreview: preview };
}
```

- [ ] **Step 2: Banner component**

Fixed banner `#service-preview-banner` “Vista previa — no guardado” when preview active; discard on profile/settings close.

- [ ] **Step 3: Sandbox panel in Ajustes**

Preset selector, module toggles (read-only for R1–R3 except preview), Export JSON button, Aplicar / Descartar.

- [ ] **Step 4: `applyServicePreview`**

Only on Apply: persist manifest, `syncServiceProfile`, reconnect LAN, toast.

- [ ] **Step 5: Commit**

---

## Phase 4 — Custom overrides (R4/Admin)

### Task 12: Persist custom manifest in userData

**Files:**
- Modify: `main.js` — optional `service-manifest-custom.json`
- Modify: `public/js/service-profile.mjs`
- Modify: `public/js/features/service-profile-settings.mjs`

- [ ] **Step 1: Gate toggles on `hasElevatedTeamPrivileges`**

- [ ] **Step 2: Save `serviceManifest` patch to rpc-settings + IPC file**

- [ ] **Step 3: Invalid manifest fallback + toast**

- [ ] **Step 4: Commit**

---

## Phase 5 — Notificaciones cross-service (cultivos)

> **Spec:** Fase 5 en [`2026-06-02-hospital-service-profiles-design.md`](../specs/2026-06-02-hospital-service-profiles-design.md). Modelo **B**: notificación + **Ver** → import manual confirmado. Sin auto-merge.

### Task 13: Canal LAN `clinical-events`

**Files:**
- Create: `lan-squad/clinical-events-channel.js`
- Create: `lan-squad/clinical-events-channel.test.js`
- Modify: `lan-squad/service-profile-token.js` — constante `CLINICAL_EVENTS_PROFILE_ID = 'clinical-events'`
- Modify: `server.js` — segundo relay o namespace WS para eventos

- [ ] **Step 1: Derive events token**

```javascript
const CLINICAL_EVENTS_PROFILE_ID = 'clinical-events';
function deriveClinicalEventsTeamPlain(baseToken) {
  return deriveEffectiveTeamPlain(baseToken, CLINICAL_EVENTS_PROFILE_ID);
}
```

- [ ] **Step 2: WS handler `clinical-event:publish` / fan-out**

Accept envelope `{ type, patientId, sourceServiceProfileId, preview, sourceHostUrl, at }`; validate Bearer events token; broadcast to subscribed clients on same channel.

- [ ] **Step 3: Test publish + two subscribers receive metadata**

Run: `node --test lan-squad/clinical-events-channel.test.js`

- [ ] **Step 4: Commit**

---

### Task 14: Cliente eventos + cola de notificaciones

**Files:**
- Create: `public/js/clinical-events-client.mjs`
- Create: `public/js/clinical-events-client.test.mjs`
- Modify: `public/js/features/lan-sync.mjs` — connect events channel alongside service LAN (optional second WS or multiplex)

- [ ] **Step 1: `onClinicalEvent(envelope)` — gate by manifest subscribe + local census**

```javascript
export function shouldNotifyForEvent(envelope, settings, patientIdsInCensus) {
  const manifest = resolveServiceManifest(getActiveServiceProfileId(settings), settings);
  const subs = manifest.crossService?.subscribe || [];
  if (!subs.includes(envelope.type)) return false;
  return patientIdsInCensus.has(envelope.patientId);
}
```

- [ ] **Step 2: Persist pending notifications in `localStorage` key `clinical-event-inbox`**

- [ ] **Step 3: Tests — no notify without patient in census; no notify without subscribe**

- [ ] **Step 4: Commit**

---

### Task 15: Publicar desde Infecto al guardar cultivos

**Files:**
- Create: `public/js/features/cultivo-cross-service.mjs`
- Modify: cultivo save path (grep `cultivo` / manejo cultivo panel save handler)

- [ ] **Step 1: After successful local cultivo save, if manifest `crossService.publish` includes `cultivo-updated`:**

```javascript
clinicalEventsClient.publish({
  type: 'cultivo-updated',
  patientId: patient.id,
  sourceServiceProfileId: getActiveServiceProfileId(),
  sourceTeamLabel: 'Infectología',
  preview: buildCultivoPreview(saved),
  sourceHostUrl: await resolveSelfLanAdvertiseHostUrl(),
  at: new Date().toISOString(),
});
```

- [ ] **Step 2: Add `crossService` to infecto preset; subscribe on mi/uti/cir**

- [ ] **Step 3: Manual test — Infecto saves → MI sees inbox entry, expediente unchanged**

- [ ] **Step 4: Commit**

---

### Task 16: UI Ver / Importar / Descartar

**Files:**
- Create: `public/js/features/clinical-notifications-panel.mjs`
- Modify: `public/partials/layout/app-body.html` — badge + panel
- Modify: `public/js/features/patients.mjs` — sidebar badge per patient

- [ ] **Step 1: Notification row copy**

“Infectología actualizó cultivos — **Ver**”

- [ ] **Step 2: Ver → fetch `GET /api/lan/v1/clinical-slice/cultivos?patientId=` from `sourceHostUrl`**

Show diff preview; **Importar** calls existing cultivo merge helper; **Descartar** removes inbox entry.

- [ ] **Step 3: Assert expediente unchanged until Importar clicked (unit test on merge gate)**

- [ ] **Step 4: `npm run build:ui` + bundle + commit**

**Phase 5 checkpoint:** Infecto update → MI notification only → Importar merges cultivos slice only.

---

## Verification checklist (end-to-end)

- [ ] `node --test lan-squad/service-profile-token.test.js lan-squad/effective-team-code.test.js public/js/service-profile.test.mjs public/js/service-modules.test.mjs public/js/service-profiles/presets.test.mjs`
- [ ] Legacy: `serviceProfileLegacy: true` → LAN unchanged vs pre-feature
- [ ] MI + UTI laptops same Wi‑Fi: no hello handling cross-profile
- [ ] Sandbox preview: LAN stays connected until Apply
- [ ] All four presets: `procedureAgenda: true`
- [ ] Onboarding: service step appears before username
- [ ] `npm run build:ui && node scripts/bundle-renderer.mjs`
- [ ] Phase 5: Infecto publish → MI notify → no auto-merge → Importar merges cultivos only

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Perfil antes de Mi rotación | 7, 8 |
| LAN sufijo + legacy | 1–5 |
| Filtro peers | 5, 6 |
| Manifiesto + agenda all on | 9, 10 |
| Sandbox preview/apply | 11 |
| Custom R4/Admin | 12 |
| Hub label servicio | 8 |
| Cambio servicio desconecta LAN | 8 |
| rotation.teamServices filter | 10 |
| Cross-service notify (no auto-merge) | 13–16 |
| cultivo-updated publish/subscribe | 14, 15 |
| Ver → Importar manual | 16 |

No TBD placeholders remain in task steps above.
