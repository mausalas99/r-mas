# Team Handoff View — Shift Transition Support

**Date:** 2026-06-11  
**Target Release:** v8.0.6  
**Status:** Spec  
**Timeline:** 1 week

## Overview

Add a dedicated "Handoff" filter to the Pendientes tab that surfaces pendientes created by team members for incoming shift review, improving clinical communication and reducing dropped tasks during transitions.

## Problem

During shift changes (entrega/turnover):
- Outgoing team creates follow-up tasks but incoming team may miss them
- No centralized view of "what the last team needs me to do"
- Pendientes get lost in general list or rely on verbal communication
- Increased cognitive load during busy handoff periods

## Success Criteria

- **Handoff filter** appears in Pendientes tab alongside [All ▼] [Priority ▼]
- **Shows pendientes created by other team members** (not self)
- **Includes creator name** for attribution ("Created by Dr. Salas")
- **Visual distinction** for handoff items (subtle background/border)
- **Acknowledge action** moves pendiente to main "All" view
- **Works with existing LAN sync** — no new sync logic needed
- **Backward compatible** — existing pendientes work unchanged
- **Respects privacy** — only shows pendientes for patients user can access

## Data Model

Uses enhanced pendiente model from Time-Aware Pendientes spec:
- `createdBy`: string (user/team member who created it)
- `source.type`: includes 'handoff' as a source type
- All other fields unchanged

No new fields needed — leverages existing `createdBy` and `source` fields.

## UI Implementation

### Pendientes Tab Filter
```
┌───────────────────────────────────────────┐
│ Pendientes                                │
│ [All ▼] [Priority ▼] [Handoff]           │ ← NEW: Handoff filter
├───────────────────────────────────────────┤
```
- Clicking filter shows only pendientes where `createdBy !== currentUser`
- Default view remains "All" for backward compatibility

### Handoff View Display
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

**Features:**
- **Grouped by creator**: Shows "From Dr. Name (departing shift):" header
- **Creator attribution**: Each item shows who created it (in group header or item subtitle)
- **Standard pendiente display**: Shows due time, reminder icon, priority, text
- **Visual styling**: Slight background tint or left border to distinguish handoff view
- **Bulk acknowledge**: "Mark all as acknowledged" button

### Handoff Item Behavior
- **Checkbox**: Marks pendiente complete (same as main view)
- **Click item**: Opens edit form (same as main view)
- **Right-click**: Context menu (snooze, dismiss, edit, duplicate)
- **Acknowledge**: Special action that removes from handoff view but keeps in main view

### Acknowledge Action
When user clicks checkbox or acknowledges:
1. If in Handoff view: removes filter (item now appears in "All" view)
2. If item completed: behaves normally (completed items filtered out unless show completed)
3. Visual feedback: item fades or moves to indicate acknowledgment
- **No data change** — purely UI filtering, pendiente remains unchanged in storage

## Implementation Details

### Filter Logic
```javascript
// In pendientes list rendering:
const filteredTodos = todos.filter(todo => {
  switch (currentFilter) {
    case 'all': return true;
    case 'priority': return todo.priority === selectedPriority;
    case 'handoff': 
      return todo.createdBy && 
             todo.createdBy !== currentUserId && 
             !todo.completed; // optional: hide completed in handoff view
    default: return true;
  }
});
```

### Current User Identification
- Uses existing authentication/context mechanism
- `currentUserId` from `storage.getUser()` or similar
- Falls back to display name if ID unavailable

### Grouping Algorithm
```javascript
function groupHandoffTodos(todos) {
  const groups = {};
  todos.forEach(todo => {
    const creator = todo.createdBy || 'Unknown';
    if (!groups[creator]) groups[creator] = [];
    groups[creator].push(todo);
  });
  return Object.entries(groups).map(([creator, items]) => ({
    creator,
    items
  }));
}
```

### Styling Considerations
- **Handoff view background**: `var(--background-muted)` or `var(--border-color)` at 10% opacity
- **Creator header**: Smaller font, `var(--text-muted)` color
- **Item indentation**: Slight left margin to show grouping
- **Responsive**: Works on tablet and desktop layouts

## Integration with Entrega Workflow

### During Outgoing Shift
- Team creates pendientes as normal (manual, auto-detected, or event-triggered)
- `createdBy` automatically set to current user
- No special action needed — pendientes appear in handoff view for incoming team

### During Incoming Shift
- Open Pendientes tab → switch to "Handoff" filter
- Review list of tasks from departing team
- Acknowledge items by:
  - Completing them (checkbox)
  - Explicitly acknowledging (planned feature)
  - Editing if needed
- Once acknowledged, items appear in main "All" view with regular pendientes

### Shift Transition
- No explicit "end shift" button needed
- Handoff view dynamically shows pendientes not created by current user
- Works for any team member viewing at any time
- Particularly useful during actual shift changes

## LAN Sync Behavior
- **Preserved**: Pendientes already sync via existing LAN sync
- **No changes needed**: `createdBy` field syncs like any other field
- **Conflict resolution**: LWW on `updatedAt` works unchanged
- **Cross-team visibility**: If two teams on same LAN, each sees other's handoff items
- **Privacy**: Only shows pendientes for patients user has access to (existing filtering)

## Accessibility
- Filter announced as "Handoff filter, button"
- Group headers use appropriate heading level (h3 or h4)
- ARIA labels for acknowledge action
- Keyboard navigable (tab to filter, enter to activate)
- Screen reader announces when switching to handoff view

## Performance
- Filtering: O(n) operation on pendientes list (typically < 100 items)
- Grouping: O(n) operation, negligible
- No additional data storage or computation
- Reuses existing pendientes data structure

## Testing Strategy

### Unit Tests
- Filter logic (all, priority, handoff)
- Grouping algorithm (empty list, single creator, multiple creators)
- Current user detection (authenticated vs unauthenticated)

### Integration Tests
- Create pendiente as user A → login as user B → see in handoff view
- Acknowledge pendiente → moves to main view
- Filter persistence (stays on handoff view until changed)
- LAN sync: pendiente created on device A → appears in handoff view on device B
- Completed pendientes hidden from handoff view (if configured)

### E2E Tests
- Simulate shift change: user A creates follow-ups → user B logs in → reviews handoff
- Acknowledgement workflow: click item → complete/edit → verify view change
- Mixed filters: handoff + priority filtering works correctly
- Empty states: shows appropriate message when no handoff pendientes
- Text truncation: long creator names handled gracefully

## Open Questions

None — design is complete.

## Next Steps

1. User reviews and approves this spec
2. Create implementation plan
3. Implement and test