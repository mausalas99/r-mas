# Auto-Detection & Event Triggers — Smart Pendiente Creation

**Date:** 2026-06-11  
**Target Release:** v8.0.5  
**Status:** Spec  
**Timeline:** 2-3 weeks

## Overview

Add intelligent pendiente creation that automatically suggests or creates pendientes from clinical text patterns and significant events, reducing cognitive load and ensuring important follow-ups aren't missed.

## Problem

Doctors manually create pendientes for:
- Follow-ups mentioned in notes ("pending renal consult, check tomorrow")
- Critical lab results that need attention
- Medication tapering schedules
- Pending culture results

This manual process is error-prone and time-consuming. Important follow-ups get forgotten when busy.

## Success Criteria

- **Auto-detect follow-up intent** from nota/indicaciones text with >80% precision
- **Suggest pendientes via non-intrusive toast** (user remains in control)
- **Auto-create urgent pendientes** for critical lab values (configurable thresholds)
- **Support medication taper triggers** (auto-create dose adjustment pendientes)
- **Detect pending culture results** (auto-create 48h follow-up pendientes)
- **All triggers configurable** via Settings panel (enable/disable, customize thresholds)
- **User can dismiss suggestions** (won't reappear for same text)
- **Backward compatible** — doesn't change existing manual pendiente creation

## Auto-Detection from Text

### Trigger
When saving nota or indicaciones (existing save flow)

### Detection Patterns
Simple regex patterns (no ML required for MVP):

```javascript
const patterns = [
  // Direct follow-up requests
  /pending\s+(.+)/i,
  /follow\s*up\s+(.+)/i,
  
  // Time-bound checks
  /check\s+(.+?)\s+(tomorrow|today|in\s+\d+\s+hours?)/i,
  /review\s+(.+?)\s+(tomorrow|today|in\s+\d+\s+hours?)/i,
  
  // Awaiting results
  /awaiting\s+(.+)/i,
  /waiting\s+for\s+(.+)/i,
  
  // Repeating actions
  /repeat\s+(.+?)\s+in\s+\d+/i,
  /continue\s+(.+?)\s+for\s+\d+\s+days?/i,
  
  // Specific clinical patterns
  /results?\s+of\s+(.+)/i,
  /outcome\s+of\s+(.+)/i,
];
```

### User Flow
1. User saves nota with: "Pending renal consult result, check tomorrow"
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
3. User actions:
   - **Create**: Adds pendiente as suggested (pre-filled form)
   - **Edit**: Opens form with pre-filled values for modification
   - **Dismiss**: Ignores suggestion (won't suggest again for this exact text)

### Settings
- Toggle: Enable auto-detection (on by default)
- Confidence threshold: Only suggest if match strength > threshold
- Dismissed suggestions: Stored in localStorage, don't reappear
- Custom patterns: Advanced users can add their own regex

### Implementation Notes
- Runs on save debounce (500ms after typing stops)
- Only runs on nota/indicaciones fields (not other text areas)
- Case-insensitive matching
- Extracts suggested text and infers time from context
- Default time: "tomorrow 8am" if time mentioned, otherwise "today 6pm"

## Event-Triggered Pendientes

### A. Critical Lab Values Trigger
- **When**: Lab result enters Estado Actual or is added to history
- **Condition**: Value exceeds critical threshold (configurable)
- **Action**: Creates urgent pendiente
- **Example**: K+ > 6.0 → "Review abnormal K+ (6.2)" (urgent, due now)
- **Links**: Pendiente.text includes value and links to lab result

#### Configuration
Settings panel per lab type:
- Potassium (K+): Critical > 6.0 mmol/L
- Sodium (Na+): Critical < 120 mmol/L
- Creatinine: Critical > 4.0 mg/dL
- INR: Critical > 5.0 (for non-anticoagulated)
- Glucose: Critical < 50 or > 400 mg/dL
- WBC: Critical < 1.0 or > 50.0 x10³/μL
- Platelets: Critical < 50 or > 1000 x10³/μL

### B. Medication Taper Trigger
- **When**: Medication with tapering schedule added to perfil
- **Condition**: Medication has taper instructions (e.g., "prednisone 5mg daily, reduce by 5mg every 3 days")
- **Action**: Creates pendiente for each taper step
- **Example**: "Adjust prednisone dose (taper day 3)" due at specified date
- **Recurring**: Creates pendiente for each step in taper sequence

### C. Pending Culture Result Trigger
- **When**: Culture lab added to Estado Actual (microbiology)
- **Condition**: Lab type = culture (blood, urine, sputum, etc.)
- **Action**: Creates pendiente: "Check culture result" due 48 hours from collection time
- **Links**: Pendiente links to specific culture lab

## Configuration & Control

### Settings Panel
Location: Settings → Clinical → Pendientes Automation

#### Auto-Detection Section
- [x] Enable auto-detection from text
- [ ] Confidence threshold: Medium (slider: Low/Medium/High)
- [x] Auto-suggest due times from context
- [ ] Custom patterns: [textarea for advanced users]

#### Event Triggers Section
- [x] Critical lab values
  - [Configure thresholds per lab type...]
- [x] Medication tapering schedules
- [x] Pending culture results (48h follow-up)
- [ ] Post-procedure follow-ups (future)

#### Notification Settings
- [x] Desktop notifications for auto-created pendientes
- [ ] Sound for urgent auto-created pendientes
- [ ] Quiet hours: 10:00 PM - 6:00 AM

## User Control & Ethics

### Transparency
- Auto-created pendientes show source: "Auto-detected from labs" or "Event-triggered: Critical K+"
- Users can see why a pendiente was created
- Source tracking in pendiente object for audit trail

### Opt-Out
- All triggers can be disabled individually
- Auto-created pendientes behave like manual ones (can edit, dismiss, complete)
- No hidden automation — user always sees what was created and why

### Safety
- Critical lab thresholds based on clinical guidelines
- Conservative defaults (wider normal ranges)
- Requires explicit opt-in for future advanced features
- Logging of all auto-created pendientes for review

## Technical Implementation

### Integration Points
1. **Nota/Indicaciones Save Hook**
   - Extend existing save flow to run detection
   - Show suggestion toast if pattern matches
   - Track dismissed suggestions to prevent repeats

2. **Laboratorio Save Hook**
   - After saving lab to Estado Actual/history
   - Check each new lab against critical thresholds
   - Create pendiente if exceeds threshold

3. **Medicamentos Save Hook**
   - When saving medication profile
   - Parse for taper instructions (look for keywords: taper, reduce, decrease, step-down)
   - Calculate taper schedule and create pendientes

4. **Estado Actual Save Hook**
   - When adding culture lab
   - Check lab type and create 48h follow-up

### Data Flow
```
Text Save → Run Detection → Show Suggestion Toast
               ↓
          User Action
               ↓
     [Create] → Pre-fill form → Save Pendiente
     [Edit]   → Open form with pre-fill
     [Dismiss]→ Log suggestion, prevent repeat
```

```
Lab Save → Check Thresholds → Create Pendiente (if critical)
               ↓
          Set source: {type: 'event-triggered', context: 'critical_lab'}
               ↓
          Set priority: 'urgent'
               ↓
          Set dueDate: now (shows as overdue)
```

### Storage & Sync
- All auto-created pendientes use same storage/manual pendientes
- Sync via existing LAN sync (no changes needed)
- Source field distinguishes manual vs auto-created
- CreatedBy field tracks which user/trigger created it

### Performance
- Detection runs on save debounce (~500ms after typing)
- Regex matching: O(patterns × text length) — negligible for < 500 chars
- Event triggers: O(new labs) on laboratorio save — typically 1-5 labs
- No background polling or timers needed

## Testing Strategy

### Unit Tests
- Regex pattern matching (positive/negative cases)
- Time inference from context ("tomorrow", "in 2 hours")
- Critical threshold evaluation (edge cases)
- Taper instruction parsing
- Culture lab type detection

### Integration Tests
- Nota save → suggestion toast appears
- Suggestion toast → create/edit/dismiss actions work
- Lab save → critical value creates urgent pendiente
- Medication save → taper creates sequence of pendientes
- Culture save → 48h follow-up pendiente created
- Settings changes affect behavior immediately
- LAN sync preserves source and trigger metadata

### E2E Tests
- Full user journey: type note → save → see suggestion → create → notification fires
- Cross-device: auto-created on device A → syncs to device B → notification on B
- Offline: suggestions still work locally, sync when reconnected
- Accessibility: screen reader announces suggestion toast

### Clinical Validation
- Test with sample clinical notes from various specialties
- Measure precision/recall of detection patterns
- Verify critical thresholds match clinical guidelines
- Test taper parsing with real medication instructions

## Open Questions

None — design is complete.

## Next Steps

1. User reviews and approves this spec
2. Create implementation plan
3. Implement and test