# 2 · How the app is built and how it starts

> **You'll learn:** what Electron's three "worlds" are, how a button click in R+ reaches Node and comes back, where features plug in, and why you never edit `app.bundle.mjs`.
>
> **Prereqs:** [01 · The big picture](./01-the-big-picture.md)

---

## The one-paragraph version

R+ is an **Electron** app. Electron = a Chromium browser window (the **renderer**, your UI) glued to a Node.js program (the **main process**, which can touch disk, the database and native dialogs). For safety the two can't call each other directly — they talk by sending named messages (**IPC**) through a tiny, whitelisted doorway called the **preload**. Everything else in this page is detail on top of that sentence.

```
┌────────────────────────── Electron app ──────────────────────────┐
│                                                                  │
│  RENDERER (Chromium page)        PRELOAD              MAIN (Node)│
│  public/js/**                    preload.js           main.js    │
│  ─ HTML, CSS, features           ─ exposes            ─ windows  │
│  ─ no Node, no disk                window.electronAPI ─ SQLCipher│
│                                                       ─ .docx    │
│   window.electronAPI.generateDocument(...)            ─ updater  │
│        │                                                   ▲     │
│        └──► ipcRenderer.invoke('generate-document') ──────►┘     │
│                         ◄──────── result (Promise) ───────       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. Where the code physically lives

The repo is an **npm workspace** — one git repo holding several packages (`package.json` → `"workspaces": ["packages/*"]`).

| Package | What's in it |
|---|---|
| `packages/core` (`@rplus/core`) | ~everything: `lib/` (Node logic, DB, doc generators), `public/` (the UI), `cloud/` (Cloudflare Workers), `scripts/` (build, CI, e2e, release), `data/`, the `.docx` templates |
| `packages/im` (`@rplus/im`) | Just `main.js` and `preload.js` — the Electron "shell" for the Internal Medicine (IM) app |
| `packages/shared-signing` | Code that verifies signed renderer updates (see [06](./06-releases-and-updates.md)) |

**Why do `lib/`, `public/`, `scripts/`, `main.js` exist at the root?** They're **symlinks** into `packages/...`, kept so old paths (in docs, npm scripts, muscle memory) still work. `lib` *is* `packages/core/lib`. Edit either; it's the same file.

> 💡 The private apps `packages/hf` and `packages/neumo` are gitignored — they live in separate private repos but reuse `core`.

---

## 2. What happens when you launch R+

Open `packages/im/main.js` and search for `app.whenReady()`. Before and inside it, in order:

1. **Before ready** (runs as soon as the file loads)
   - Registers the custom `app://` URL scheme — the UI is served from `app://rplus/index.html`, straight from disk, not from a localhost server.
   - Grabs the **single-instance lock** — launching R+ twice just focuses the first window.
   - Reads `performance.json` (may disable GPU).
2. **`app.whenReady()`**
   1. `loadActiveModuleOrClear()` — if a signed *module update* (a newer UI bundle downloaded separately) is staged, re-verify its signature; otherwise clear it.
   2. `attachRendererProtocolHandler` — wires `app://rplus/...` to `packages/core/public` (or to the verified module, for the JS bundle).
   3. Update feed setup.
   4. `loadNativeDatabase()` — loads the native SQLCipher module. **If this fails the app shows an error and quits** — no DB, no app.
   5. `createDbManager` + `registerDbIpcHandlers` — registers every `db:*` IPC channel.
   6. `unlockClinicalDbAtStartup` — tries to unlock the encrypted DB in the background (retries a few times). If it fails, the UI just shows the unlock overlay.
   7. `verifyModuleBootOrRollback` — if a new UI module has crashed boot twice, roll back.
   8. `createWindow()` + `buildMenu()`.
3. **`createWindow()`** makes one 1280×900 `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false` (the security settings that force everything through the preload), loads `app://rplus/index.html`, maximizes on `ready-to-show`, and schedules an update check 1.5 s after load.
4. **On quit** (`before-quit`) it flushes Chromium storage first so "Recuérdame" (remember-me) tokens survive, with a 4 s hard deadline.

---

## 3. The doorway: preload + IPC

`packages/im/preload.js` does one thing:

```js
contextBridge.exposeInMainWorld('electronAPI', {
  generateDocument: function(opts) {
    return ipcRenderer.invoke('generate-document', opts);
  },
  // …~100 more
});
```

So in the UI, `window.electronAPI.generateDocument(...)` sends a message on the **channel** `'generate-document'`, and somewhere in main a matching `ipcMain.handle('generate-document', ...)` answers it.

Four IPC styles appear in the preload:

| Style | Renderer side | Main side | Used for |
|---|---|---|---|
| Request/response | `ipcRenderer.invoke` | `ipcMain.handle` | Almost everything (returns a Promise) |
| Fire-and-forget | `ipcRenderer.send` | `ipcMain.on` | `installUpdate`, `checkForUpdates` |
| Synchronous | `ipcRenderer.sendSync` | `ipcMain.on` + `returnValue` | Only `cloudSyncRememberGetSync` |
| Main → UI events | `ipcRenderer.on` | `webContents.send` | `update-available`, `shell-shortcut` |

**Where are the handlers?**
- A handful live directly in `main.js` (updater, `generate-document`, `save-exported-document`, `select-output-dir`, clipboard, `cloud-sync-fetch`).
- All database channels (`db:status`, `db:clinical-load-all`, …) are registered by `lib/db/ipc-handlers.mjs`, which fans out to `ipc-handlers-register-{core,guardia,teams,profile,interno,equipos-access,equipos-board,clinical-repo}.mjs`. Each is wrapped by `bindIpcHandler` (`lib/db/ipc-handlers-bind.mjs`), which turns a thrown error into `{ ok: false, … }` instead of a crash.

> 🧭 **To find any IPC channel end to end:** grep the channel string (e.g. `'db:clinical-load-all'`). You'll get exactly one `preload.js` line and one `handle(` line.

---

## 4. The UI side: how features plug in

### Page assembly
- You edit `public/index.src.html`, which pulls in `partials/` via `<!-- @include … -->`.
- `public/js/app.js` is the entry point. It imports every feature's **`windowHandlers`** (functions the feature wants callable from HTML), merges them, and does `Object.assign(window, allWindowHandlers)`.
- Then `public/js/app-runtimes.mjs` calls `registerXRuntime(ctx)` for each feature (e.g. `registerNotesIndicacionesRuntime`). **`ctx`** is a shared "runtime context" of getters and callbacks — features receive app state through it instead of importing each other directly. Some features are loaded lazily (`lazy-feature-routes.mjs`).

### How a click finds its function
R+'s Content Security Policy **forbids inline `onclick=`** (an XSS defence). So buttons are written as:

```html
<button data-onclick="previewNota" id="btn-gen">Generar Nota</button>
```

and `public/js/inline-action-dispatch.mjs` listens globally, reads `data-onclick`, looks up `window["previewNota"]` and calls it. That's why features export `windowHandlers`.

### Where to put new UI
`public/js/features/<name>/` (≈300 modules/folders live there: `cloud-sync/`, `patient-dashboard/`, `platform/`, `expediente/`, …), then register it in `app-runtimes.mjs`.

---

## 5. The build step (and why you never hand-edit bundles)

| Script | Input | Output (all gitignored) |
|---|---|---|
| `scripts/build-ui.mjs` | `index.src.html` + `partials/` + `styles/*.css` | `public/index.html`, `public/styles/app.bundle.css` (also fails on duplicate HTML `id`s) |
| `scripts/bundle-renderer.mjs` | `public/js/app.js` and everything it imports | `public/js/app.bundle.mjs`, `public/js/chunks/*`, `app.bundle.meta.json` (esbuild, ESM, code-split; minified with `--prod`) |

Both run automatically in `npm start` (`prestart`) and before `build:mac` / `build:win`. Anything you type into a generated file is **overwritten on the next start**. Edit sources; run `npm run build:ui`.

`--check` mode (`npm run build:ui:check`) verifies generated output is up to date without writing.

---

## 6. Worked example: "Generar Nota" → a `.docx` on disk

Follow this once with the files open and the whole architecture clicks.

| # | Where | What happens |
|---|---|---|
| 1 | `public/js/features/notes-indicaciones.mjs` | Renders `<button data-onclick="previewNota">Generar Nota</button>` |
| 2 | `inline-action-dispatch.mjs` | Click → `window.previewNota()` (put on `window` via the feature's `windowHandlers` → `app.js`) |
| 3 | `notes-indicaciones.mjs` → `previewDoc` | Opens the preview modal; its **Word** action calls `generateWord()` |
| 4 | `public/js/document-export-client.mjs` | `exportWithOutputDirFallback({url:'/generate', …})` maps `/generate` → kind `'note'` and calls `window.electronAPI.generateDocument({kind, payload})` |
| 5 | `preload.js` | → `ipcRenderer.invoke('generate-document', …)` — **crossing into main** |
| 6 | `main.js` `ipcMain.handle('generate-document')` | Lazy-loads `lib/doc-export-service.js`; `exportNoteDocx` fills the Word template and returns `{ok, fileName, buffer}` |
| 7 | back in renderer | Calls `electronAPI.saveExportedDocument({fileName, buffer})` → main writes to the approved output folder (with path-traversal checks) |
| 8 | renderer | Toast: *"Nota guardada: …"*. If the folder was missing, main asks for one (`select-output-dir`) and it retries |

How the template actually gets filled is in [03 · From pasted labs to a Word note](./03-labs-to-word.md).

---

## 7. Guard-rails you'll bump into

- **Module boundaries** (`.dependency-cruiser-boundaries.cjs`, enforced by `scripts/ci/module-boundaries.mjs` in `npm run metrics:check`): `core` may not import `im`/`hf`/`neumo`; app packages may import `core` but not each other.
- **No LAN imports** (`scripts/ci/forbid-lan-imports.mjs`): the old local-network sync (`lan-squad/`, "LiveSync") was **removed in 8.0.5**. Files like `lan-db-bridge.cjs` and `live-sync-room.mjs` are name fossils that now serve Nube.
- **Generated files are gitignored** — if git shows `app.bundle.mjs` changed, something's wrong.

---

## Check yourself

1. Why can't `public/js/app.js` just `require('fs')`?
2. You add a new `db:foo` channel. Which two files must change at minimum?
3. A button has `data-onclick="saveThing"` but nothing happens. What's the first thing to check?
4. You edited `public/index.html` and your change vanished. Why?

<details><summary>Answers</summary>

1. The renderer runs with `nodeIntegration: false` + `contextIsolation: true`; it only sees what the preload exposes.
2. `preload.js` (expose a method that `invoke`s it) and a `lib/db/ipc-handlers-register-*.mjs` file (the `handle`).
3. Whether `saveThing` is in some feature's `windowHandlers` and therefore on `window`.
4. It's generated by `scripts/build-ui.mjs` from `index.src.html` on every `npm start`.
</details>

**Next:** [03 · From pasted labs to a Word note →](./03-labs-to-word.md)
