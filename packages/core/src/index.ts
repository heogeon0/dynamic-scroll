// --- 메인 컴포넌트 ---
export { DynamicScroll } from "./DynamicScroll";
export { VirtualScroll } from "./components/VirtualScroll";
export { Measure } from "./components/Measure";
export { InitialMeasure } from "./components/InitialMeasure";
export { StickyGroupHeader } from "./components/StickyGroupHeader";

// --- 훅 ---
export { useScrollState } from "./hooks/useScrollState";
export { usePositions } from "./hooks/usePositions";
export { useHeightMap } from "./hooks/useHeightMap";
export { useGroupPositions } from "./hooks/useGroupPositions";

// --- 유틸리티 ---
export {
  generateStartNodeIndex,
  generateEndNodeIndex,
  generateCenteredStartNodeIndex,
} from "./utils/binarySearch";

// --- 타입 ---
export type {
  VirtualScrollItem,
  ScrollState,
  DynamicScrollHandle,
  ScrollAlign,
  InitialScrollPosition,
  DynamicScrollProps,
  VirtualScrollProps,
} from "./types";

// 디버그 로그 스위치 — 기본은 꺼짐. 라이브러리가 남의 콘솔을 더럽히지 않는다.
export { setDebug } from "./debug";
