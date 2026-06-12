# R+ Refactor: Systematic Modularization and Code Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systematically refactor the R+ codebase to reduce file/function complexity, improve performance, enhance maintainability, and modernize the tech stack by breaking down monolithic files into focused, well-bounded modules.

**Architecture:** Modularization-first approach that breaks down large files into smaller, single-responsibility modules while maintaining existing functionality. Establishes clear module boundaries with well-defined interfaces, follows existing codebase patterns, and creates foundation for future architectural improvements.

**Tech Stack:** Electron 41, ES Modules, SQLCipher, Chart.js, Express, Node.js, better-sqlite3-multiple-ciphers

---

## File Structure

### Task 1: Create Application Bootstrap Module

**Files:**
- Create: `public/js/app-bootstrap.mjs`
- Modify: `public/index.html`
- Test: Manual verification through `npm start`

- [ ] **Step 1: Analyze current index.html to identify initialization code**

```bash
grep -n "addEventListener\|DOMContentLoaded\|app-runtimes\|app-state\|clinical-access-runtime" public/index.html
```

- [ ] **Step 2: Extract initialization logic to app-bootstrap.mjs**

```javascript
// public/js/app-bootstrap.mjs
import { registerFeatures } from './app-runtimes.mjs';
import { hydrateAppState } from './app-state.mjs';
import { initializeClinicalAccess } from './clinical-access-runtime.mjs';

/**
 * Bootstrap the R+ application
 * Initializes app state, registers features, and starts the application
 */
export function bootstrapApplication() {
  // Hydrate application state from storage
  hydrateAppState();
  
  // Register all UI features
  registerFeatures();
  
  // Initialize clinical access runtime
  initializeClinicalAccess();
  
  // Additional initialization can be added here
}

// Auto-bootstrap when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApplication);
} else {
  bootstrapApplication();
}
```

- [ ] **Step 3: Update index.html to remove inline initialization and import bootstrap**

```html
<!-- Before -->
<script type="module" src="./js/app-state.mjs"></script>
<script type="module" src="./js/app-runtimes.mjs"></script>
<script type="module" src="./js/clinical-access-runtime.mjs"></script>
<!-- ... other imports ... -->
<script type="module">
  // Inline initialization code to be removed
</script>

<!-- After -->
<script type="module" src="./js/app-state.mjs"></script>
<script type="module" src="./js/app-runtimes.mjs"></script>
<script type="module" src="./js/clinical-access-runtime.mjs"></script>
<!-- ... other imports ... -->
<script type="module" src="./js/app-bootstrap.mjs"></script>
```

- [ ] **Step 4: Verify application starts correctly**

Run: `npm start`
Expected: Application launches successfully with all tabs functional

- [ ] **Step 5: Commit changes**

```bash
git add public/js/app-bootstrap.mjs public/index.html
git commit -m "feat: create application bootstrap module to reduce index.html complexity"
```

### Task 1: Create Application Bootstrap Module

**Files:**
- Create: `public/js/app-bootstrap.mjs`
- Modify: `public/index.html`
- Test: Manual verification through `npm start`

- [ ] **Step 1: Analyze current index.html to identify initialization code**

```bash
grep -n "addEventListener\|DOMContentLoaded\|app-runtimes\|app-state\|clinical-access-runtime" public/index.html
```

- [ ] **Step 2: Extract initialization logic to app-bootstrap.mjs**

```javascript
// public/js/app-bootstrap.mjs
import { registerFeatures } from './app-runtimes.mjs';
import { hydrateAppState } from './app-state.mjs';
import { initializeClinicalAccess } from './clinical-access-runtime.mjs';

/**
 * Bootstrap the R+ application
 * Initializes app state, registers features, and starts the application
 */
export function bootstrapApplication() {
  // Hydrate application state from storage
  hydrateAppState();
  
  // Register all UI features
  registerFeatures();
  
  // Initialize clinical access runtime
  initializeClinicalAccess();
  
  // Additional initialization can be added here
}

// Auto-bootstrap when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApplication);
} else {
  bootstrapApplication();
}
```

- [ ] **Step 3: Update index.html to remove inline initialization and import bootstrap**

```html
<!-- Before -->
<script type="module" src="./js/app-state.mjs"></script>
<script type="module" src="./js/app-runtimes.mjs"></script>
<script type="module" src="./js/clinical-access-runtime.mjs"></script>
<!-- ... other imports ... -->
<script type="module">
  // Inline initialization code to be removed
</script>

<!-- After -->
<script type="module" src="./js/app-state.mjs"></script>
<script type="module" src="./js/app-runtimes.mjs"></script>
<script type="module" src="./js/clinical-access-runtime.mjs"></script>
<!-- ... other imports ... -->
<script type="module" src="./js/app-bootstrap.mjs"></script>
```

- [ ] **Step 4: Verify application starts correctly**

Run: `npm start`
Expected: Application launches successfully with all tabs functional

- [ ] **Step 5: Commit changes**

```bash
git add public/js/app-bootstrap.mjs public/index.html
git commit -m "feat: create application bootstrap module to reduce index.html complexity"
```

Before defining tasks, here is the map of files to be created or modified and their responsibilities:

### Renderer (public/js/)
- **Create:** `public/js/app-bootstrap.mjs` - Application initialization and feature registration
- **Create:** `public/js/templates/` directory - HTML templates extracted from index.html
  - `public/js/templates/expediente.mjs` - Expediente tab content
  - `public/js/templates/lan.mjs` - LAN tab content
  - `public/js/templates/patients.mjs` - Patients tab content
  - `public/js/templates/settings.mjs` - Settings tab content
- **Modify:** `public/index.html` - Reduced to shell with template placeholders
- **Create:** `public/js/features/labs/services/` directory - Lab processing services
  - `public/js/features/labs/services/table-service.mjs` - Labs table data processing
  - `public/js/features/labs/services/parse-service.mjs` - Lab result parsing logic
  - `public/js/features/labs/services/history-service.mjs` - Lab history management
- **Create:** `public/js/features/lan/services/` directory - LAN sync services
  - `public/js/features/lan/services/transport-service.mjs` - LAN transport layer
  - `public/js/features/lan/services/persistence-service.mjs` - LAN persistence handling
  - `public/js/features/lan/services/conflict-service.mjs` - Conflict resolution logic
- **Modify:** Existing feature files to delegate to services:
  - `public/js/features/lan/panel.mjs` - Reduced to UI coordination only
  - `public/js/features/tendencias.mjs` - Reduced to UI coordination only
  - `public/js/labs-some-table.mjs` - Reduced to UI component only
  - `public/js/labs-procesar.mjs` - Reduced to UI coordination only

### Main Process (main.js, server.js)
- **Create:** `lib/services/` directory - Main process business logic services
  - `lib/services/update-service.mjs` - Auto-update and downgrade logic
  - `lib/services/lan-service.mjs` - LAN server lifecycle management
  - `lib/services/window-service.mjs` - BrowserWindow management
  - `lib/services/ipc-service.mjs` - IPC handler registration and routing
- **Modify:** `main.js` - Reduced to service initialization and lifecycle
- **Modify:** `server.js` - Reduced to Express route setup and middleware

### Infrastructure
- **Create:** `lib/utils/` directory - Shared utility functions
  - `lib/utils/logger.mjs` - Centralized logging
  - `lib/utils/performance.mjs` - Performance monitoring helpers
  - `lib/utils/validation.mjs` - Input validation helpers
- **Modify:** `scripts/build-ui.mjs` - Updated to handle new template structure
- **Modify:** `package.json` - Updated build scripts if needed

Each file has one clear responsibility:
- Bootstrap files: Application startup and coordination
- Template files: UI rendering only
- Service files: Business logic and data processing
- Utility files: Shared helper functions
- Main process files: Process lifecycle and service coordination

Files that change together live together (e.g., lab-related services in labs/services/). This structure supports the task decomposition into bite-sized, self-contained changes.

## File Structure

Before defining tasks, here is the map of files to be created or modified and their responsibilities:

### Renderer (public/js/)
- **Create:** `public/js/app-bootstrap.mjs` - Application initialization and feature registration
- **Create:** `public/js/templates/` directory - HTML templates extracted from index.html
  - `public/js/templates/expediente.mjs` - Expediente tab content
  - `public/js/templates/lan.mjs` - LAN tab content
  - `public/js/templates/patients.mjs` - Patients tab content
  - `public/js/templates/settings.mjs` - Settings tab content
- **Modify:** `public/index.html` - Reduced to shell with template placeholders
- **Create:** `public/js/features/labs/services/` directory - Lab processing services
  - `public/js/features/labs/services/table-service.mjs` - Labs table data processing
  - `public/js/features/labs/services/parse-service.mjs` - Lab result parsing logic
  - `public/js/features/labs/services/history-service.mjs` - Lab history management
- **Create:** `public/js/features/lan/services/` directory - LAN sync services
  - `public/js/features/lan/services/transport-service.mjs` - LAN transport layer
  - `public/js/features/lan/services/persistence-service.mjs` - LAN persistence handling
  - `public/js/features/lan/services/conflict-service.mjs` - Conflict resolution logic
- **Modify:** Existing feature files to delegate to services:
  - `public/js/features/lan/panel.mjs` - Reduced to UI coordination only
  - `public/js/features/tendencias.mjs` - Reduced to UI coordination only
  - `public/js/labs-some-table.mjs` - Reduced to UI component only
  - `public/js/labs-procesar.mjs` - Reduced to UI coordination only

### Main Process (main.js, server.js)
- **Create:** `lib/services/` directory - Main process business logic services
  - `lib/services/update-service.mjs` - Auto-update and downgrade logic
  - `lib/services/lan-service.mjs` - LAN server lifecycle management
  - `lib/services/window-service.mjs` - BrowserWindow management
  - `lib/services/ipc-service.mjs` - IPC handler registration and routing
- **Modify:** `main.js` - Reduced to service initialization and lifecycle
- **Modify:** `server.js` - Reduced to Express route setup and middleware

### Infrastructure
- **Create:** `lib/utils/` directory - Shared utility functions
  - `lib/utils/logger.mjs` - Centralized logging
  - `lib/utils/performance.mjs` - Performance monitoring helpers
  - `lib/utils/validation.mjs` - Input validation helpers
- **Modify:** `scripts/build-ui.mjs` - Updated to handle new template structure
- **Modify:** `package.json` - Updated build scripts if needed

Each file has one clear responsibility:
- Bootstrap files: Application startup and coordination
- Template files: UI rendering only
- Service files: Business logic and data processing
- Utility files: Shared helper functions
- Main process files: Process lifecycle and service coordination

Files that change together live together (e.g., lab-related services in labs/services/). This structure supports the task decomposition into bite-sized, self-contained changes.