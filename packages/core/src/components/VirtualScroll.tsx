import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type {
  DynamicScrollHandle,
  ScrollAlign,
  VirtualScrollItem,
  VirtualScrollProps,
} from "../types";
import { useScrollState } from "../hooks/useScrollState";
import { generateCenteredStartNodeIndex } from "../utils/binarySearch";
import { Measure } from "./Measure";

const DEFAULT_OVERSCAN = 8;

function VirtualScrollInner<T extends VirtualScrollItem>(
  {
    items,
    renderItem,
    childPositions,
    totalHeight,
    heightMapRef,
    onHeightChange,
    overscanCount = DEFAULT_OVERSCAN,
    onStartReached,
    onEndReached,
    threshold = 0,
    onAtBottomChange,
    syncScrollUpdates = false,
    className,
    style,
  }: VirtualScrollProps<T>,
  ref: React.ForwardedRef<DynamicScrollHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // --- refs (리렌더 없이 최신값 추적) ---
  const animationFrameRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);
  const prevItemCountRef = useRef(items.length);
  const prevScrollHeightRef = useRef(0);
  const backwardLoadingRef = useRef(false);
  const forwardLoadingRef = useRef(false);
  const mountedRef = useRef(false);

  // --- viewportHeight 초기화 ---
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
  }, []);

  // --- 최초 마운트: 하단으로 스크롤 ---
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || mountedRef.current || totalHeight <= 0) return;

    mountedRef.current = true;
    el.scrollTop = el.scrollHeight;
    setScrollTop(el.scrollTop);
    isAtBottomRef.current = true;
    onAtBottomChange?.(true);
  }, [totalHeight, onAtBottomChange]);

  const { startNode, endNode } = useScrollState({
    scrollTop,
    itemCount: items.length,
    overscanCount,
    viewportHeight,
    childPositions,
  });

  // --- onScroll ---
  const onScroll = useCallback(
    (e: Event) => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = null;
        const target = e.target as HTMLDivElement;
        const newScrollTop = target.scrollTop;

        if (syncScrollUpdates) {
          flushSync(() => setScrollTop(newScrollTop));
        } else {
          setScrollTop(newScrollTop);
        }

        // 하단 판정 (DOM에서 직접 읽기)
        const atBottom =
          target.scrollHeight - newScrollTop - target.clientHeight <= 1;
        if (isAtBottomRef.current !== atBottom) {
          isAtBottomRef.current = atBottom;
          onAtBottomChange?.(atBottom);
        }
      });
    },
    [syncScrollUpdates, onAtBottomChange],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  // --- Imperative API ---
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const el = containerRef.current;
      if (!el || items.length === 0) return;
      el.scrollTo({ top: el.scrollHeight, left: 0, behavior });
      isAtBottomRef.current = true;
      onAtBottomChange?.(true);
    },
    [items.length, onAtBottomChange],
  );

  const scrollToItem = useCallback(
    (index: number, align: ScrollAlign = "center") => {
      const el = containerRef.current;
      if (!el || index < 0 || index >= items.length) return;

      let target: number;
      if (align === "start") {
        target = childPositions[index];
      } else if (align === "end") {
        target = (childPositions[index + 1] ?? childPositions[index]) - el.clientHeight;
      } else {
        const itemHeight = heightMapRef.current.get(items[index].id) ?? 0;
        const si = generateCenteredStartNodeIndex(childPositions, itemHeight, index, el.clientHeight);
        target = childPositions[si];
      }
      el.scrollTo({ top: Math.max(0, target), left: 0, behavior: "auto" });
    },
    [childPositions, items, heightMapRef],
  );

  useImperativeHandle(ref, () => ({
    scrollToItem,
    scrollToBottom,
    scrollToOffset: (offset: number, behavior: ScrollBehavior = "auto") => {
      containerRef.current?.scrollTo({ top: offset, left: 0, behavior });
    },
    getScrollOffset: () => containerRef.current?.scrollTop ?? 0,
  }));

  // --- 아이템 수 변경 처리 ---
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !mountedRef.current) return;

    const prevCount = prevItemCountRef.current;
    const newCount = items.length;
    prevItemCountRef.current = newCount;

    if (prevCount === newCount) return;

    // prepend 감지: 위에서 데이터가 추가된 경우
    if (prevScrollHeightRef.current > 0) {
      const diff = el.scrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        el.scrollTop = diff;
        setScrollTop(diff);
      }
      prevScrollHeightRef.current = 0;
      return;
    }

    // append: 하단에 있으면 하단 유지
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setScrollTop(el.scrollTop);
    }
  }, [items.length]);

  // --- stick-to-bottom: 높이 변경 시 (이미지 로드 등) ---
  useLayoutEffect(() => {
    if (!mountedRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [totalHeight]);

  // --- 상단/하단 도달 감지 ---
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !mountedRef.current) return;

    // state가 아닌 실제 DOM scrollTop 사용 (같은 렌더 사이클에서 state가 stale할 수 있음)
    const actualScrollTop = el.scrollTop;

    // 상단 도달
    if (
      actualScrollTop <= threshold &&
      onStartReached &&
      !backwardLoadingRef.current &&
      prevScrollHeightRef.current === 0
    ) {
      backwardLoadingRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      Promise.resolve(onStartReached())
        .catch(() => {
          prevScrollHeightRef.current = 0;
        })
        .finally(() => {
          backwardLoadingRef.current = false;
        });
      return;
    }

    // 하단 도달
    const distFromBottom = el.scrollHeight - actualScrollTop - el.clientHeight;
    if (
      distFromBottom <= threshold &&
      onEndReached &&
      !forwardLoadingRef.current
    ) {
      forwardLoadingRef.current = true;
      Promise.resolve(onEndReached())
        .catch(() => {})
        .finally(() => {
          forwardLoadingRef.current = false;
        });
    }
  }, [scrollTop, threshold, onStartReached, onEndReached]);

  // --- 렌더링 ---
  const visibleChildren = useMemo(() => {
    if (viewportHeight === 0) return null;
    const result: React.ReactNode[] = [];
    for (let i = startNode; i <= endNode && i < items.length; i++) {
      const item = items[i];
      result.push(
        <Measure
          key={item.id}
          itemId={item.id}
          position={childPositions[i]}
          onHeightChange={onHeightChange}
        >
          {renderItem(item, i)}
        </Measure>,
      );
    }
    return result;
  }, [startNode, endNode, items, childPositions, renderItem, onHeightChange, viewportHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: "auto", position: "relative", ...style }}
    >
      <div style={{ position: "relative", width: "100%", height: totalHeight }}>
        {visibleChildren}
      </div>
    </div>
  );
}

export const VirtualScroll = forwardRef(VirtualScrollInner) as <
  T extends VirtualScrollItem,
>(
  props: VirtualScrollProps<T> & { ref?: React.Ref<DynamicScrollHandle> },
) => React.ReactElement | null;
