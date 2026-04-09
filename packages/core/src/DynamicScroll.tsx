import { forwardRef, useMemo, useRef, useState } from "react";
import type {
  DynamicScrollHandle,
  DynamicScrollProps,
  VirtualScrollItem,
} from "./types";
import { useHeightMap } from "./hooks/useHeightMap";
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

  // childPositions 계산
  const childPositions = useMemo(() => {
    const positions = [0];
    for (let i = 0; i < items.length; i++) {
      const height =
        heightMapRef.current.get(items[i].id) ?? estimatedItemSize ?? 0;
      positions.push(positions[i] + height);
    }
    return positions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, version, estimatedItemSize]);

  const totalHeight =
    childPositions.length > 1
      ? childPositions[childPositions.length - 1]
      : 0;

  const groupInfo = useGroupPositions(items, groupBy, heightMapRef, version);

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
              {renderItem(items[index], index)}
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
                {renderItem(items[index], index)}
              </InitialMeasure>
            );
          })}
        </div>
      )}
      <VirtualScroll
        ref={ref}
        items={items}
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
      />
    </>
  );
}

export const DynamicScroll = forwardRef(DynamicScrollInner) as <
  T extends VirtualScrollItem,
>(
  props: DynamicScrollProps<T> & { ref?: React.Ref<DynamicScrollHandle> },
) => React.ReactElement | null;
