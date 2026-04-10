import { useCallback, useRef, useState } from "react";
import type { VirtualScrollItem } from "../types";

interface UseHeightMapParams<T extends VirtualScrollItem> {
  items: T[];
  estimatedItemSize?: number;
}

interface UseHeightMapReturn {
  heightMapRef: React.RefObject<Map<string, number>>;
  isAllMeasured: boolean;
  unmeasuredIds: string[];
  onItemMeasured: (id: string, height: number) => void;
  onHeightChange: (id: string, height: number) => void;
  version: number;
}

/**
 * 아이템 높이 맵을 관리하는 훅.
 *
 * - heightMap은 useRef<Map>으로 저장
 * - InitialMeasure: pendingIds Set으로 미측정 추적, 0이 되면 1번 리렌더
 * - ResizeObserver: rAF 배치
 */
export function useHeightMap<T extends VirtualScrollItem>({
  items,
  estimatedItemSize,
}: UseHeightMapParams<T>): UseHeightMapReturn {
  const heightMapRef = useRef<Map<string, number>>(new Map());
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const batchRafRef = useRef<number | null>(null);
  const [version, setVersion] = useState(0);

  // 미측정 아이템 계산 + pendingIds를 현재 items 기준으로 동기화
  const unmeasuredIds: string[] = [];
  const currentIds = new Set<string>();

  if (estimatedItemSize === undefined) {
    for (const item of items) {
      currentIds.add(item.id);
      if (!heightMapRef.current.has(item.id)) {
        unmeasuredIds.push(item.id);
      }
    }
    // items에서 사라진 id를 pendingIds에서 제거 (아이템 교체 시 stale pending 방지)
    for (const id of pendingIdsRef.current) {
      if (!currentIds.has(id)) {
        pendingIdsRef.current.delete(id);
      }
    }
    // 새 unmeasured를 pending에 추가
    for (const id of unmeasuredIds) {
      pendingIdsRef.current.add(id);
    }
  }

  const isAllMeasured =
    estimatedItemSize !== undefined ||
    (items.length > 0 && unmeasuredIds.length === 0);

  const onItemMeasured = useCallback((id: string, height: number) => {
    heightMapRef.current.set(id, height);
    pendingIdsRef.current.delete(id);

    if (pendingIdsRef.current.size === 0) {
      setVersion((v) => v + 1);
    }
  }, []);

  const onHeightChange = useCallback((id: string, height: number) => {
    const cur = heightMapRef.current.get(id);
    if (cur === height) return;

    heightMapRef.current.set(id, height);

    if (batchRafRef.current === null) {
      batchRafRef.current = requestAnimationFrame(() => {
        batchRafRef.current = null;
        setVersion((v) => v + 1);
      });
    }
  }, []);

  return {
    heightMapRef,
    isAllMeasured,
    unmeasuredIds,
    onItemMeasured,
    onHeightChange,
    version,
  };
}
