import { useMemo } from "react";
import type { VirtualScrollItem } from "../types";

interface UsePositionsParams<T extends VirtualScrollItem> {
  /** 아이템 배열 */
  items: T[];
  /** 높이 맵 ref (useHeightMap에서 제공) */
  heightMapRef: React.RefObject<Map<string, number>>;
  /** heightMap 변경 시 재계산 트리거용 버전 (useHeightMap에서 제공) */
  version: number;
  /** 추정 아이템 높이 (미측정 아이템의 fallback) */
  estimatedItemSize?: number;
}

interface UsePositionsReturn {
  /** 각 아이템의 누적 top 위치 배열. positions[i] = i번째 아이템의 top. positions[length] = totalHeight */
  childPositions: number[];
  /** 전체 컨텐츠 높이 */
  totalHeight: number;
}

/**
 * heightMapRef + version을 기반으로 childPositions를 계산하는 훅.
 *
 * - heightMapRef는 useHeightMap에서 관리하는 ref를 그대로 받는다
 * - version이 변경될 때마다 useMemo가 재계산된다
 * - 미측정 아이템은 estimatedItemSize 또는 0으로 처리
 */
export function usePositions<T extends VirtualScrollItem>({
  items,
  heightMapRef,
  version,
  estimatedItemSize,
}: UsePositionsParams<T>): UsePositionsReturn {
  const childPositions = useMemo(() => {
    const positions = [0];
    for (let i = 0; i < items.length; i++) {
      const height =
        heightMapRef.current.get(items[i].id) ?? estimatedItemSize ?? 0;
      positions.push(positions[i] + height);
    }
    return positions;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version은 heightMap 변경의 프록시
  }, [items, version, estimatedItemSize]);

  const totalHeight =
    childPositions.length > 1
      ? childPositions[childPositions.length - 1]
      : 0;

  return { childPositions, totalHeight };
}
