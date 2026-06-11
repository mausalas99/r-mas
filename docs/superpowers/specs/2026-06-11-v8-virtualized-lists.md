# Virtualized Lists — Smooth Scrolling for Large Datasets

**Date:** 2026-06-11  
**Target Release:** v8.0.4  
**Status:** Spec  
**Timeline:** 1-2 weeks

## Overview

Implement virtual scrolling for long lists so users get smooth 60fps scrolling regardless of list length (50, 100, 500+ items) without rendering all DOM nodes at once.

## Problem

Currently, long lists render all items:
- Censo with 50+ patients renders 50+ DOM nodes
- Lab history with 100+ entries causes scroll lag
- Medicamentos receta grid with many prescriptions janks on scroll
- Eventualidades timeline with hundreds of events freezes UI
- Browser struggles with layout/paint/reflow for large DOM trees

## Success Criteria

- **Smooth 60fps scrolling** in all lists regardless of length
- **Only render visible items + buffer** (typically 10-15 items)
- **Reuse DOM nodes** as user scrolls (no create/destroy during scroll)
- **Maintain scroll position and selection** correctly
- **Works with variable height items** (different text lengths, etc.)
- **No visible jumping or flashing** during scroll
- **Backward compatible** — existing list implementations work unchanged until migrated

## Target Lists

These lists will get virtualized:
1. **Censo patient list** (main patient selector)
2. **Lab history** (Laboratorio → Historial tab)
3. **Medicamentos receta grid** (prescription editor)
4. **Eventualidades timeline** (clinical events)
5. **Estado Actual measurement history** (vital signs trends)
6. **Pendientes list** (when > 50 items)
7. **Any custom list** exceeding 20 items

## Architecture

### Virtual Scroll Core

A lightweight, custom implementation (~200 lines) that:
- Measures item heights dynamically (supports variable heights)
- Renders only visible items + configurable buffer (default: 3 above/below)
- Translates scroll offset to item range
- Reuses DOM nodes via internal pool
- Maintains internal scroll position state
- Provides scroll-to-index and get-index-at-position utilities

### Component Interface

```javascript
// Usage in existing list component:
function renderPatientList(patients) {
  return virtualScrollContainer({
    items: patients,
    renderItem: renderPatientRow,
    itemKey: 'id',  // or index if stable
    estimatedItemHeight: 48, // pixels (will measure actual)
    overscan: 3,    // render 3 extra items above/below
  });
}

// renderPatientRow receives:
// { item: patient, index: number, style: { transform: `translateY(${offset}px)` } }
function renderPatientRow({ item, index, style }) {
  return (
    <div 
      className="patient-row" 
      style={style} 
      data-patient-id={item.id}
    >
      {/* ... existing row content ... */}
    </div>
  );
}
```

### Implementation Details

**State Tracking:**
- `startIndex`: first visible item index
- `endIndex`: last visible item index (inclusive)
- `scrollOffset`: pixel offset of startIndex from top
- `measuredHeights`: Map<ItemKey, height> for variable height support
- `totalHeight`: sum of all item heights
- `renderedItems`: Map<index, DOM node> for reuse

**Scroll Handler (requestAnimationFrame):**
1. On scroll event, update scroll position
2. Request animation frame for measurement
3. In RAF callback:
   - Calculate visible range based on scroll position
   - Measure any newly visible items (if height unknown)
   - Update DOM: remove offscreen, reuse/move onscreen, add new
   - Update scroll offset translation on container

**Variable Height Support:**
- First pass: render with estimated heights
- As items enter viewport, measure actual height
- Adjust offsets and re-render if measurement differs significantly
- Cache measurements by item key for future use

**Buffer/Overscan:**
- Render 3 items above/below viewport to prevent flashing during fast scroll
- Adjustable based on item height and scroll speed
- Zero overscan for static height lists (can optimize)

### DOM Reuse Strategy

Instead of destroying/creating nodes:
1. Maintain pool of unused DOM nodes
2. When item scrolls offscreen: 
   - Detach event listeners (if any)
   - Clear content/data attributes
   - Add to unused pool
3. When item needs to render onscreen:
   - Take from pool if available, else create new
   - Populate with item data
   - Attach necessary event listeners
   - Apply transform for positioning

This minimizes GC pressure and layout thrashing.

## Integration with Existing Code

### Migration Path
Existing list components can be migrated incrementally:
1. Wrap existing `.map(item => renderItem(item))` with virtual scroll container
2. Replace with virtualScrollContainer({ items, renderItem, ... })
3. No changes needed to renderItem function signature
4. Keep existing CSS classes and event handlers

### Example Migration

**Before:**
```javascript
function CensoList({ pacientes }) {
  return (
    <div className="censo-list">
      {pacientes.map(paciente => (
        <PacienteRow key={paciente.id} paciente={paciente} />
      ))}
    </div>
  );
}
```

**After:**
```javascript
function CensoList({ pacientes }) {
  return virtualScrollContainer({
    items: pacientes,
    renderItem: ({ item, index, style }) => (
      <PacienteRow 
        key={item.id} 
        paciente={item} 
        style={style} 
        data-index={index}
      />
    ),
    itemKey: 'id',
    estimatedItemHeight: 56,
  });
}
```

## Performance Characteristics

### Memory
- **Before**: O(n) DOM nodes (1 node per item)
- **After**: O(viewport) DOM nodes (~10-20 nodes visible)
- **Savings**: 95%+ reduction in DOM nodes for 100-item lists

### CPU
- **Before**: Layout/paint on every scroll proportional to list size
- **After**: Layout/paint only on visible items + buffer
- **Savings**: 90%+ reduction in layout work during scroll

### Frame Rate
- **Before**: Drops to 15-30fps on long lists
- **After**: Consistent 60fps (limited only by paint complexity of visible items)

## Accessibility
- Maintains screen reader compatibility (items in DOM have correct roles/labels)
- Keyboard navigation works (focus management preserved)
- Respects `prefers-reduced-motion` (can disable smooth scroll animations if needed)
- Proper ARIA attributes on scroll container (`aria-roledescription="list"`)

## Testing Strategy

### Unit Tests
- Virtual scroll controller logic (start/end index calculation)
- Item measurement and caching
- DOM node reuse and pooling
- Scroll-to-index and index-at-position accuracy
- Variable height handling

### Integration Tests
- Render 1000-item list, scroll to middle, verify correct items visible
- Rapid scrolling doesn't lose items or show blanks
- Insert/delete items in middle maintains virtualization
- Selection preservation during scroll
- Resize handling (window resize, font size change)

### Performance Tests
- Frame timing during scroll (target: < 16.67ms per frame)
- Memory heap snapshots (DOM node count)
- Layout thrashing measurements (forced synchronous layouts)
- Long scroll sessions (30+ seconds) for leak detection

### Visual Regression
- Screenshot comparison of lists at various scroll positions
- Ensure no visual difference between virtualized and non-virtualized
- Test edge cases: first item, last item, middle items

## Open Questions

None — design is complete.

## Next Steps

1. User reviews and approves this spec
2. Create implementation plan
3. Implement and test