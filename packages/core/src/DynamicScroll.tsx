import { forwardRef, useMemo, useRef } from "react";
import type {
  DynamicScrollHandle,
  DynamicScrollProps,
  VirtualScrollItem,
} from "./types";
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
    loadingComponent,
  }: DynamicScrollProps<T>,
  ref: React.ForwardedRef<DynamicScrollHandle>,
) {
  const {
    heightMapRef,
    isAllMeasured,
    unmeasuredIds,
    onItemMeasured,
    onHeightChange,
    version,
  } = useHeightMap({ items, estimatedItemSize });

  // 초기 측정 완료 여부를 한 번만 추적
  const hasEverMeasuredRef = useRef(false);
  if (isAllMeasured) {
    hasEverMeasuredRef.current = true;
  }

  // 현재 측정 중인지 (초기 이후 새 아이템 추가 시)
  const isMeasuring = !isAllMeasured && hasEverMeasuredRef.current;



  // 측정 중에는 이전에 확정된 아이템 목록을 유지 (높이 0 아이템이 VirtualScroll에 노출되는 것 방지)
  const stableItemsRef = useRef(items);
  if (!isMeasuring) {
    stableItemsRef.current = items;
  }
  const stableItems = isMeasuring ? stableItemsRef.current : items;

  const { childPositions, totalHeight } = usePositions({
    items: stableItems,
    heightMapRef,
    version,
    estimatedItemSize,
  });

  const groupInfo = useGroupPositions(stableItems, groupBy, heightMapRef, version);

  // 그룹 헤더 래핑
  const wrappedRenderItem = useMemo(() => {
    if (!groupBy || !renderGroupHeader || !groupInfo) return renderItem;

    return (item: T, index: number) => {
      const currentGroup = groupInfo.groupKeyByIndex[index];
      const prevGroup =
        index > 0 ? groupInfo.groupKeyByIndex[index - 1] : null;
      const isGroupStart = currentGroup !== prevGroup;

      return (
        <>
          {isGroupStart && renderGroupHeader(currentGroup)}
          {renderItem(item, index)}
        </>
      );
    };
  }, [groupBy, renderGroupHeader, groupInfo, renderItem]);

  /**
   * InitialMeasure용 렌더 함수.
   * 그룹 헤더가 있으면 그룹 시작 아이템에 헤더를 포함하여 측정한다.
   * (런타임 Measure와 동일한 높이가 측정되도록)
   */
  const measureRenderItem = useMemo(() => {
    if (!groupBy || !renderGroupHeader) return renderItem;

    return (item: T, index: number) => {
      const currentGroup = groupBy(item);
      const prevItem = index > 0 ? items[index - 1] : null;
      const prevGroup = prevItem ? groupBy(prevItem) : null;
      const isGroupStart = currentGroup !== prevGroup;

      return (
        <>
          {isGroupStart && renderGroupHeader(currentGroup)}
          {renderItem(item, index)}
        </>
      );
    };
  }, [groupBy, renderGroupHeader, renderItem, items]);

  // 초기 측정이 완료되지 않았으면 측정 영역만 렌더링
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
        {unmeasuredIds.map((id) => {
          const index = items.findIndex((item) => item.id === id);
          if (index === -1) return null;
          return (
            <InitialMeasure key={id} itemId={id} onMeasured={onItemMeasured}>
              {measureRenderItem(items[index], index)}
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
            const index = items.findIndex((item) => item.id === id);
            if (index === -1) return null;
            return (
              <InitialMeasure key={id} itemId={id} onMeasured={onItemMeasured}>
                {measureRenderItem(items[index], index)}
              </InitialMeasure>
            );
          })}
        </div>
      )}
      <VirtualScroll
        ref={ref}
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
      />
    </>
  );
}

export const DynamicScroll = forwardRef(DynamicScrollInner) as <
  T extends VirtualScrollItem,
>(
  props: DynamicScrollProps<T> & { ref?: React.Ref<DynamicScrollHandle> },
) => React.ReactElement | null;
