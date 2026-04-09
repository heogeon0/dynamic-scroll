import type { ReactNode } from "react";

/**
 * 가상 스크롤에 사용되는 아이템의 기본 인터페이스.
 * 모든 아이템은 고유한 id를 가져야 한다.
 */
export interface VirtualScrollItem {
  id: string;
}

/**
 * 가시 영역 계산 결과.
 * useScrollState 훅이 반환하는 값.
 */
export interface ScrollState {
  /** 실제 뷰포트에 보이는 첫 번째 노드 인덱스 (renderAhead 미적용) */
  firstVisibleNode: number;
  /** 실제 뷰포트에 보이는 마지막 노드 인덱스 (renderAhead 미적용) */
  lastVisibleNode: number;
  /** 렌더링할 시작 인덱스 (renderAhead 적용) */
  startNode: number;
  /** 렌더링할 끝 인덱스 (renderAhead 적용) */
  endNode: number;
  /** 렌더링할 총 노드 수 */
  visibleNodeCount: number;
}

/**
 * 외부에 노출되는 imperative API.
 * ref를 통해 스크롤 제어를 할 수 있다.
 */
export interface DynamicScrollHandle {
  /** 특정 인덱스의 아이템으로 스크롤 이동 */
  scrollToItem: (index: number, align?: ScrollAlign) => void;
  /** 하단으로 스크롤 이동 */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /** 특정 offset으로 스크롤 이동 */
  scrollToOffset: (offset: number, behavior?: ScrollBehavior) => void;
  /** 현재 스크롤 offset 반환 */
  getScrollOffset: () => number;
}

/** scrollToItem의 정렬 옵션 */
export type ScrollAlign = "start" | "center" | "end";

/**
 * DynamicScroll 컴포넌트의 props.
 */
export interface DynamicScrollProps<T extends VirtualScrollItem> {
  /** 렌더링할 아이템 배열 */
  items: T[];
  /** 아이템 렌더링 함수 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 뷰포트 전후로 추가 렌더링할 아이템 수 (기본값: 8) */
  overscanCount?: number;
  /** 추정 아이템 높이. 사전 측정을 건너뛰고 이 값을 기본값으로 사용 (fallback 옵션) */
  estimatedItemSize?: number;
  /** 상단 도달 시 호출되는 콜백 (이전 데이터 로드) */
  onStartReached?: () => void | Promise<void>;
  /** 하단 도달 시 호출되는 콜백 (다음 데이터 로드) */
  onEndReached?: () => void | Promise<void>;
  /** 상단/하단 도달 감지 임계값 (px). 기본값: 0 */
  threshold?: number;
  /** 하단 고정 상태 변경 시 호출되는 콜백 */
  onAtBottomChange?: (isAtBottom: boolean) => void;
  /** flushSync로 스크롤 업데이트를 동기 처리할지 여부 (기본값: false) */
  syncScrollUpdates?: boolean;
  /** 스크롤 컨테이너에 적용할 className */
  className?: string;
  /** 스크롤 컨테이너에 적용할 style */
  style?: React.CSSProperties;
  /** 그룹 분류 함수. 아이템을 그룹핑할 키를 반환 */
  groupBy?: (item: T) => string;
  /** 그룹 헤더 렌더링 함수 */
  renderGroupHeader?: (groupKey: string) => ReactNode;
  /** 상단 로딩 중 표시할 컴포넌트 */
  loadingComponent?: ReactNode;
}

/**
 * 저수준 VirtualScroll 컴포넌트의 props.
 * 높이 측정이 이미 완료된 상태에서 사용한다.
 */
export interface VirtualScrollProps<T extends VirtualScrollItem> {
  /** 렌더링할 아이템 배열 */
  items: T[];
  /** 아이템 렌더링 함수 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 각 아이템의 누적 top 위치 배열 */
  childPositions: number[];
  /** 전체 컨텐츠 높이 */
  totalHeight: number;
  /** 높이 맵 (ref) */
  heightMapRef: React.RefObject<Map<string, number>>;
  /** 높이 변경 시 호출되는 콜백 */
  onHeightChange: (id: string, height: number) => void;
  /** 뷰포트 전후로 추가 렌더링할 아이템 수 */
  overscanCount?: number;
  /** 상단 도달 시 호출되는 콜백 */
  onStartReached?: () => void | Promise<void>;
  /** 하단 도달 시 호출되는 콜백 */
  onEndReached?: () => void | Promise<void>;
  /** 상단/하단 도달 감지 임계값 (px) */
  threshold?: number;
  /** 하단 고정 상태 변경 시 호출되는 콜백 */
  onAtBottomChange?: (isAtBottom: boolean) => void;
  /** flushSync로 스크롤 업데이트를 동기 처리할지 여부 */
  syncScrollUpdates?: boolean;
  /** 스크롤 컨테이너에 적용할 className */
  className?: string;
  /** 스크롤 컨테이너에 적용할 style */
  style?: React.CSSProperties;
  /** 백그라운드 측정 진행 중 여부 (DynamicScroll 내부용) */
  isMeasuring?: boolean;
  /** 상단 로딩 중 표시할 컴포넌트 */
  loadingComponent?: ReactNode;
}
