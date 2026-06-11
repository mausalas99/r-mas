# Time-Aware Pendientes — Due Dates, Times & Notifications

**Date:** 2026-06-11  
**Target Release:** v8.0.2  
**Status:** Spec  
**Timeline:** 2-3 weeks

## Overview

Extend the existing pendientes (todo) system with optional due dates, times, and notifications so doctors can create time-sensitive tasks that remind them when action is needed.

## Problem

Current pendientes:
- Text + priority only
- No notion of "when" something needs to happen
- Doctors forget to check pending items
- No automatic reminders for time-sensitive tasks

## Success Criteria

- **Create pendiente with due date/time in < 5 seconds**
- **Notifications fire at exact due time** (desktop + in-app toast)
- **Snooze functionality** (5min, 15min, 1hr, custom)
- **Overdue pendientes visually highlighted** in list
- **Backward compatible** — existing pendientes work unchanged
- **Works offline** — notifications fire when app is opened after due time

## Data Model Extension

### Current:
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

### Enhanced:
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
- All new fields optional with `null` defaults
- Existing pendientes work unchanged (no data migration needed on read)
- Writes populate new fields with sensible defaults

## UI Enhancements

### A. Pendiente Creation Form

#### Current:
Simple text input + priority dropdown

#### Enhanced:
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
- Custom (opens datetime picker)

**Reminder Options:**
- At due time
- 15 min before
- 1 hour before
- Custom

**Behavior:**
- Due date section collapsed by default (saves vertical space)
- Expand on click or when auto-detected pendiente has suggested time
- Enter key saves, Esc cancels

### B. Pendientes List UI

#### Enhanced Display:
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

**Sorting (Highest Priority First):**
1. Overdue (red background highlight)
2. Then by due time (soonest first)
3. Then by priority (urgent → high → medium → low)
4. Completed items at bottom (grayed out)

**Actions:**
- Click checkbox → mark complete
- Click item → edit in place
- Right-click → context menu (snooze, dismiss, edit, duplicate)

## Notifications

### Desktop Notifications (Electron)
- Uses Electron `Notification` API
- Shows when pendiente due time arrives
- Format:
  ```
  R+ Pendiente
  [Patient Name]: Check K+ result
  Due now
  ```
- Click notification → opens R+ and focuses pendiente
- Persists until user clicks or dismisses

### In-App Notifications
- Toast in top-right corner when app is active
- Non-blocking (auto-dismisses after 5s unless hovered)
- Badge count on Pendientes tab icon (shows overdue + due today)

### Settings
- Enable/disable desktop notifications (on by default)
- Snooze presets (5min, 15min, 1hr, custom)
- Quiet hours (e.g., 10pm - 6am) — suppress notifications
- Sound on/off for notifications
- Test notification button

## LAN Sync Integration

### Preserved Behavior
- Pendientes sync across devices via existing LAN sync
- LWW conflict resolution works unchanged
- Host/client mode unaffected

### Enhanced Fields Sync
- All new pendiente fields (`dueDate`, `reminder`, `source`, etc.) sync
- Completion status syncs immediately
- `completedAt` and `completedBy` track who finished what
- Notifications fire **locally** (not broadcast) — each device reminds its user

### Conflict Resolution
- LWW timestamp on `updatedAt` field
- If two users mark complete simultaneously, last write wins
- Both see completion (no data loss)
- If due dates conflict, later due date wins (more conservative)

## Technical Implementation

### Storage Layer Updates
- Modify `storage.getTodos()` and `storage.saveTodos()` to handle new fields
- Default values:
  - `createdBy`: current user from auth context
  - `dueDate`: `null`
  - `reminder`: `null`
  - `source`: `{type: 'manual', context: 'ui'}`
  - `completedAt`: `null`
  - `completedBy`: `null`

### Notification Scheduler
- Uses `setTimeout` for precise timing
- Stores pending notifications in memory (cleared on app restart)
- On startup, checks for overdue pendientes and fires immediate notifications
- Uses `requestIdleCallback` for non-urgent cleanup

### Service Worker Alternative Consideration
Rejected because:
- Needs precise timing (setTimeout is accurate enough)
- Would require complex message passing
- Electron app has full Node access, service worker unnecessary

## Accessibility
- All date/time inputs keyboard navigable
- ARIA labels for all interactive elements
- Respects `prefers-reduced-motion` for animation disabling
- Screen reader friendly notification announcements

## Performance
- Due date checking: O(n) scan every minute (acceptable for < 1000 pendientes)
- Notification scheduling: O(1) per pendiente creation/update
- Memory: < 5KB additional for typical user (< 50 pendientes)

## Testing

### Unit Tests
- Date/time parsing and validation
- Notification scheduling logic
- Snooze calculation
- Overdue detection
- Storage migration

### Integration Tests
- Pendiente creation → notification fire → completion
- Snooze behavior (multiple snoozes, edge cases)
- Cross-device sync of time fields
- Offline behavior (notification fires on app open)
- Quiet hours suppression

### E2E Tests
- Create pendiente with due time → wait → notification appears
- Click notification → focuses pendiente in UI
- Snooze via notification action button
- Overdue highlighting in list
- Completion updates sync correctly

## Open Questions

None — design is complete.

## Next Steps

1. User reviews and approves this spec
2. Create implementation plan
3. Implement and test