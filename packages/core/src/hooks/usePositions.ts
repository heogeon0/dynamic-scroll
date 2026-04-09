import { useCallback, useRef, useState } from "react";
import type { VirtualScrollItem } from "../types";

interface UsePositionsParams<T extends VirtualScrollItem> {
  /** 아이템 배열 */
  items: T[];
  /** 추정 아이템 높이 (사전 측정 전 fallback) */
  estimatedItemSize?: number;
}

interface UsePositionsReturn {
  /** 각 아이템의 누적 top 위치 배열. positions[i] = i번째 아이템의 top. positions[length] = totalHeight */
  childPositions: number[];
  /** 전체 컨텐츠 높이 */
  totalHeight: number;
  /** 높이 맵 ref (리렌더 없이 O(1) 접근) */
  heightMapRef: React.RefObject<Map<string, number>>;
  /**
   * 개별 아이템 높이를 업데이트한다. ref만 변경하므로 리렌더가 발생하지 않는다.
   * 배치 업데이트가 예약되어 동일 프레임 내 여러 변경이 1번의 리렌더로 처리된다.
   */
  updateHeight: (id: string, height: number) => void;
  /** positions 재계산을 즉시 트리거한다 (모든 측정 완료 시 호출) */
  flushPositions: () => void;
  /** 리렌더 트리거용 버전 카운터 (내부용) */
  version: number;
}

/**
 * heightMap을 useRef<Map>으로 관리하고, childPositions를 계산하는 훅.
 *
 * 핵심 개선:
 * - 개별 높이 업데이트 시 ref만 변경 → 리렌더 없음
 * - rAF로 배치하여 동일 프레임 내 여러 변경을 1번의 positions 재계산으로 처리
 * - flushPositions()로 즉시 재계산 트리거 가능
 */
export function usePositions<T extends VirtualScrollItem>({
  items,
  estimatedItemSize,
}: UsePositionsParams<T>): UsePositionsReturn {
  const heightMapRef = useRef<Map<string, number>>(new Map());
  const batchRafRef = useRef<number | null>(null);

  // version이 변경되면 childPositions useMemo가 재계산된다
  const [version, setVersion] = useState(0);

  /**
   * positions 재계산을 트리거한다.
   * version state를 증가시켜 리렌더를 발생시키고,
   * 리렌더 시 childPositions가 현재 heightMapRef 기준으로 재계산된다.
   */
  const flushPositions = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  /**
   * 개별 아이템 높이를 업데이트한다.
   * - ref만 변경하므로 즉시 리렌더가 발생하지 않는다.
   * - rAF로 배치하여 동일 프레임 내 여러 호출을 1번으로 묶는다.
   */
  const updateHeight = useCallback(
    (id: string, height: number) => {
      const currentHeight = heightMapRef.current.get(id);
      if (currentHeight === height) return;

      heightMapRef.current.set(id, height);

      // rAF 배치: 동일 프레임 내 여러 updateHeight 호출을 1번의 flushPositions로 처리
      if (batchRafRef.current === null) {
        batchRafRef.current = requestAnimationFrame(() => {
          batchRafRef.current = null;
          flushPositions();
        });
      }
    },
    [flushPositions],
  );

  // version 또는 items가 변경될 때 childPositions 재계산
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version은 heightMap 변경의 프록시
  const childPositions = computePositions(
    items,
    heightMapRef.current,
    estimatedItemSize,
  );

  const totalHeight =
    childPositions.length > 0
      ? childPositions[childPositions.length - 1]
      : 0;

  return {
    childPositions,
    totalHeight,
    heightMapRef,
    updateHeight,
    flushPositions,
    version,
  };
}

/**
 * heightMap 기반으로 누적 위치 배열을 계산한다.
 *
 * @returns positions[i] = i번째 아이템의 top 위치.
 *          positions[items.length] = 전체 높이 (totalHeight).
 */
function computePositions(
  items: VirtualScrollItem[],
  heightMap: Map<string, number>,
  estimatedItemSize?: number,
): number[] {
  const positions = [0];
  for (let i = 0; i < items.length; i++) {
    const height =
      heightMap.get(items[i].id) ?? estimatedItemSize ?? 0;
    positions.push(positions[i] + height);
  }
  return positions;
}
