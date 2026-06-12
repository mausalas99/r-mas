/**
 * Fixed-height virtual scroll controller (vanilla DOM).
 * Renders only visible items + overscan; reuses nodes from an internal pool.
 */

export function computeVisibleRange({
  scrollTop,
  itemCount,
  itemHeight,
  viewportHeight,
  overscan,
}) {
  if (itemCount <= 0 || itemHeight <= 0) {
    return { startIndex: 0, endIndex: -1, offsetTop: 0, totalHeight: 0 };
  }

  const totalHeight = itemCount * itemHeight;
  const maxScroll = Math.max(0, totalHeight - Math.max(0, viewportHeight));
  const safeScroll = Math.max(0, Math.min(scrollTop, maxScroll));
  const firstVisible = Math.min(itemCount - 1, Math.floor(safeScroll / itemHeight));
  const lastVisible = Math.min(
    itemCount - 1,
    Math.floor((safeScroll + Math.max(0, viewportHeight) - 1) / itemHeight)
  );

  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(itemCount - 1, lastVisible + overscan);
  const offsetTop = startIndex * itemHeight;

  return { startIndex, endIndex, offsetTop, totalHeight };
}

export function createVirtualScroll({
  container,
  items,
  estimateItemHeight,
  renderItem,
  overscan = 3,
}) {
  const itemHeight = estimateItemHeight;
  let currentItems = items;
  let rafId = 0;
  let range = { startIndex: 0, endIndex: -1, offsetTop: 0, totalHeight: 0 };
  const activeNodes = new Map();
  const pool = [];

  const inner = document.createElement('div');
  inner.className = 'virtual-scroll-inner';
  inner.style.position = 'relative';
  inner.style.width = '100%';

  if (!container.style.overflow) container.style.overflow = 'auto';
  container.replaceChildren(inner);

  function releaseNode(el) {
    el.replaceChildren();
    el.removeAttribute('data-virtual-index');
    el.remove();
    pool.push(el);
  }

  function copyRenderedNode(target, source) {
    target.replaceChildren(...source.childNodes);
    target.className = source.className;
    for (const attr of source.attributes) {
      target.setAttribute(attr.name, attr.value);
    }
    source.remove();
    return target;
  }

  function mountNode(index) {
    const top = index * itemHeight;
    const rendered = renderItem({ item: currentItems[index], index, top });
    const pooled = pool.pop();
    const el = pooled ? copyRenderedNode(pooled, rendered) : rendered;
    el.style.position = 'absolute';
    el.style.top = `${top}px`;
    el.style.left = '0';
    el.style.right = '0';
    el.style.boxSizing = 'border-box';
    el.dataset.virtualIndex = String(index);
    inner.appendChild(el);
    activeNodes.set(index, el);
    return el;
  }

  function renderRange() {
    const next = computeVisibleRange({
      scrollTop: container.scrollTop,
      itemCount: currentItems.length,
      itemHeight,
      viewportHeight: container.clientHeight,
      overscan,
    });

    inner.style.height = `${next.totalHeight}px`;
    range = next;

    if (next.endIndex < next.startIndex) {
      for (const el of activeNodes.values()) releaseNode(el);
      activeNodes.clear();
      return;
    }

    for (const [index, el] of activeNodes) {
      if (index < next.startIndex || index > next.endIndex) {
        activeNodes.delete(index);
        releaseNode(el);
      }
    }

    for (let i = next.startIndex; i <= next.endIndex; i += 1) {
      const top = i * itemHeight;
      const existing = activeNodes.get(i);
      if (existing) {
        existing.style.top = `${top}px`;
        continue;
      }
      mountNode(i);
    }
  }

  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      renderRange();
    });
  }

  function onScroll() {
    scheduleRender();
  }

  container.addEventListener('scroll', onScroll, { passive: true });
  renderRange();

  return {
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', onScroll);
      for (const el of activeNodes.values()) releaseNode(el);
      activeNodes.clear();
      inner.remove();
    },

    updateItems(nextItems) {
      currentItems = nextItems;
      for (const el of activeNodes.values()) releaseNode(el);
      activeNodes.clear();
      scheduleRender();
    },

    scrollToIndex(index, behavior = 'auto') {
      const clamped = Math.max(0, Math.min(index, currentItems.length - 1));
      container.scrollTo({ top: clamped * itemHeight, behavior });
    },

    getVisibleRange() {
      return { ...range };
    },
  };
}
