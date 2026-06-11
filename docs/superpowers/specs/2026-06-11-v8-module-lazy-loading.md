# Module Lazy Loading — Faster Startup & On-Demand Loading

**Date:** 2026-06-11  
**Target Release:** v8.0.3  
**Status:** Spec  
**Timeline:** 1-2 weeks

## Overview

Split the monolithic JavaScript bundle into lazy-loaded chunks so the app starts faster (~60% improvement) and only loads code when the user actually needs that feature.

## Problem

Currently, all features load at startup:
- Chart.js (161KB) loads even if user never opens Laboratorio tab
- All feature code (~350KB JS) parses and executes on launch
- Users wait for code they might not use this session
- Startup time: ~3s to first paint on typical hardware

## Success Criteria

- **App startup < 1.5s to first paint** (currently ~3s)
- **Only load what you use** — features load on first access
- **Skeleton UI during load** (< 100ms delay acceptable)
- **No functional changes** — all features work exactly as before
- **Cached for session lifetime** — no re-download during session
- **Graceful degradation** — works if dynamic import fails

## Architecture

### Chunk Strategy

**Always Loaded (Core - ~90KB):**
- App shell (index.html bootstrap)
- Storage layer (localStorage/SQLCipher bridge)
- Patient list (censo basic rendering)
- Navigation (tab switching)
- Basic UI components (buttons, inputs, modals)
- Authentication / user context
- Error handling / logging

**Lazy Loaded Chunks:**
1. **Lab Module** (`labs.js` + parsers + lab-history) - load on Laboratorio tab
2. **Charts Module** (Chart.js + tendencias + estado-actual-charts) - load on first chart render
3. **Manejo Module** (electrolitos, infusiones, ATB, CAD calculators) - load on Manejo open
4. **LAN Module** (discovery, host, client, P2P sync) - load when joining/hosting LAN
5. **VPO Module** (calculators, templates) - load on VPO open

### Implementation Approach

**Dynamic Import Pattern:**
```javascript
// Instead of:
// import { renderLabs } from './labs.mjs';
// renderLabs(data);

// Use:
const { renderLabs } = await import('./labs.mjs');
renderLabs(data);
```

**Loading States:**
1. Show skeleton/placeholder UI immediately
2. Start dynamic import in background
3. Replace skeleton with real UI when module loads
4. Show error fallback if import fails (with retry option)

**Cache Strategy:**
- Browser HTTP cache handles module caching
- Service worker not needed (modules small, infrequent load)
- Modules cached for session lifetime via standard HTTP caching

### Specific Chunk Boundaries

#### Lab Module (`public/js/labs.mjs` export)
Exports: `renderLabs`, `parseLabValue`, `labHistoryToChartData`, `getReferenceRanges`
Dependencies: `storage.js`, `utils/formatters.mjs`

#### Charts Module (`public/js/charts.mjs` export)
Exports: `renderTendencias`, `renderEstadoActualCharts`, `Chart` (Chart.js instance)
Dependencies: Chart.js library (161KB), `storage.js`

#### Manejo Module (`public/js/manejo.mjs` export)
Exports: `calculateElectrolitos`, `calculateInfusionRate`, `calculateATBDose`, `calculateCADScore`
Dependencies: `storage.js`, clinical constants

#### LAN Module (`public/js/lan.mjs` export)
Exports: `joinLanRoom`, `hostLanRoom`, `getLanPeers`, `sendLanMessage`
Dependencies: WebRTC (for P2P), existing sync logic

#### VPO Module (`public/js/vpo.mjs` export)
Exports: `calculateVpo`, `renderVpoTemplate`, `getVpoHistory`
Dependencies: `storage.js`, template parsing

## UI Integration Points

### Tab-Based Loading
```javascript
// In tab switch handler:
async function switchToTab(tabId) {
  showTabSpinner(tabId);
  
  switch (tabId) {
    case 'laboratorio':
      const labModule = await import('./labs.mjs');
      labModule.renderLabs(currentPatient);
      break;
    case 'manejo':
      const manejoModule = await import('./manejo.mjs');
      manejoModule.renderManejoPanel(currentPatient);
      break;
    // ... other tabs
  }
  
  hideTabSpinner();
}
```

### Feature-Based Loading
```javascript
// In chart rendering function:
async function renderTrendChart(data) {
  const chartsModule = await import('./charts.mjs');
  return chartsModule.renderTendencias(data);
}
```

### Preloading Strategy (Optional)
For predictable navigation, can prefetch:
```javascript
// Hover over tab -> prefetch module
tabElement.addEventListener('mouseenter', () => {
  if (tabId === 'laboratorio') {
    import('./labs.mjs').catch(() => {}); // silent prefetch
  }
});
```

## Loading UI Patterns

### Skeleton Screens
- Laboratorio tab: Show patient info + empty lab table skeleton
- Charts: Show axis labels + loading spinner in chart area
- Manejo: Show empty calculator forms with placeholder values

### Error Handling
If import fails:
1. Show error toast: "Failed to load Lab module"
2. Offer retry button
3. Fallback to static view if possible (e.g., show last cached lab data)
4. Log error to monitoring

## Performance Metrics

### Expected Improvements
- **Startup time**: 3.0s → 1.2s (60% faster)
- **Main thread work at startup**: Reduced by ~40% (parsing/execution)
- **Network bandwidth**: Same total, but spread out over session
- **Memory usage**: Similar peak, better initial footprint

### Measurement
Track via performance markers:
- `appStart` → `firstPaint` (target: < 1500ms)
- `tabSwitch` → `contentReady` (target: < 300ms with module cache)
- `featureFirstUse` → `uiReady` (target: < 100ms for cached modules)

## Backward Compatibility
- No changes to public APIs or data formats
- Existing bookmarks/deep links still work (will show loading state then content)
- Server-side rendering unaffected (this is client-only)
- All existing tests should pass unchanged

## Testing Strategy

### Unit Tests
- Dynamic import resolves to correct module
- Error handling when module fails to load
- Skeleton UI shows during load
- Content replaces skeleton after load

### Integration Tests
- Tab switching triggers correct module load
- Multiple rapid tab switches don't cause duplicate loads
- Module caching works (second load is instant)
- Error recovery and retry functionality

### Performance Tests
- Measure startup time with/without lazy loading
- Network waterfall shows staggered chunk loading
- Memory profiling shows reduced initial JS heap

## Open Questions

None — design is complete.

## Next Steps

1. User reviews and approves this spec
2. Create implementation plan
3. Implement and test