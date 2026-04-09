import type { ReactNode } from "react";

interface StickyGroupHeaderProps {
  /** 현재 표시할 그룹 키 */
  groupKey: string;
  /** 그룹 헤더 렌더링 함수 */
  renderGroupHeader: (groupKey: string) => ReactNode;
  /** 전체 컨텐츠 높이 */
  totalHeight: number;
  /** 해당 그룹 아래 모든 그룹의 누적 높이 */
  cumulativeHeight: number;
  /** 상단 오프셋 (px) */
  topOffset?: number;
}

/**
 * Sticky Group Header 컴포넌트.
 *
 * 가상 스크롤에서 CSS position:sticky가 동작하지 않는 문제를 해결한다.
 * (absolute positioned 아이템들과 sticky는 호환되지 않음)
 *
 * 구현 방식:
 * - position: sticky + top: 0으로 고정
 * - height를 totalHeight - cumulativeHeight로 제한하여
 *   해당 그룹 영역이 끝나면 자연스럽게 밀려 올라가는 push-up 효과 구현
 * - z-index로 아이템들 위에 표시
 */
export function StickyGroupHeader({
  groupKey,
  renderGroupHeader,
  totalHeight,
  cumulativeHeight,
  topOffset = 0,
}: StickyGroupHeaderProps) {
  return (
    <div
      data-dynamic-scroll-group-header={groupKey}
      style={{
        position: "sticky",
        top: topOffset,
        zIndex: 1,
        height: totalHeight - cumulativeHeight,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        {renderGroupHeader(groupKey)}
      </div>
    </div>
  );
}
