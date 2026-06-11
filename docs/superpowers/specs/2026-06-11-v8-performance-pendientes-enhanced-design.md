# R+ v8.0: Performance Overhaul + Enhanced Pendientes

**Date:** 2026-06-11  
**Target Release:** v8.0  
**Status:** Design  

## Overview

R+ v8.0 focuses on making the entire app buttery smooth while extending the existing Pendientes system with time-awareness and proactive reminders. This release addresses the LAN sync UI blocking issue and adds clinical memory capabilities without introducing new conceptual overhead for users.

## Goals

1. **Performance:** Buttery smooth interactions across the entire app, preserve premium animations
2. **Enhanced Pendientes:** Add due dates/times, notifications, auto-detection, and event triggers to existing patient task system
3. **Maintain Simplicity:** Doctors aren't programmers — zero new configuration, everything just works

## Success Criteria

### Performance
- App startup < 1.5s to first paint (currently ~3s)
- Tab switching < 150ms (currently 300-500ms)
- LAN sync operations never block UI
- Smooth 60fps scrolling in all lists (censo, labs, medicamentos)
- Animations remain smooth on all hardware

### Enhanced Pendientes
- Users can create pendientes with reminders in < 5 seconds
- Notifications fire reliably at due time
- Auto-detection suggests relevant pendientes without being annoying
- LAN sync remains seamless (P2P for small teams, host/client for large)

---

## Part 1: Performance Overhaul

### 1.1 LAN Sync (Non-Blocking)

**Current Problem:**
- LAN sync operations block the main thread
- UI freezes during patient data sync, lab updates, censo reconciliation
- Users feel lag during multi-user operations

**Solution:**

Move LAN sync to dedicated Web Workers:

```
public/js/workers/
  ├── lan-sync-worker.mjs       (orchestrator)
  ├── lan-sync-reconcile.mjs    (LWW merge logic)
  └── lan-sync-protocol.mjs     (network layer)
```

**Worker Responsibilities:**
- Network I/O (fetch/send updates)
- Data serialization/deserialization
- Conflict resolution (LWW)
- Protocol handling (host vs client vs P2P)

**Main Thread:**
- Receives final state updates via `postMessage`
- Applies updates to localStorage
- Re-renders affected UI components
- Sends user actions to worker

**Optimistic UI:**
- Show changes immediately on user action
- Worker confirms in background
- Rollback + toast on conflict (rare)

**Result:** LAN operations never block UI, even on slow networks.

---

### 1.2 Hybrid P2P Architecture

**Strategy:** Auto-detect team size and use optimal sync mode.

**Small Teams (≤5 devices):**
- Use WebRTC data channels for P2P mesh
- Direct peer-to-peer communication (no central bottleneck)
- Lower latency, better scaling
- Host still persists to disk

**Large Teams (>5 devices):**
- Use existing host/client model
- Host broadcasts to all clients
- Proven, simpler coordination

**User Experience:**
- Zero configuration — auto-detected
- "Connect to shift" stays the same (PIN entry)
- Doctors see no difference; it just works faster

**Implementation:**
- Worker detects peer count on connection
- Switches mode transparently
- Host always writes to disk (authoritative source)

**Result:** Faster sync for small teams, scales to large rounds, remains simple.

---

### 1.3 Module Lazy Loading

**Current Problem:**
- Chart.js (161KB) and all features load at startup
- Users wait for code they might not use this session

**Solution:**

Split into chunks:

**Always Loaded (Core):**
- App shell
- Storage layer
- Patient list
- Navigation
- Basic UI components

**Lazy Loaded:**
- **Lab Module:** `labs.js`, parsers, lab-history (load on Laboratorio tab)
- **Charts Module:** Chart.js, tendencias, estado-actual-charts (load on first chart render)
- **Manejo Module:** electrolitos, infusiones, ATB, CAD (load on Manejo open)
- **LAN Module:** discovery, host, client, P2P (load when joining/hosting)
- **VPO Module:** calculators, templates (load on VPO open)

**Implementation:**
- Use dynamic `import()` at feature boundaries
- Show skeleton UI while module loads (< 100ms on local disk)
- Cache loaded modules for session lifetime

**Result:** ~60% faster startup, only load what you use.

---

### 1.4 Virtualized Lists

**Current Problem:**
- Censo with 50+ patients renders all DOM nodes
- Lab history with 100+ entries lags on scroll
- Long lists cause jank

**Solution:**

Implement virtual scrolling:
- Only render visible items + small buffer (10-15 items)
- Reuse DOM nodes as user scrolls
- Maintain scroll position and selection

**Target Lists:**
- Censo patient list
- Lab history (Laboratorio → Historial)
- Medicamentos receta grid
- Eventualidades timeline
- Estado Actual measurement history
- Pendientes list (when 50+ items)

**Library:** Custom implementation (lightweight, ~200 LOC) — avoid heavy dependencies.

**Result:** Smooth 60fps scrolling regardless of list length.

---

### 1.5 Optimistic UI Updates

**Current Problem:**
- Save operations block until localStorage write completes
- User sees spinner while data persists
- Feels sluggish even though writes are fast

**Solution:**

Show UI changes immediately, persist asynchronously:

**Operations:**
- Save nota/indicaciones
- Add lab to history
- Update estado actual snapshot
- Create/edit medicamentos
- Patient demographic changes
- Create/update pendientes

**Flow:**
1. User action → UI updates immediately
2. Async persist to localStorage
3. Subtle confirmation toast on success (< 1s)
4. Rollback + error toast on failure (rare)

**Result:** Instant feedback, app feels responsive.

---

### 1.6 Animation Optimization

**Current Problem:**
- Premium UI animations (motion presets) might cause jank on older hardware
- Transitions trigger layout recalculations

**Solution:**

Audit all animations to use GPU-accelerated properties:

**Fast Properties (use these):**
- `transform: translate/scale/rotate`
- `opacity`

**Slow Properties (avoid these):**
- `width`, `height`
- `top`, `left`, `margin`, `padding`

**Optimizations:**
- Add `will-change` hints for known animation targets
- Use CSS containment (`contain: layout`) for animated sections
- Respect `prefers-reduced-motion` for accessibility
- Keep motion preset system (Sobrio/Mixto/Expresivo) but optimize implementations

**Result:** Smooth 60fps animations on all hardware, accessibility-compliant.

---

### 1.7 Performance Monitoring

**Implementation:**

Add performance markers to key user journeys:

**Tracked Journeys:**
- App startup → first paint
- Open patient → data loaded
- Switch tabs → content rendered
- Save nota → confirmed
- LAN sync round-trip
- Scroll performance (censo, labs)

**Dev Mode:**
- Console summary after each journey
- Performance budgets shown with pass/fail

**Performance Budgets:**
- App startup: < 1.5s to first paint
- Tab switch: < 150ms
- Save operation: < 100ms (perceived)
- LAN sync: no UI impact (background worker)
- Scroll: stable 60fps

**Production:**
- Markers present but no logging (can be enabled in Settings → Advanced)

**Result:** Measurable performance, prevent regressions.

---

## Part 2: Enhanced Pendientes

### 2.1 Current State

**Existing Pendientes Features:**
- Patient-specific todos
- Priority selection (low/medium/high/urgent)
- Syncs via LAN
- No due dates/times
- No notifications

**What We're Adding:**
- Optional due dates/times
- Desktop + in-app notifications
- Auto-detection from nota/indicaciones text
- Event-triggered pendientes (critical labs, etc.)
- Team handoff view

---

### 2.2 Data Model Extension

**Current:**
```javascript
{
  id: string,
  patientId: string,
  text: string,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  completed: boolean,
  createdAt: timestamp
}
```

**Enhanced:**
```javascript
{
  id: string,
  patientId: string,
  text: string,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  completed: boolean,
  createdAt: timestamp,
  createdBy: string,              // NEW: user/team member
  
  // NEW: Optional time-awareness
  dueDate: timestamp | null,      // when pendiente is due
  reminder: {
    enabled: boolean,
    time: timestamp               // when to notify (defaults to dueDate)
  } | null,
  
  // NEW: Source tracking
  source: {
    type: 'manual' | 'auto-detected' | 'event-triggered' | 'handoff',
    context: string               // where it came from
  },
  
  // NEW: Completion tracking
  completedAt: timestamp | null,
  completedBy: string | null
}
```

**Migration:**
- Existing pendientes work unchanged (all new fields are optional)
- No data loss on upgrade

---

### 2.3 UI Enhancements

#### A. Pendiente Creation Form

**Current:** Simple text input + priority dropdown

**Enhanced:**

```
┌─────────────────────────────────────┐
│ Add Pendiente                       │
├─────────────────────────────────────┤
│ What needs to be done?              │
│ ┌─────────────────────────────────┐ │
│ │ Check K+ result                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Priority: [Medium ▼]                │
│                                     │
│ ⏰ Due date (optional)              │ ← NEW, collapsed by default
│ ┌──────────────┐ ┌──────────────┐  │
│ │ Today ▼      │ │ 6:00 PM ▼    │  │
│ └──────────────┘ └──────────────┘  │
│                                     │
│ 🔔 Remind me: [At due time ▼]      │ ← NEW, shows if due date set
│                                     │
│ [Cancel]              [Save]        │
└─────────────────────────────────────┘
```

**Quick Presets for Due Date:**
- Today 6pm
- Tomorrow 8am
- In 3 hours
- In 24 hours
- Custom

**Reminder Options:**
- At due time
- 15 min before
- 1 hour before
- Custom

**Behavior:**
- Due date is collapsed by default (keep simple for users who don't need it)
- Expand on click or when auto-detected pendiente has suggested time
- Enter key saves, Esc cancels

---

#### B. Pendientes List UI

**Enhanced Display:**

```
┌───────────────────────────────────────────┐
│ Pendientes                                │
│ [All ▼] [Priority ▼] [Handoff]           │ ← NEW: Handoff filter
├───────────────────────────────────────────┤
│ □ Review abnormal K+ (6.2)           🔴  │ ← Urgent
│   Due today at 6:00 PM 🔔                 │ ← NEW: due time + reminder
│   Auto-detected from labs                 │ ← NEW: source
│                                           │
│ □ Follow up renal consult              🟡 │ ← High
│   Due tomorrow at 8:00 AM 🔔              │
│   Created by Dr. Salas                    │ ← NEW: handoff tracking
│                                           │
│ ☑ Check vitals                         🟢 │ ← Completed
│   Completed 10 min ago                    │
└───────────────────────────────────────────┘
```

**Icons:**
- 🔔 = Has reminder enabled
- 🔴🟡🟢⚪ = Priority (urgent/high/medium/low)

**Sorting:**
- Overdue first (red highlight)
- Then by due time (soonest first)
- Then by priority
- Completed items at bottom

**Actions:**
- Click checkbox → mark complete
- Click item → edit
- Right-click → context menu (snooze, dismiss, edit)

---

#### C. Notifications

**Desktop Notifications:**
- Uses Electron `Notification` API
- Shows when pendiente due time arrives
- Format:
  ```
  R+ Pendiente
  [Patient Name]: Check K+ result
  Due now
  ```
- Click notification → opens R+ and focuses pendiente

**In-App Notifications:**
- Toast in top-right corner when app is active
- Non-blocking (auto-dismisses after 5s unless hovered)
- Badge count on Pendientes tab icon

**Settings:**
- Enable/disable desktop notifications
- Snooze presets (5min, 15min, 1hr, custom)
- Quiet hours (e.g., 10pm - 6am)
- Sound on/off

---

### 2.4 Auto-Detection from Text

**Trigger:** When saving nota or indicaciones

**Detection Patterns:**
```javascript
// Simple regex patterns (no ML required)
const patterns = [
  /pending\s+(.+)/i,
  /follow\s*up\s+(.+)/i,
  /check\s+(.+?)\s+(tomorrow|today|in\s+\d+\s+hours?)/i,
  /awaiting\s+(.+)/i,
  /repeat\s+(.+?)\s+in\s+\d+/i
];
```

**User Flow:**

1. User saves nota with text: "Pending renal consult result, check tomorrow"
2. R+ detects pattern → shows toast suggestion:
   ```
   ┌───────────────────────────────────┐
   │ 📋 Create pendiente?              │
   │ "Follow up: Renal consult result" │
   │ Due: Tomorrow 8:00 AM             │
   │                                   │
   │ [Dismiss] [Edit] [Create]         │
   └───────────────────────────────────┘
   ```
3. User clicks:
   - **Create:** Adds pendiente as suggested
   - **Edit:** Opens form with pre-filled values
   - **Dismiss:** Ignores suggestion (won't suggest again for this text)

**Settings:**
- Toggle: Enable auto-detection (on by default)
- Dismissed suggestions don't reappear

**Result:** Proactive but not annoying — user stays in control.

---

### 2.5 Event-Triggered Pendientes

**Triggers:**

**A. Critical Lab Values**
- Lab result with critical value (K+ > 6.0, Na < 120, etc.)
- Auto-creates urgent pendiente: "Review abnormal K+ (6.2)"
- Due: immediately (shows as overdue)
- Links to lab result

**B. Medication Changes**
- Medication with tapering schedule added
- Auto-creates pendiente: "Adjust prednisone dose (taper day 3)"
- Due: at taper date/time

**C. Pending Culture Results**
- Culture lab added to Estado Actual
- Auto-creates pendiente: "Check culture result (48h)"
- Due: 48 hours from culture time

**Configuration:**
- Settings panel: enable/disable each trigger type
- Default rules for common scenarios
- Users can customize thresholds (e.g., what counts as "critical")

**User Control:**
- All auto-created pendientes can be dismissed
- User can disable triggers entirely in Settings

---

### 2.6 Team Handoff View

**Location:** Pendientes tab → new filter: **"Handoff"**

**Purpose:** Surface pendientes created by team members for incoming shift.

**Display:**
```
┌───────────────────────────────────────────┐
│ Pendientes › Handoff                      │
├───────────────────────────────────────────┤
│ From Dr. Salas (departing shift):         │
│                                           │
│ □ Review K+ result — Due 6pm           🔴 │
│ □ Follow up renal consult — Tomorrow   🟡 │
│ □ Check vitals q4h — Ongoing           🟢 │
│                                           │
│ [Mark all as acknowledged]                │
└───────────────────────────────────────────┘
```

**Integration:**
- During Entrega workflow, departing team creates pendientes
- Incoming team sees them in Handoff view
- Once acknowledged, pendientes move to main "All" view

**LAN Sync:**
- Pendientes already sync via LAN
- No new sync logic needed
- `createdBy` field tracks handoff source

---

### 2.7 LAN Sync Integration

**Existing Behavior (Preserved):**
- Pendientes sync across devices
- LWW conflict resolution
- Works in host/client mode

**Enhanced with P2P:**
- Small teams (≤5): P2P mesh for faster sync
- Large teams (>5): host/client as before
- Auto-detected, zero configuration

**Sync Fields:**
- All pendiente fields (including new ones)
- Completion status syncs immediately
- Notifications fire locally (not broadcast)

**Conflict Resolution:**
- LWW timestamp on `updatedAt` field
- If two users mark complete simultaneously, last write wins
- Both see completion (no data loss)

---

## Part 3: Implementation Plan

### Phase 1: Performance Foundation (4-6 weeks)

**Week 1-2: LAN Sync Worker**
- Create `public/js/workers/lan-sync-worker.mjs`
- Extract network I/O from main thread
- LWW reconciliation in worker
- Main thread receives state updates via `postMessage`
- Test: LAN sync doesn't block UI during heavy operations

**Week 2-3: Hybrid P2P**
- Implement WebRTC data channels for P2P
- Auto-detect team size (≤5 = P2P, >5 = host/client)
- Host always persists to disk
- Test: P2P mode faster than host/client for small teams

**Week 3-4: Lazy Loading**
- Split code into chunks (core, lab, charts, manejo, lan, vpo)
- Dynamic `import()` at feature boundaries
- Skeleton UI during module load
- Test: App startup < 1.5s

**Week 4-5: Virtualized Lists**
- Implement virtual scroll for censo, lab history, medicamentos
- Reuse DOM nodes on scroll
- Maintain selection and scroll position
- Test: 60fps scrolling with 500+ items

**Week 5-6: Optimistic UI + Animation Audit**
- Async localStorage writes with instant UI feedback
- Audit animations → use GPU-accelerated properties only
- Add `will-change` hints
- Test: All animations 60fps on older hardware

**Week 6: Performance Monitoring**
- Add markers to key journeys
- Dev mode console summary
- Performance budgets enforcement
- Test: All budgets pass

---

### Phase 2: Enhanced Pendientes (4-6 weeks)

**Week 1: Data Model + Storage**
- Extend pendiente schema (due date, reminder, source, etc.)
- Migration for existing pendientes (backward compatible)
- Update localStorage layer
- Test: Existing pendientes work unchanged

**Week 2: Creation UI**
- Add due date/time fields (collapsed by default)
- Reminder options
- Quick presets (Today 6pm, Tomorrow 8am, etc.)
- Test: Create pendiente with reminder in < 5 seconds

**Week 3: List UI + Sorting**
- Display due time, reminder icon, source
- Sort by overdue → due time → priority
- Handoff filter
- Test: Overdue pendientes always at top

**Week 4: Notifications**
- Desktop notifications (Electron API)
- In-app toast
- Badge count on tab icon
- Settings panel
- Test: Notification fires at exact due time

**Week 5: Auto-Detection**
- Regex patterns for nota/indicaciones text
- Suggestion toast on save
- Dismiss tracking (don't suggest again)
- Settings toggle
- Test: Detect "pending consult" and suggest pendiente

**Week 6: Event Triggers**
- Critical lab trigger
- Medication taper trigger
- Culture result trigger
- Configuration panel
- Test: Critical K+ auto-creates urgent pendiente

---

### Phase 3: Integration & Polish (2 weeks)

**Week 1: Integration**
- Hook auto-detection into nota/indicaciones save flow
- Hook event triggers into Laboratorio, Medicamentos, Estado Actual
- Handoff workflow in Entrega view
- Test: End-to-end user journey (create → notify → complete)

**Week 2: Testing & Documentation**
- LAN sync stress test (10+ devices, P2P vs host/client)
- Performance regression tests
- Update user documentation
- Release notes
- Test: No performance degradation vs. v7.3.2

---

**Total Timeline:** 12-14 weeks for complete v8.0

---

## Technical Considerations

### Web Worker Compatibility
- Web Workers have no access to DOM
- Use `postMessage` for all communication
- Serialize data (no functions/closures)
- Error handling: worker crashes → main thread detects and restarts

### WebRTC for P2P
- Requires STUN/TURN server for NAT traversal (can use public STUN servers)
- Fallback to host/client if P2P fails to establish
- Mesh topology for small teams (everyone connects to everyone)

### Notification Permissions
- Request permission on first pendiente with reminder
- Graceful degradation if user denies (in-app only)
- Settings toggle to re-request permission

### Performance Budget Enforcement
- CI can fail build if budgets exceeded (optional, dev-only)
- Use Lighthouse CI for automated checks

### Backward Compatibility
- All new pendiente fields are optional
- Existing pendientes work unchanged
- Migration adds new fields with `null` defaults

---

## Open Questions

None — design is complete pending user review.

---

## Next Steps

1. User reviews this spec document
2. If approved, create implementation plan (detailed task breakdown)
3. Create feature branch: `feature/v8-performance-pendientes`
4. Begin Phase 1 implementation
