import { useCallback, useRef, useState } from "react";
import type { VirtualScrollItem } from "../types";

interface UseHeightMapParams<T extends VirtualScrollItem> {
  items: T[];
  estimatedItemSize?: number;
  /** 한 번에 숨겨서 잴 아이템 수. 기본 DEFAULT_MEASURE_CHUNK_SIZE */
  measureChunkSize?: number;
}

/**
 * 한 번에 재는 아이템 수.
 *
 * 사전 측정은 **안 잰 아이템을 실제로 그려야** 높이를 알 수 있다. 그래서 안 잰 것을
 * 전부 한 번에 그리면 그 수만큼 DOM 이 한꺼번에 만들어지고, 수만 건이면 브라우저가
 * 통째로 잠긴다 (실측 2026-08-02: 5만 건을 넘겼더니 페이지가 열리지 않았다).
 *
 * 그래서 나눠서 잰다. 한 덩이를 다 재면 리렌더가 한 번 나고 다음 덩이가 그려지므로,
 * 측정이 프레임에 걸쳐 퍼진다 — 느릴 수는 있어도 화면이 멈추지는 않는다.
 * **"측정 중 리렌더 0회"는 덩이 안에서 그대로 유지된다** (덩이당 1회).
 */
export const DEFAULT_MEASURE_CHUNK_SIZE = 200;

interface UseHeightMapReturn {
  heightMapRef: React.RefObject<Map<string, number>>;
  isAllMeasured: boolean;
  /** 이번 덩이에서 잴 id 들. 전체가 아니다 — 전체 수는 unmeasuredTotal */
  unmeasuredIds: string[];
  /** 아직 못 잰 전체 수 (진행 상황 표시·디버그용) */
  unmeasuredTotal: number;
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
  measureChunkSize = DEFAULT_MEASURE_CHUNK_SIZE,
}: UseHeightMapParams<T>): UseHeightMapReturn {
  const heightMapRef = useRef<Map<string, number>>(new Map());
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const batchRafRef = useRef<number | null>(null);
  const [version, setVersion] = useState(0);

  // 미측정 아이템 계산 + pendingIds를 현재 items 기준으로 동기화
  let unmeasuredTotal = 0;
  let unmeasuredIds: string[] = [];
  const currentIds = new Set<string>();

  if (estimatedItemSize === undefined) {
    for (const item of items) {
      currentIds.add(item.id);
      if (!heightMapRef.current.has(item.id)) {
        unmeasuredTotal++;
        // 이번 덩이만 담는다. 전부 담으면 그만큼 DOM 을 한 번에 그리게 된다.
        if (unmeasuredIds.length < measureChunkSize) unmeasuredIds.push(item.id);
      }
    }
    // items에서 사라진 id를 pendingIds에서 제거 (아이템 교체 시 stale pending 방지)
    for (const id of pendingIdsRef.current) {
      if (!currentIds.has(id)) {
        pendingIdsRef.current.delete(id);
      }
    }
    // **이번 덩이만** pending 에 둔다. 안 그리는 id 를 pending 에 남기면
    // 그 id 는 영원히 측정되지 않아 pendingIds 가 안 비고, 리렌더가 안 나서
    // 다음 덩이도 못 그린다 — 교착이다.
    const chunk = new Set(unmeasuredIds);
    for (const id of pendingIdsRef.current) {
      if (!chunk.has(id)) pendingIdsRef.current.delete(id);
    }
    for (const id of unmeasuredIds) {
      pendingIdsRef.current.add(id);
    }
  }

  const isAllMeasured =
    estimatedItemSize !== undefined ||
    (items.length > 0 && unmeasuredTotal === 0);

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
    unmeasuredTotal,
    onItemMeasured,
    onHeightChange,
    version,
  };
}
