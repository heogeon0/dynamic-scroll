import { useMemo } from "react";
import type { ScrollState } from "../types";
import {
  generateStartNodeIndex,
  generateEndNodeIndex,
} from "../utils/binarySearch";

interface UseScrollStateParams {
  /** 현재 스크롤 위치 */
  scrollTop: number;
  /** 전체 아이템 수 */
  itemCount: number;
  /** 뷰포트 전후로 추가 렌더링할 아이템 수 (기본값: 8) */
  overscanCount?: number;
  /** 뷰포트 높이 */
  viewportHeight: number;
  /** 각 아이템의 누적 top 위치 배열 */
  childPositions: number[];
}

/**
 * scrollTop과 childPositions를 기반으로 가시 영역의 노드 범위를 계산하는 훅.
 *
 * - generateStartNodeIndex: 이진탐색 O(log n)으로 시작 노드 계산
 * - generateEndNodeIndex: 이진탐색 O(log n)으로 끝 노드 계산
 * - overscanCount만큼 전후로 버퍼를 추가하여 스크롤 시 빈 영역 방지
 */
export function useScrollState({
  scrollTop,
  itemCount,
  overscanCount = 8,
  viewportHeight,
  childPositions,
}: UseScrollStateParams): ScrollState {
  const firstVisibleNode = useMemo(
    () => generateStartNodeIndex(scrollTop, childPositions, itemCount),
    [scrollTop, childPositions, itemCount],
  );

  const lastVisibleNode = useMemo(
    () =>
      generateEndNodeIndex(
        childPositions,
        firstVisibleNode,
        itemCount,
        viewportHeight,
      ),
    [childPositions, firstVisibleNode, itemCount, viewportHeight],
  );

  const startNode = Math.max(0, firstVisibleNode - overscanCount);
  const endNode = Math.min(itemCount - 1, lastVisibleNode + overscanCount);
  const visibleNodeCount = Math.max(0, endNode - startNode + 1);

  return {
    firstVisibleNode,
    lastVisibleNode,
    startNode,
    endNode,
    visibleNodeCount,
  };
}
