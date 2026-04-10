import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type {
  DynamicScrollHandle,
  DynamicScrollProps,
  VirtualScrollItem,
} from "./types";

/** 그룹 separator를 위한 내부 아이템 타입 */
interface GroupSeparatorItem extends VirtualScrollItem {
  __isSeparator: true;
  __groupKey: string;
}
import { useHeightMap } from "./hooks/useHeightMap";
import { usePositions } from "./hooks/usePositions";
import { useGroupPositions } from "./hooks/useGroupPositions";
import { VirtualScroll } from "./components/VirtualScroll";
import { InitialMeasure } from "./components/InitialMeasure";

/**
 * DynamicScroll - 최상위 가상 스크롤 컴포넌트.
 *
 * 핵심 흐름:
 * 1. 최초: 모든 아이템을 InitialMeasure로 측정 → isAllMeasured 게이트
 * 2. 이후: VirtualScroll을 유지한 채 새 아이템만 백그라운드 측정
 *    - 측정 중에는 estimatedItemSize 또는 0으로 임시 배치
 *    - 측정 완료되면 positions 재계산으로 자연스럽게 반영
 *    - VirtualScroll이 절대 언마운트되지 않으므로 스크롤 위치 보존
 */
function DynamicScrollInner<T extends VirtualScrollItem>(
  {
    items,
    renderItem,
    overscanCount,
    estimatedItemSize,
    onStartReached,
    onEndReached,
    threshold,
    onAtBottomChange,
    syncScrollUpdates,
    className,
    style,
    groupBy,
    renderGroupHeader,
    renderGroupSeparator,
    loadingComponent,
    bottomLoadingComponent,
    initialScrollPosition = "bottom",
    onMeasurementComplete,
    initialLoadingComponent,
  }: DynamicScrollProps<T>,
  ref: React.ForwardedRef<DynamicScrollHandle>,
) {
  // --- 그룹 separator 삽입 ---
  // groupBy + renderGroupSeparator가 있으면, 각 그룹 시작 전에 separator 아이템을 삽입
  // separator는 일반 아이템처럼 높이 측정됨 (heightMap/childPositions에 반영)
  const itemsWithSeparators = useMemo(() => {
    if (!groupBy || !renderGroupSeparator) return items;

    const result: (T | GroupSeparatorItem)[] = [];
    let prevGroup: string | null = null;

    for (let i = 0; i < items.length; i++) {
      const currentGroup = groupBy(items[i]);
      if (currentGroup !== prevGroup) {
        result.push({
          id: `__separator_${currentGroup}`,
          __isSeparator: true,
          __groupKey: currentGroup,
        } as GroupSeparatorItem);
        prevGroup = currentGroup;
      }
      result.push(items[i]);
    }
    return result;
  }, [items, groupBy, renderGroupSeparator]);

  // renderItem을 래핑하여 separator 아이템은 수평선으로 렌더
  const wrappedRenderItem = useMemo(() => {
    if (!groupBy || !renderGroupSeparator) return renderItem;

    return (item: T | GroupSeparatorItem, _index: number) => {
      if ("__isSeparator" in item && item.__isSeparator) {
        return renderGroupSeparator((item as GroupSeparatorItem).__groupKey);
      }
      return renderItem(item as T, _index);
    };
  }, [groupBy, renderGroupSeparator, renderItem]) as (item: T, index: number) => React.ReactNode;

  // separator 포함된 아이템 목록으로 높이 측정
  const allItems = itemsWithSeparators as T[];

  const {
    heightMapRef,
    isAllMeasured,
    unmeasuredIds,
    onItemMeasured,
    onHeightChange,
    version,
  } = useHeightMap({ items: allItems, estimatedItemSize });

  // 초기 측정 완료 여부를 한 번만 추적
  const hasEverMeasuredRef = useRef(false);
  if (isAllMeasured && !hasEverMeasuredRef.current) {
    hasEverMeasuredRef.current = true;
    console.log('[DynamicScroll] initial measurement complete', { itemCount: allItems.length, unmeasuredCount: unmeasuredIds.length });
  }

  // 현재 측정 중인지 (초기 이후 새 아이템 추가 시)
  const isMeasuring = !isAllMeasured && hasEverMeasuredRef.current;

  // --- 스크롤 명령 큐잉 ---
  const innerRef = useRef<DynamicScrollHandle>(null);
  const pendingScrollRef = useRef<(() => void) | null>(null);
  const isMeasuringRef = useRef(isMeasuring);
  isMeasuringRef.current = isMeasuring;

  const wasMeasuringRef = useRef(false);
  useEffect(() => {
    if (isMeasuring) {
      wasMeasuringRef.current = true;
      console.log('[DynamicScroll] measuring started', { unmeasuredCount: unmeasuredIds.length, totalItems: allItems.length });
    } else if (wasMeasuringRef.current) {
      wasMeasuringRef.current = false;
      console.log('[DynamicScroll] measuring complete', { hasPendingScroll: !!pendingScrollRef.current });
      if (pendingScrollRef.current) {
        pendingScrollRef.current();
        pendingScrollRef.current = null;
      }
      onMeasurementComplete?.();
    }
  }, [isMeasuring, onMeasurementComplete, unmeasuredIds.length, allItems.length]);

  /**
   * 외부 index (원본 items 기준) → 내부 index (separator 포함 배열 기준) 변환.
   * separator가 없으면 그대로 반환.
   */
  const toInternalIndex = useCallback(
    (externalIndex: number): number => {
      if (!groupBy || !renderGroupSeparator) return externalIndex;
      // separator는 각 그룹 시작 전에 1개씩 삽입되므로,
      // 외부 index까지의 그룹 전환 횟수만큼 offset 추가
      let separatorCount = 0;
      let prevGroup: string | null = null;
      for (let i = 0; i <= externalIndex && i < items.length; i++) {
        const group = groupBy(items[i]);
        if (group !== prevGroup) {
          separatorCount++;
          prevGroup = group;
        }
      }
      return externalIndex + separatorCount;
    },
    [items, groupBy, renderGroupSeparator],
  );

  useImperativeHandle(ref, () => ({
    scrollToItem: (index, align) => {
      const internalIdx = toInternalIndex(index);
      console.log('[DynamicScroll.scrollToItem]', { externalIndex: index, internalIndex: internalIdx, align, isMeasuring: isMeasuringRef.current });
      const action = () => innerRef.current?.scrollToItem(internalIdx, align);
      isMeasuringRef.current ? (pendingScrollRef.current = action) : action();
    },
    scrollToBottom: (behavior) => {
      console.log('[DynamicScroll.scrollToBottom]', { behavior, isMeasuring: isMeasuringRef.current, queued: isMeasuringRef.current });
      const action = () => innerRef.current?.scrollToBottom(behavior);
      isMeasuringRef.current ? (pendingScrollRef.current = action) : action();
    },
    scrollToOffset: (offset, behavior) => {
      const action = () => innerRef.current?.scrollToOffset(offset, behavior);
      isMeasuringRef.current ? (pendingScrollRef.current = action) : action();
    },
    getScrollOffset: () => innerRef.current?.getScrollOffset() ?? 0,
  }));

  // 측정 중에는 이전에 확정된 아이템 목록을 유지 (높이 0 아이템이 VirtualScroll에 노출되는 것 방지)
  const stableItemsRef = useRef(allItems);
  if (!isMeasuring) {
    stableItemsRef.current = allItems;
  }
  const stableItems = isMeasuring ? stableItemsRef.current : allItems;

  const { childPositions, totalHeight } = usePositions({
    items: stableItems,
    heightMapRef,
    version,
    estimatedItemSize,
  });

  // separator도 같은 그룹에 속하도록 groupBy 래핑
  const groupByWithSeparator = useMemo(() => {
    if (!groupBy) return undefined;
    return (item: T) => {
      if ("__isSeparator" in item && (item as unknown as GroupSeparatorItem).__isSeparator) {
        return (item as unknown as GroupSeparatorItem).__groupKey;
      }
      return groupBy(item);
    };
  }, [groupBy]);

  const groupInfo = useGroupPositions(stableItems, groupByWithSeparator, heightMapRef, version);

  // VirtualScroll에 전달할 groupInfo: groupStartPositions 추가
  const virtualScrollGroupInfo = useMemo(() => {
    if (!groupInfo || childPositions.length === 0) return null;

    const groupStartPositions = new Map<string, number>();
    let prevGroup: string | null = null;
    for (let i = 0; i < groupInfo.groupKeyByIndex.length; i++) {
      const group = groupInfo.groupKeyByIndex[i];
      if (group !== prevGroup) {
        groupStartPositions.set(group, childPositions[i] ?? 0);
        prevGroup = group;
      }
    }

    return {
      heightByGroup: groupInfo.heightByGroup,
      groupKeyByIndex: groupInfo.groupKeyByIndex,
      groupStartPositions,
    };
  }, [groupInfo, childPositions]);

  // 초기 측정이 완료되지 않았으면 측정 영역 + 로딩 컴포넌트 렌더링
  if (!hasEverMeasuredRef.current) {
    return (
      <div
        className={className}
        style={{
          overflow: "hidden",
          position: "relative",
          ...style,
        }}
      >
        {initialLoadingComponent}
        {unmeasuredIds.map((id) => {
          const index = allItems.findIndex((item) => item.id === id);
          if (index === -1) return null;
          return (
            <InitialMeasure key={id} itemId={id} onMeasured={onItemMeasured}>
              {wrappedRenderItem(allItems[index], index)}
            </InitialMeasure>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* 새 아이템 백그라운드 측정 (VirtualScroll 유지한 채) */}
      {isMeasuring && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            overflow: "hidden",
            height: 0,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {unmeasuredIds.map((id) => {
            const index = allItems.findIndex((item) => item.id === id);
            if (index === -1) return null;
            return (
              <InitialMeasure key={id} itemId={id} onMeasured={onItemMeasured}>
                {wrappedRenderItem(allItems[index], index)}
              </InitialMeasure>
            );
          })}
        </div>
      )}
      <VirtualScroll
        ref={innerRef}
        items={stableItems}
        renderItem={wrappedRenderItem}
        childPositions={childPositions}
        totalHeight={totalHeight}
        heightMapRef={heightMapRef}
        onHeightChange={onHeightChange}
        overscanCount={overscanCount}
        onStartReached={isMeasuring ? undefined : onStartReached}
        onEndReached={isMeasuring ? undefined : onEndReached}
        threshold={threshold}
        onAtBottomChange={onAtBottomChange}
        syncScrollUpdates={syncScrollUpdates}
        className={className}
        style={style}
        isMeasuring={isMeasuring}
        loadingComponent={loadingComponent}
        bottomLoadingComponent={bottomLoadingComponent}
        initialScrollPosition={
          typeof initialScrollPosition === "object" && "index" in initialScrollPosition
            ? { ...initialScrollPosition, index: toInternalIndex(initialScrollPosition.index) }
            : initialScrollPosition
        }
        groupInfo={virtualScrollGroupInfo}
        renderGroupHeader={renderGroupHeader}
      />
    </>
  );
}

export const DynamicScroll = forwardRef(DynamicScrollInner) as <
  T extends VirtualScrollItem,
>(
  props: DynamicScrollProps<T> & { ref?: React.Ref<DynamicScrollHandle> },
) => React.ReactElement | null;
