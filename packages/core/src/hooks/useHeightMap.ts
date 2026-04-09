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

  // 미측정 아이템 계산
  const unmeasuredIds: string[] = [];
  if (estimatedItemSize === undefined) {
    for (const item of items) {
      if (!heightMapRef.current.has(item.id)) {
        unmeasuredIds.push(item.id);
        pendingIdsRef.current.add(item.id);
      }
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
