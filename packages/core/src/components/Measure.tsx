import { memo, useEffect, useRef } from "react";

interface MeasureProps {
  children: React.ReactNode;
  /** 아이템 고유 식별자 */
  itemId: string;
  /** absolute top 위치 (px) */
  position: number;
  /** 높이 변경 시 호출되는 콜백 */
  onHeightChange: (id: string, height: number) => void;
}

/**
 * 가상 스크롤 내 각 아이템을 감싸는 컴포넌트.
 *
 * - absolute positioning으로 top 위치를 지정
 * - ResizeObserver로 높이 변경을 실시간 감지
 * - 높이가 변경되면 onHeightChange 콜백 호출
 * - React.memo로 불필요한 리렌더링 방지
 */
function MeasureInner({
  children,
  itemId,
  position,
  onHeightChange,
}: MeasureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef<number>(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const newHeight = Math.ceil(node.offsetHeight);
      if (prevHeightRef.current === newHeight) return;
      prevHeightRef.current = newHeight;
      onHeightChange(itemId, newHeight);
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [itemId, onHeightChange]);

  return (
    <div
      data-dynamic-scroll-item={itemId}
      style={{
        position: "absolute",
        top: position,
        left: 0,
        width: "100%",
      }}
      ref={ref}
    >
      {children}
    </div>
  );
}

export const Measure = memo(MeasureInner);
