import { useMemo } from "react";
import type { VirtualScrollItem } from "../types";

interface GroupInfo {
  /** 그룹 키 → 해당 그룹의 전체 높이 */
  heightByGroup: Map<string, number>;
  /** 그룹 키 → 해당 그룹 아래 모든 그룹의 누적 높이 (sticky 헤더 height 제한용) */
  cumulativeHeightByGroup: Map<string, number>;
  /** 인덱스 → 해당 아이템이 속한 그룹 키 */
  groupKeyByIndex: string[];
}

/**
 * 그룹별 높이 정보를 계산하는 훅.
 *
 * sticky group header의 height 제한에 사용된다.
 * cumulativeHeightByGroup은 최신 그룹부터 0, 이전 그룹일수록 아래 그룹들의 누적 높이.
 *
 * @param items - 아이템 배열
 * @param groupBy - 아이템을 그룹핑할 키를 반환하는 함수
 * @param heightMapRef - 높이 맵 ref
 * @param version - heightMap 변경 트리거용 버전
 */
export function useGroupPositions<T extends VirtualScrollItem>(
  items: T[],
  groupBy: ((item: T) => string) | undefined,
  heightMapRef: React.RefObject<Map<string, number>>,
  version: number,
): GroupInfo | null {
  return useMemo(() => {
    if (!groupBy || items.length === 0) return null;

    const heightByGroup = new Map<string, number>();
    const groupKeyByIndex: string[] = [];
    const groupOrder: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const key = groupBy(items[i]);
      groupKeyByIndex.push(key);

      const itemHeight = heightMapRef.current.get(items[i].id) ?? 0;
      const current = heightByGroup.get(key) ?? 0;
      heightByGroup.set(key, current + itemHeight);

      if (!groupOrder.includes(key)) {
        groupOrder.push(key);
      }
    }

    // 누적 높이 계산 (마지막 그룹 = 0, 이전 그룹 = 아래 그룹들의 합)
    const cumulativeHeightByGroup = new Map<string, number>();
    let cumulative = 0;

    for (let i = groupOrder.length - 1; i >= 0; i--) {
      cumulativeHeightByGroup.set(groupOrder[i], cumulative);
      cumulative += heightByGroup.get(groupOrder[i]) ?? 0;
    }

    return { heightByGroup, cumulativeHeightByGroup, groupKeyByIndex };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, groupBy, version]);
}
