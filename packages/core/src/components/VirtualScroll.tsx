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
  InitialScrollPosition,
  ScrollAlign,
  VirtualScrollItem,
  VirtualScrollProps,
} from "../types";
import { useScrollState } from "../hooks/useScrollState";
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
    isMeasuring = false,
    loadingComponent,
    bottomLoadingComponent,
    initialScrollPosition = "bottom",
    groupInfo,
    renderGroupHeader,
  }: VirtualScrollProps<T>,
  ref: React.ForwardedRef<DynamicScrollHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // --- refs (리렌더 없이 최신값 추적) ---
  const animationFrameRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);
  const mountedRef = useRef(false);

  // --- 양방향 무한 스크롤: 로딩 가드 ---
  // backward(prepend): scrollHeight 보존 → 측정 완료 후 scrollTop 보정
  const backwardLoadingRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  // forward(append): 로딩 중 stick-to-bottom 차단 → 측정 완료 후 해제
  const forwardLoadingRef = useRef(false);

  // --- viewportHeight 초기화 ---
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
  }, []);

  // --- 최초 마운트: initialScrollPosition에 따라 스크롤 위치 설정 ---
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || mountedRef.current || totalHeight <= 0) return;

    mountedRef.current = true;

    if (initialScrollPosition === "top") {
      el.scrollTop = 0;
      setScrollTop(0);
      isAtBottomRef.current = false;
      onAtBottomChange?.(false);
    } else if (initialScrollPosition === "bottom") {
      el.scrollTop = el.scrollHeight;
      setScrollTop(el.scrollTop);
      isAtBottomRef.current = true;
      onAtBottomChange?.(true);
    } else {
      // { index, align } — 특정 아이템 위치로 이동 (예: 마지막 읽은 메시지)
      const { index, align = "center" } = initialScrollPosition;
      if (index >= 0 && index < items.length) {
        const itemTop = childPositions[index];
        const itemHeight = heightMapRef.current.get(items[index].id) ?? 0;

        let target: number;
        if (align === "start") {
          target = itemTop;
        } else if (align === "end") {
          target = itemTop + itemHeight - el.clientHeight;
        } else {
          target = itemTop + itemHeight / 2 - el.clientHeight / 2;
        }
        el.scrollTop = Math.max(0, target);
        setScrollTop(el.scrollTop);
        isAtBottomRef.current = false;
        onAtBottomChange?.(false);
      }
    }
  }, [totalHeight, onAtBottomChange, initialScrollPosition, items, childPositions, heightMapRef]);

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

      const itemTop = childPositions[index];
      const itemHeight = heightMapRef.current.get(items[index].id) ?? 0;

      let target: number;
      if (align === "start") {
        target = itemTop;
      } else if (align === "end") {
        target = itemTop + itemHeight - el.clientHeight;
      } else {
        // center: 아이템 중심이 뷰포트 중앙에 오도록
        target = itemTop + itemHeight / 2 - el.clientHeight / 2;
      }
      console.log('[scrollToItem]', { index, align, target, itemTop, itemHeight, viewportHeight: el.clientHeight });
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

  // --- totalHeight 변경 시: 스크롤 위치 보정 ---
  //
  // prepend/append 후 측정이 완료되면 totalHeight가 변경된다.
  // 이 시점에 각 방향에 맞는 스크롤 보정을 수행한다.
  //
  //  방향      | 가드 ref              | 보정 방식
  //  ----------|----------------------|----------------------------------
  //  backward  | prevScrollHeightRef  | scrollTop += (새 scrollHeight - 이전 scrollHeight)
  //  forward   | forwardLoadingRef    | stick-to-bottom 차단 (현재 위치 유지)
  //  없음      | isAtBottomRef        | stick-to-bottom (하단 고정)
  //
  useLayoutEffect(() => {
    if (!mountedRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    // backward(prepend): 측정 완료 후 scrollTop 보정으로 위치 보존
    if (prevScrollHeightRef.current > 0 && !isMeasuring) {
      const diff = el.scrollHeight - prevScrollHeightRef.current;
      console.log('[totalHeight] backward adjust', { diff, prevScrollHeight: prevScrollHeightRef.current, newScrollHeight: el.scrollHeight });
      if (diff > 0) {
        el.scrollTop += diff;
        setScrollTop(el.scrollTop);
      }
      prevScrollHeightRef.current = 0;
      backwardLoadingRef.current = false;
      return;
    }

    // forward(append): isMeasuring 중에도 flag 유지 → 측정 완료 후 해제
    if (forwardLoadingRef.current) {
      if (!isMeasuring) {
        forwardLoadingRef.current = false;
      }
      return;
    }

    // stick-to-bottom: 하단에 있으면 하단 유지 (이미지 로드, 새 메시지 등)
    if (isAtBottomRef.current && !isMeasuring) {
      console.log('[totalHeight] stick-to-bottom', { scrollHeight: el.scrollHeight });
      el.scrollTop = el.scrollHeight;
    }
  }, [totalHeight, isMeasuring]);

  // --- 상단/하단 도달 감지 ---
  //
  // scrollTop 변경 시 상단/하단 도달을 판단하고 데이터 로드를 트리거한다.
  // 각 방향은 독립적인 가드 ref로 중복 호출을 방지한다.
  // 가드 ref는 여기서 설정하고, totalHeight effect에서 해제한다.
  //
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !mountedRef.current) return;

    const actualScrollTop = el.scrollTop;

    // 상단 도달 → backward loading
    if (
      actualScrollTop <= threshold &&
      onStartReached &&
      !backwardLoadingRef.current &&
      prevScrollHeightRef.current === 0
    ) {
      console.log('[reach] START reached', { actualScrollTop, threshold, scrollTop });
      backwardLoadingRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      Promise.resolve(onStartReached()).catch(() => {
        prevScrollHeightRef.current = 0;
        backwardLoadingRef.current = false;
      });
      return;
    }

    // 하단 도달 → forward loading
    const distFromBottom = el.scrollHeight - actualScrollTop - el.clientHeight;
    if (
      distFromBottom <= threshold &&
      onEndReached &&
      !forwardLoadingRef.current
    ) {
      console.log('[reach] END reached', { distFromBottom, threshold, scrollTop });
      forwardLoadingRef.current = true;
      Promise.resolve(onEndReached()).catch(() => {
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
          knownHeight={heightMapRef.current.get(item.id)}
        >
          {renderItem(item, i)}
        </Measure>,
      );
    }
    return result;
  }, [startNode, endNode, items, childPositions, renderItem, onHeightChange, viewportHeight]);

  // --- GroupWrapper 렌더링 (sticky 헤더용) ---
  const groupWrappers = useMemo(() => {
    if (!groupInfo || !renderGroupHeader || viewportHeight === 0) return null;

    // 가시 영역에 걸친 그룹만 렌더
    const renderedGroups = new Set<string>();
    const result: React.ReactNode[] = [];

    for (let i = startNode; i <= endNode && i < items.length; i++) {
      const groupKey = groupInfo.groupKeyByIndex[i];
      if (!groupKey || renderedGroups.has(groupKey)) continue;
      renderedGroups.add(groupKey);

      const groupTop = groupInfo.groupStartPositions.get(groupKey) ?? 0;
      const groupHeight = groupInfo.heightByGroup.get(groupKey) ?? 0;

      result.push(
        <div
          key={`__group_${groupKey}`}
          style={{
            position: "absolute",
            top: groupTop,
            left: 0,
            width: "100%",
            height: groupHeight,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
              pointerEvents: "auto",
            }}
          >
            {renderGroupHeader(groupKey)}
          </div>
        </div>,
      );
    }
    return result;
  }, [groupInfo, renderGroupHeader, startNode, endNode, items, viewportHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: "auto", position: "relative", ...style }}
    >
      {(backwardLoadingRef.current || isMeasuring) && loadingComponent}
      <div style={{ position: "relative", width: "100%", height: totalHeight }}>
        {groupWrappers}
        {visibleChildren}
      </div>
      {forwardLoadingRef.current && bottomLoadingComponent}
    </div>
  );
}

export const VirtualScroll = forwardRef(VirtualScrollInner) as <
  T extends VirtualScrollItem,
>(
  props: VirtualScrollProps<T> & { ref?: React.Ref<DynamicScrollHandle> },
) => React.ReactElement | null;
