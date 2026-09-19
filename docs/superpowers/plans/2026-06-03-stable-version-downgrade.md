# Restaurar versión estable anterior — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir downgrade híbrido (in-app + fallback GitHub) a versiones estables curadas cuando la release actual falla, sin borrar datos locales.

**Architecture:** Catálogo remoto `stable-versions.json`; renderer filtra semver y confirma; main process cambia feed genérico de electron-updater con `allowDowngrade=true`, reutiliza eventos IPC del updater existente; al fallar, abre DMG/exe correcto vía `openExternal`. Tras downgrade o cancelación, reset del feed GitHub por defecto.

**Tech Stack:** Electron, electron-updater, IPC (preload), vanilla JS en `platform.mjs`, Node test runner.

**Spec:** [`docs/superpowers/specs/2026-06-03-stable-version-downgrade-design.md`](../specs/2026-06-03-stable-version-downgrade-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `stable-versions.json` | Catálogo curado de estables (repo root) |
| `lib/update-downgrade.js` | URLs feed/instalador, validación semver, filtro catálogo |
| `lib/update-downgrade.test.js` | Tests puros de lib |
| `lib/stable-versions-catalog.js` | Parse + merge catálogo (usado por release.js) |
| `main.js` | IPC `downgrade-to-stable`, `reset-update-feed`, estado feed |
| `preload.js` | Exponer API al renderer |
| `public/js/stable-downgrade-ui.mjs` | Fetch catálogo, selector Ajustes, confirmación, fallback |
| `public/js/stable-downgrade-ui.test.mjs` | Tests filtro catálogo (sin DOM) |
| `public/js/features/platform.mjs` | Wire modal update en modo downgrade, export init |
| `public/partials/chrome/header.html` | Controles UI en acordeón updates |
| `public/js/features/settings-help.mjs` | Ayuda + keywords |
| `scripts/lib/release-git.js` | Stage `stable-versions.json` |
| `scripts/release.js` | Append entrada al publicar estable |
| `package.json` | Registrar tests nuevos en script `test` |

---

### Task 1: Core lib — URLs y semver

**Files:**
- Create: `lib/update-downgrade.js`
- Create: `lib/update-downgrade.test.js`
- Modify: `package.json` (añadir test al script `test`)

- [ ] **Step 1: Write the failing test**

Create `lib/update-downgrade.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  GITHUB_RELEASES_BASE,
  STABLE_VERSIONS_RAW_URL,
  parseSemverCore,
  compareSemverCore,
  isValidDowngradeTargetVersion,
  buildGenericFeedUrl,
  buildManualInstallerUrl,
  filterDowngradeCandidates,
  pickMacArch,
} = require('./update-downgrade.js');

test('parseSemverCore acepta X.Y.Z', () => {
  assert.deepEqual(parseSemverCore('6.5.4'), [6, 5, 4]);
  assert.deepEqual(parseSemverCore('v6.5.4'), [6, 5, 4]);
  assert.equal(parseSemverCore('6.5'), null);
});

test('compareSemverCore ordena correctamente', () => {
  assert.equal(compareSemverCore('6.5.3', '6.5.4'), -1);
  assert.equal(compareSemverCore('6.5.4', '6.5.4'), 0);
  assert.equal(compareSemverCore('6.6.0', '6.5.4'), 1);
});

test('isValidDowngradeTargetVersion rechaza actual o superior', () => {
  assert.equal(isValidDowngradeTargetVersion('6.5.3', '6.5.4'), true);
  assert.equal(isValidDowngradeTargetVersion('6.5.4', '6.5.4'), false);
  assert.equal(isValidDowngradeTargetVersion('6.5.5', '6.5.4'), false);
});

test('buildGenericFeedUrl apunta al tag de release', () => {
  assert.equal(
    buildGenericFeedUrl('6.5.3'),
    `${GITHUB_RELEASES_BASE}/v6.5.3/`
  );
});

test('buildManualInstallerUrl elige artefacto por plataforma', () => {
  assert.match(
    buildManualInstallerUrl('6.5.3', 'darwin', 'arm64'),
    /R\+-6\.5\.3-arm64\.dmg$/
  );
  assert.match(
    buildManualInstallerUrl('6.5.3', 'darwin', 'x64'),
    /R\+-6\.5\.3-x64\.dmg$/
  );
  assert.match(
    buildManualInstallerUrl('6.5.3', 'win32', 'x64'),
    /R\+-6\.5\.3-x64\.exe$/
  );
});

test('filterDowngradeCandidates solo menores que actual', () => {
  const entries = [
    { version: '6.5.4' },
    { version: '6.5.3', recommended: true },
    { version: '6.5.2' },
    { version: 'bad' },
  ];
  const out = filterDowngradeCandidates(entries, '6.5.4');
  assert.deepEqual(out.map((e) => e.version), ['6.5.3', '6.5.2']);
  assert.equal(out[0].recommended, true);
});

test('pickMacArch usa process.arch en main', () => {
  assert.equal(pickMacArch('arm64'), 'arm64');
  assert.equal(pickMacArch('x64'), 'x64');
  assert.equal(pickMacArch('ia32'), 'x64');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test lib/update-downgrade.test.js
```

Expected: FAIL — `Cannot find module './update-downgrade.js'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/update-downgrade.js`:

```javascript
const GITHUB_RELEASES_BASE =
  'https://github.com/mausalas99/r-mas/releases/download';
const STABLE_VERSIONS_RAW_URL =
  'https://raw.githubusercontent.com/mausalas99/r-mas/main/stable-versions.json';

function parseSemverCore(version) {
  const m = String(version || '')
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-.+].*)?$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function compareSemverCore(a, b) {
  const pa = parseSemverCore(a);
  const pb = parseSemverCore(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function isValidDowngradeTargetVersion(target, current) {
  if (!parseSemverCore(target) || !parseSemverCore(current)) return false;
  return compareSemverCore(target, current) < 0;
}

function buildGenericFeedUrl(version) {
  const v = String(version || '').replace(/^v/, '');
  if (!parseSemverCore(v)) throw new Error(`Versión inválida: ${version}`);
  return `${GITHUB_RELEASES_BASE}/v${v}/`;
}

function buildManualInstallerUrl(version, platform, arch) {
  const v = String(version || '').replace(/^v/, '');
  if (!parseSemverCore(v)) throw new Error(`Versión inválida: ${version}`);
  const macArch = pickMacArch(arch);
  let fileName;
  if (platform === 'darwin') {
    fileName = `R+-${v}-${macArch}.dmg`;
  } else if (platform === 'win32') {
    fileName = `R+-${v}-x64.exe`;
  } else {
    throw new Error(`Plataforma no soportada: ${platform}`);
  }
  return `${GITHUB_RELEASES_BASE}/v${v}/${fileName}`;
}

function filterDowngradeCandidates(entries, currentVersion) {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .filter((e) => e && isValidDowngradeTargetVersion(e.version, currentVersion))
    .sort((a, b) => compareSemverCore(b.version, a.version));
}

function pickMacArch(arch) {
  return arch === 'arm64' ? 'arm64' : 'x64';
}

module.exports = {
  GITHUB_RELEASES_BASE,
  STABLE_VERSIONS_RAW_URL,
  parseSemverCore,
  compareSemverCore,
  isValidDowngradeTargetVersion,
  buildGenericFeedUrl,
  buildManualInstallerUrl,
  filterDowngradeCandidates,
  pickMacArch,
};
```

Add to `package.json` script `test` (after `scripts/lib/artifact-names.test.js`):

```
lib/update-downgrade.test.js
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test lib/update-downgrade.test.js
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/update-downgrade.js lib/update-downgrade.test.js package.json
git commit -m "feat(update): lib de URLs y semver para downgrade estable"
```

---

### Task 2: Catálogo inicial + helper release

**Files:**
- Create: `stable-versions.json`
- Create: `lib/stable-versions-catalog.js`
- Create: `lib/stable-versions-catalog.test.js`
- Modify: `scripts/lib/release-git.js`
- Modify: `package.json` (test script)

- [ ] **Step 1: Write the failing test**

Create `lib/stable-versions-catalog.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  normalizeCatalog,
  upsertStableVersionEntry,
} = require('./stable-versions-catalog.js');

test('normalizeCatalog valida schema y ordena semver desc', () => {
  const cat = normalizeCatalog({
    schema: 1,
    entries: [{ version: '6.5.2' }, { version: '6.5.3' }],
  });
  assert.equal(cat.entries[0].version, '6.5.3');
});

test('upsertStableVersionEntry añade o actualiza sin duplicar', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stable-cat-'));
  const file = path.join(dir, 'stable-versions.json');
  fs.writeFileSync(
    file,
    JSON.stringify({ schema: 1, entries: [{ version: '6.5.3', summary: 'old' }] }),
    'utf8'
  );
  upsertStableVersionEntry(file, {
    version: '6.5.4',
    summary: 'Identidad LAN',
    recommended: true,
  });
  upsertStableVersionEntry(file, {
    version: '6.5.3',
    summary: 'Parche guardia',
  });
  const next = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(next.entries.length, 2);
  assert.equal(next.entries[0].version, '6.5.4');
  assert.equal(next.entries[0].recommended, true);
  assert.equal(next.entries[1].summary, 'Parche guardia');
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test lib/stable-versions-catalog.test.js
```

Expected: FAIL — module not found

- [ ] **Step 3: Write implementation + seed file**

Create `stable-versions.json`:

```json
{
  "schema": 1,
  "updatedAt": "2026-06-03",
  "entries": [
    {
      "version": "6.5.3",
      "label": "6.5.3",
      "publishedAt": "2026-05-28",
      "summary": "Estable anterior a identidad LAN ampliada y arranque sin contraseña.",
      "recommended": true
    },
    {
      "version": "6.5.2",
      "label": "6.5.2",
      "publishedAt": "2026-05-20",
      "summary": "Parche de guardia, censo y Mi rotación."
    }
  ]
}
```

Create `lib/stable-versions-catalog.js`:

```javascript
const fs = require('fs');
const { compareSemverCore, parseSemverCore } = require('./update-downgrade.js');

function normalizeCatalog(raw) {
  if (!raw || raw.schema !== 1 || !Array.isArray(raw.entries)) {
    throw new Error('stable-versions.json: schema inválido');
  }
  const entries = raw.entries
    .filter((e) => e && parseSemverCore(e.version))
    .map((e) => ({
      version: String(e.version).replace(/^v/, ''),
      label: String(e.label || e.version),
      publishedAt: e.publishedAt ? String(e.publishedAt) : undefined,
      summary: e.summary ? String(e.summary) : '',
      recommended: !!e.recommended,
    }))
    .sort((a, b) => compareSemverCore(b.version, a.version));
  return { schema: 1, updatedAt: raw.updatedAt || new Date().toISOString().slice(0, 10), entries };
}

function upsertStableVersionEntry(catalogPath, entry) {
  const version = String(entry.version || '').replace(/^v/, '');
  if (!parseSemverCore(version)) throw new Error(`Versión inválida: ${entry.version}`);
  let raw = { schema: 1, entries: [] };
  if (fs.existsSync(catalogPath)) {
    raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }
  const cat = normalizeCatalog(raw);
  const idx = cat.entries.findIndex((e) => e.version === version);
  const nextEntry = {
    version,
    label: String(entry.label || version),
    publishedAt: entry.publishedAt || new Date().toISOString().slice(0, 10),
    summary: String(entry.summary || ''),
    recommended: !!entry.recommended,
  };
  if (entry.recommended) {
    cat.entries.forEach((e) => {
      e.recommended = false;
    });
  }
  if (idx === -1) cat.entries.unshift(nextEntry);
  else cat.entries[idx] = { ...cat.entries[idx], ...nextEntry };
  cat.entries.sort((a, b) => compareSemverCore(b.version, a.version));
  cat.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(catalogPath, JSON.stringify(cat, null, 2) + '\n', 'utf8');
  return cat;
}

module.exports = { normalizeCatalog, upsertStableVersionEntry };
```

Add to `scripts/lib/release-git.js` → `RELEASE_STAGE_PATHS` after `'docs/'`:

```javascript
  'stable-versions.json',
```

Add `lib/stable-versions-catalog.test.js` to `package.json` test script.

- [ ] **Step 4: Run tests**

```bash
node --test lib/stable-versions-catalog.test.js lib/update-downgrade.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add stable-versions.json lib/stable-versions-catalog.js lib/stable-versions-catalog.test.js scripts/lib/release-git.js package.json
git commit -m "feat(update): catálogo stable-versions.json y helper de release"
```

---

### Task 3: Main process — IPC downgrade feed

**Files:**
- Modify: `main.js`
- Modify: `preload.js`

- [ ] **Step 1: Add downgrade state helpers in main.js**

After `applyUpdateChannel` (around line 50), add:

```javascript
const {
  buildGenericFeedUrl,
  buildManualInstallerUrl,
  isValidDowngradeTargetVersion,
  pickMacArch,
} = require('./lib/update-downgrade.js');

let downgradeSession = null; // { version: string } | null
let defaultUpdaterFeed = null;

function captureDefaultUpdaterFeed() {
  if (defaultUpdaterFeed) return defaultUpdaterFeed;
  try {
    defaultUpdaterFeed = autoUpdater.getFeedURL();
  } catch (_e) {
    defaultUpdaterFeed = null;
  }
  return defaultUpdaterFeed;
}

function resetUpdaterFeedToDefault() {
  downgradeSession = null;
  autoUpdater.allowDowngrade = false;
  applyUpdateChannel(readUpdateChannelFromDisk());
  const feed = captureDefaultUpdaterFeed();
  if (feed) {
    try {
      autoUpdater.setFeedURL(feed);
    } catch (_e) { /* noop */ }
  }
}

function beginDowngradeToVersion(version) {
  const target = String(version || '').replace(/^v/, '');
  const current = app.getVersion();
  if (!isValidDowngradeTargetVersion(target, current)) {
    throw new Error(`No se puede restaurar v${target} desde v${current}`);
  }
  downgradeSession = { version: target };
  autoUpdater.allowDowngrade = true;
  autoUpdater.autoDownload = true;
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: buildGenericFeedUrl(target),
  });
}
```

In `app.whenReady()` (before first update check), call `captureDefaultUpdaterFeed()`.

- [ ] **Step 2: Extend updater error handler for downgrade fallback**

Inside `autoUpdater.on('error', ...)`, before `safeSendToRenderer('update-error', msg)`:

```javascript
    if (downgradeSession) {
      const v = downgradeSession.version;
      let manualUrl = null;
      try {
        manualUrl = buildManualInstallerUrl(
          v,
          process.platform,
          process.platform === 'darwin' ? pickMacArch(process.arch) : 'x64'
        );
      } catch (_e) { /* noop */ }
      safeSendToRenderer('downgrade-failed', {
        version: v,
        code: 'updater-error',
        message: msg,
        manualUrl,
      });
      resetUpdaterFeedToDefault();
      return;
    }
```

- [ ] **Step 3: Reset feed after successful download in downgrade mode**

In `autoUpdater.on('update-downloaded', ...)`, after sending `update-ready`, if `downgradeSession` — keep session until install (do not reset yet).

In `ipcMain.on('install-update', ...)`, wrap:

```javascript
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});
```

Add new IPC handlers after `check-for-updates`:

```javascript
ipcMain.on('downgrade-to-stable', (_e, version) => {
  try {
    beginDowngradeToVersion(version);
    scheduleUpdateCheck(80);
  } catch (err) {
    safeSendToRenderer('downgrade-failed', {
      version: String(version || ''),
      code: 'invalid-target',
      message: err && err.message ? err.message : String(err),
      manualUrl: null,
    });
  }
});

ipcMain.on('reset-update-feed', () => {
  resetUpdaterFeedToDefault();
});

ipcMain.handle('open-downgrade-installer', async (_e, version) => {
  const v = String(version || '').replace(/^v/, '');
  const url = buildManualInstallerUrl(
    v,
    process.platform,
    process.platform === 'darwin' ? pickMacArch(process.arch) : 'x64'
  );
  await shell.openExternal(url);
  return { ok: true, url };
});
```

- [ ] **Step 4: Expose preload API**

In `preload.js`, add:

```javascript
  downgradeToStable: function(version) {
    ipcRenderer.send('downgrade-to-stable', version);
  },
  resetUpdateFeed: function() {
    ipcRenderer.send('reset-update-feed');
  },
  onDowngradeFailed: function(cb) {
    ipcRenderer.on('downgrade-failed', function(_e, payload) { cb(payload); });
  },
  openDowngradeInstaller: function(version) {
    return ipcRenderer.invoke('open-downgrade-installer', version);
  },
```

- [ ] **Step 5: Manual smoke (dev)**

```bash
npm start
```

In DevTools console (Electron):

```javascript
window.electronAPI.downgradeToStable('6.5.3');
```

Expected: modal update o evento `downgrade-failed` si no hay feed en red.

- [ ] **Step 6: Commit**

```bash
git add main.js preload.js
git commit -m "feat(update): IPC downgrade-to-stable con feed genérico y fallback"
```

---

### Task 4: Renderer module — catálogo y selector Ajustes

**Files:**
- Create: `public/js/stable-downgrade-ui.mjs`
- Create: `public/js/stable-downgrade-ui.test.mjs`
- Modify: `public/partials/chrome/header.html`
- Modify: `public/js/features/platform.mjs`
- Modify: `package.json` (test script)

- [ ] **Step 1: Write failing renderer tests**

Create `public/js/stable-downgrade-ui.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickDefaultDowngradeVersion,
  isBlockedByMinVersion,
} from './stable-downgrade-ui.mjs';

test('pickDefaultDowngradeVersion elige recommended', () => {
  const v = pickDefaultDowngradeVersion([
    { version: '6.5.3', recommended: true },
    { version: '6.5.2' },
  ]);
  assert.equal(v, '6.5.3');
});

test('pickDefaultDowngradeVersion cae al primero', () => {
  assert.equal(
    pickDefaultDowngradeVersion([{ version: '6.5.2' }, { version: '6.5.1' }]),
    '6.5.2'
  );
});

test('isBlockedByMinVersion respeta minVersion remoto', () => {
  assert.equal(isBlockedByMinVersion('6.5.2', '6.5.3'), true);
  assert.equal(isBlockedByMinVersion('6.5.3', '6.5.3'), false);
  assert.equal(isBlockedByMinVersion('6.5.4', '6.5.3'), false);
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test public/js/stable-downgrade-ui.test.mjs
```

- [ ] **Step 3: Implement stable-downgrade-ui.mjs**

Create `public/js/stable-downgrade-ui.mjs` with exports:

```javascript
import {
  STABLE_VERSIONS_RAW_URL,
  filterDowngradeCandidates,
  compareSemverCore,
} from '../../lib/update-downgrade.js';

const MIN_VERSION_URL =
  'https://raw.githubusercontent.com/mausalas99/r-mas/main/min-version.json';

export function pickDefaultDowngradeVersion(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const rec = list.find((e) => e.recommended);
  return rec ? rec.version : list[0] ? list[0].version : '';
}

export function isBlockedByMinVersion(target, minVersion) {
  if (!minVersion) return false;
  return compareSemverCore(target, minVersion) < 0;
}

export async function fetchStableVersionsCatalog() {
  if (typeof fetch !== 'function') return { entries: [] };
  const res = await fetch(STABLE_VERSIONS_RAW_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar el catálogo de versiones estables');
  const raw = await res.json();
  const entries = filterDowngradeCandidates(raw.entries || [], await getCurrentAppVersion());
  return { entries, rawUpdatedAt: raw.updatedAt || '' };
}

export async function fetchMinVersion() {
  if (typeof fetch !== 'function') return null;
  try {
    const res = await fetch(MIN_VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.minVersion ? String(data.minVersion) : null;
  } catch (_e) {
    return null;
  }
}

async function getCurrentAppVersion() {
  if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
    return window.electronAPI.getAppVersion().catch(() => '0.0.0');
  }
  return '0.0.0';
}

export async function initStableDowngradeSettings(deps) {
  const section = document.getElementById('settings-downgrade-section');
  const select = document.getElementById('rpc-stable-downgrade-select');
  const btn = document.getElementById('settings-downgrade-stable-btn');
  const hint = document.getElementById('settings-downgrade-hint');
  if (!section || !select || !btn) return;
  if (!window.electronAPI) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  try {
    const [{ entries }, minVersion] = await Promise.all([
      fetchStableVersionsCatalog(),
      fetchMinVersion(),
    ]);
    select.innerHTML = '';
    if (!entries.length) {
      section.hidden = true;
      return;
    }
    entries.forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.version;
      opt.textContent = e.label + (e.summary ? ` — ${e.summary}` : '');
      select.appendChild(opt);
    });
    select.value = pickDefaultDowngradeVersion(entries);
    if (hint) {
      hint.textContent =
        'Si la versión actual falla, restaura una estable anterior. Tus datos locales no se borran.';
    }
    btn.onclick = () => {
      const version = select.value;
      if (!version) return;
      if (isBlockedByMinVersion(version, minVersion)) {
        deps.showToast(
          'Esa versión ya no es compatible con tus datos (mínimo v' + minVersion + ').',
          'error'
        );
        return;
      }
      deps.confirmDowngrade(version, entries.find((e) => e.version === version));
    };
  } catch (_e) {
    if (hint) hint.textContent = 'Sin conexión: no se pudo cargar versiones anteriores.';
    btn.disabled = true;
  }
}
```

**Note:** `lib/update-downgrade.js` is CJS — for ESM import in renderer tests, either:
- duplicate thin semver helpers in `stable-downgrade-ui.mjs` for browser bundle, OR
- add `lib/update-downgrade.mjs` ESM re-export used by bundle.

**Recommended:** create `lib/update-downgrade.mjs` that re-exports the same functions (copy or dynamic import). Bundle already includes `lib/**/*.mjs`. Add `lib/update-downgrade.mjs` mirroring exports from `.js` for renderer import path `../../lib/update-downgrade.mjs`.

- [ ] **Step 4: Add UI in header.html**

Inside `#settings-accordion-updates` `.settings-acc-body`, after the check-updates button block:

```html
          <div id="settings-downgrade-section" class="settings-downgrade-section" hidden>
            <hr class="profile-divider settings-acc-divider">
            <label for="rpc-stable-downgrade-select" class="profile-field-label settings-acc-label-spaced--xs">Restaurar versión estable</label>
            <p id="settings-downgrade-hint" class="settings-acc-hint settings-acc-hint--tight">Si la versión actual falla, restaura una estable anterior. Tus datos locales no se borran.</p>
            <select id="rpc-stable-downgrade-select" class="profile-input settings-acc-select"></select>
            <button type="button" class="btn-edit-templates" id="settings-downgrade-stable-btn" style="margin-top:8px;">Restaurar versión seleccionada…</button>
          </div>
```

Run:

```bash
npm run build:ui
```

- [ ] **Step 5: Wire platform.mjs**

Add at top of platform.mjs imports:

```javascript
import { initStableDowngradeSettings } from '../stable-downgrade-ui.mjs';
```

Add state:

```javascript
var pendingDowngradeVersion = null;
var updateModalMode = 'upgrade'; // 'upgrade' | 'downgrade'
```

Add functions:

```javascript
function confirmDowngrade(version, entry) {
  var summary = entry && entry.summary ? entry.summary : '';
  var ok = window.confirm(
    'Restaurar R+ a v' + version + '?\n\n' + summary + '\n\nLa app se reiniciará. Tus pacientes y ajustes locales se conservan.'
  );
  if (!ok) return;
  pendingDowngradeVersion = version;
  updateModalMode = 'downgrade';
  resetUpdateModalPanels();
  showUpdateModal();
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild) title.firstChild.textContent = 'Restaurando versión estable';
  if (window.electronAPI && window.electronAPI.downgradeToStable) {
    window.electronAPI.downgradeToStable(version);
  }
}

function renderDowngradeFallback(payload) {
  updateModalMode = 'upgrade';
  pendingDowngradeVersion = null;
  renderUpdateError(
    (payload && payload.message ? payload.message : 'No se pudo descargar la versión.') +
      ' Puedes abrir el instalador en GitHub.'
  );
  var actions = document.getElementById('update-modal-actions-primary');
  if (actions && payload && payload.manualUrl) {
    var openBtn = document.createElement('button');
    openBtn.className = 'btn-primary';
    openBtn.textContent = 'Abrir instalador en GitHub';
    openBtn.onclick = function () {
      if (window.electronAPI && window.electronAPI.openDowngradeInstaller) {
        window.electronAPI.openDowngradeInstaller(payload.version);
      } else if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(payload.manualUrl);
      }
    };
    actions.innerHTML = '';
    actions.appendChild(openBtn);
  }
  if (window.electronAPI && window.electronAPI.resetUpdateFeed) {
    window.electronAPI.resetUpdateFeed();
  }
}
```

In `initUpdateChannelAndGate()`, after existing init:

```javascript
  initStableDowngradeSettings({
    showToast: rt.showToast.bind(rt),
    confirmDowngrade: confirmDowngrade,
  });
```

Register listener alongside other updater listeners:

```javascript
  if (window.electronAPI.onDowngradeFailed) {
    window.electronAPI.onDowngradeFailed(renderDowngradeFallback);
  }
```

In `onUpdateAvailable` handler: if `updateModalMode === 'downgrade'`, set title to `Restaurando a v…` and skip snooze/dismiss logic for upgrades.

In `hideUpdateModal` / dismiss: call `resetUpdateFeed` if downgrade was cancelled mid-flight.

Export `confirmDowngrade` on window if needed for tests (optional).

- [ ] **Step 6: Run tests + build**

```bash
node --test public/js/stable-downgrade-ui.test.mjs lib/update-downgrade.test.js
npm run build:ui
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add public/js/stable-downgrade-ui.mjs public/js/stable-downgrade-ui.test.mjs public/js/features/platform.mjs public/partials/chrome/header.html lib/update-downgrade.mjs package.json
git commit -m "feat(update): UI Ajustes para restaurar versión estable anterior"
```

---

### Task 5: Ayuda, release hook, verificación final

**Files:**
- Modify: `public/js/features/settings-help.mjs`
- Modify: `scripts/release.js`
- Modify: `scripts/lib/release-git.js` (already done Task 2)

- [ ] **Step 1: Update help article `actualizacion`**

Replace bullet about manual Releases with:

```javascript
'<li><strong>Restaurar versión estable</strong>: en Ajustes → Aplicación, elige una versión anterior curada y confirma. R+ intenta instalarla como una actualización; si falla (p. ej. firma en Mac), abre el instalador correcto en GitHub. Tus datos locales no se borran.</li>' +
'<li>Si la versión elegida está por debajo del mínimo soportado, R+ bloquea la restauración automática.</li>' +
```

Add keywords: `downgrade rollback restaurar estable`.

- [ ] **Step 2: Hook release.js publish**

Near end of successful publish (after gh release), add:

```javascript
const { upsertStableVersionEntry } = require('./lib/stable-versions-catalog');
const catalogPath = path.join(ROOT, 'stable-versions.json');
const channel = readJson('package.json'); // already have version
upsertStableVersionEntry(catalogPath, {
  version,
  summary: `Release estable ${version}`,
  recommended: true,
});
console.log('→ stable-versions.json actualizado para', version);
```

Ensure `stable-versions.json` is committed in the release commit path (already in `release-git.js`).

- [ ] **Step 3: Full test suite**

```bash
npm test
npm run build:ui:check
```

Expected: 0 failures

- [ ] **Step 4: Commit**

```bash
git add public/js/features/settings-help.mjs scripts/release.js
git commit -m "docs(update): ayuda downgrade; release mantiene stable-versions.json"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `stable-versions.json` curado | Task 2 |
| Solo versiones menores que actual | Task 1, 4 |
| In-app feed + allowDowngrade | Task 3 |
| Fallback GitHub DMG/exe | Task 3, 4 |
| Reutilizar update modal | Task 4 |
| UI en Ajustes | Task 4 |
| min-version bloquea downgrade | Task 4 |
| userData intacto (copy only) | Task 4 confirm text |
| Reset feed post-downgrade | Task 3 |
| release.js mantiene catálogo | Task 5 |
| Tests semver/URLs | Task 1, 2, 4 |
| Solo Electron desktop | Task 4 hides section without electronAPI |

---

## Manual test plan (post-implementation)

1. Instalar build 6.5.4 → Ajustes → ver selector con 6.5.3, 6.5.2.
2. Elegir 6.5.3 → confirmar → modal “Restaurando…” → progreso → reiniciar.
3. Simular error (versión inexistente `6.0.0-test`) → modal error + botón GitHub.
4. Verificar que “Buscar actualizaciones” sigue proponiendo upgrade tras reset.
5. Windows x64: URL termina en `.exe`.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-03-stable-version-downgrade.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

2. **Inline Execution** — implement tasks in this session with checkpoints after Task 2 and Task 4.

Which approach do you want?
