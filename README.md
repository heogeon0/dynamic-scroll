# @dynamic-scroll/core

**Pixel-perfect virtual scrolling with pre-render measurement.**

A headless React virtual scroll library that measures every item's real height before rendering — no estimated sizes, no scrollbar jumps, no position inaccuracy.

## Why

Most virtual scroll libraries (react-virtuoso, @tanstack/virtual, etc.) rely on `estimatedItemSize` to calculate positions before items are rendered. This causes:

- **Scrollbar jumping** — the scrollbar resizes as estimated heights are corrected
- **Inaccurate `scrollToItem`** — positions are wrong until items are actually rendered
- **Layout shifts** — visible items jump as heights are recalculated

**dynamic-scroll** takes a different approach: it renders every item in a hidden area first, measures the real DOM height, and only then starts the virtual scroll. The result is `childPositions` that are accurate from the very first frame.

## Design Challenges

Building a production-grade virtual scroll means solving problems that don't appear in simple demos. Here are the core challenges and how we solved them:

### 1. Accurate positioning without knowing heights

**Problem:** Items have dynamic heights (text wraps, images load, content varies). You can't calculate positions without knowing heights, but you can't know heights without rendering.

**Solution:** Pre-render Measurement. Every item is rendered in a hidden container (`visibility: hidden`) and measured with `offsetHeight`. An `isAllMeasured` gate ensures the virtual scroll only starts after all heights are known. For images, we wait for `img.onload` with a timeout fallback.

### 2. Scroll jump on prepend

**Problem:** When loading older messages at the top (bidirectional infinite scroll), new content pushes existing content down. The user sees a jarring jump.

**Solution:** Before prepending, save `scrollHeight`. After the DOM updates, set `scrollTop = newScrollHeight - savedScrollHeight`. This keeps the viewport exactly where it was.

### 3. Sticky headers in virtual scroll

**Problem:** CSS `position: sticky` doesn't work with absolutely positioned items (which virtual scroll requires). But sticky group headers (dates, categories) are essential UX.

**Solution:** A dual-header system. A `position: sticky` header sits at the top of the scroll container. Its `height` is limited to `totalHeight - cumulativeGroupHeight`, so it naturally gets pushed up when the next group's content begins — creating a smooth push-up transition effect.

### 4. Stick-to-bottom vs. "don't move while I'm reading"

**Problem:** Chat-like UIs need to auto-scroll to the bottom when new items arrive, but only if the user is already at the bottom. If they're scrolled up reading old content, the scroll should not move.

**Solution:** Track `isAtBottom` via a ref (not state, to avoid stale closures). On `totalHeight` change, only auto-scroll if `isAtBottom` is true. Height changes (image loads) are handled separately from item count changes.

### 5. Scroll-render synchronization

**Problem:** React batches state updates, but scroll position must be reflected immediately. Without sync updates, you see blank areas as the user scrolls faster than React can render.

**Solution:** `requestAnimationFrame` throttling by default for smooth performance. Optional `syncScrollUpdates` prop enables `flushSync` for latency-critical use cases (trading framerate for fewer blank frames).

### 6. Managing heights for thousands of items

**Problem:** The original implementation used `{...prev, [id]: height}` (object spread) for height updates. With N items, each measurement triggers O(N) copy + a React re-render — that's N re-renders during initial measurement.

**Solution:** `useRef<Map<string, number>>` for O(1) get/set with zero re-renders during measurement. Only one state update fires after all items are measured. ResizeObserver changes are batched via `requestAnimationFrame`.

## Features

- **Pre-render measurement** — accurate heights before virtual scroll starts
- **Dynamic heights** — items can be any height, including images
- **Bidirectional infinite scroll** — load data at top and bottom with scroll position preservation
- **Sticky group headers** — groupBy + renderGroupHeader with push-up transition
- **scrollToItem** — scroll to any item with `start`, `center`, `end` alignment
- **Stick-to-bottom** — auto-scroll on new items when already at bottom
- **Headless** — zero styling, bring your own CSS/components
- **TypeScript** — full type safety with generics
- **Imperative API** — `scrollToItem`, `scrollToBottom`, `scrollToOffset`, `getScrollOffset`

## Quick Start

```bash
npm install @dynamic-scroll/core
```

```tsx
import { DynamicScroll } from "@dynamic-scroll/core";

interface Item {
  id: string;
  content: string;
}

const items: Item[] = Array.from({ length: 10000 }, (_, i) => ({
  id: `item-${i}`,
  content: `Item ${i} with variable content...`,
}));

function App() {
  return (
    <DynamicScroll
      items={items}
      renderItem={(item) => (
        <div style={{ padding: 16 }}>{item.content}</div>
      )}
      style={{ height: 600 }}
    />
  );
}
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  DynamicScroll (orchestrator)               │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Phase 1: Measure                      │  │
│  │ InitialMeasure (hidden DOM)           │  │
│  │ → useRef<Map> heightMap (no rerenders)│  │
│  │ → isAllMeasured gate                  │  │
│  └──────────────┬────────────────────────┘  │
│                 │ all measured               │
│  ┌──────────────▼────────────────────────┐  │
│  │ Phase 2: Compute                      │  │
│  │ childPositions = cumulative sum       │  │
│  │ totalHeight = positions[last]         │  │
│  └──────────────┬────────────────────────┘  │
│                 │                            │
│  ┌──────────────▼────────────────────────┐  │
│  │ Phase 3: Render (VirtualScroll)       │  │
│  │ scrollTop → useScrollState            │  │
│  │ → binary search O(log n)              │  │
│  │ → startNode / endNode                 │  │
│  │ → Measure wraps each visible item     │  │
│  │ → ResizeObserver → batch update       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Comparison

| Feature | dynamic-scroll | react-virtuoso | @tanstack/virtual |
|---------|---------------|----------------|-------------------|
| Height measurement | Pre-render (exact) | Estimated + correct | Estimated + correct |
| Scrollbar accuracy | Pixel-perfect from start | Jumps during correction | Jumps during correction |
| scrollToItem accuracy | Exact | Approximate until measured | Approximate until measured |
| Bidirectional infinite scroll | Built-in | Built-in | Manual |
| Sticky group headers | Built-in (push-up) | Built-in | Manual |
| Headless | Yes | No (styled) | Yes |
| Bundle size | ~5KB | ~30KB | ~10KB |

## License

MIT
