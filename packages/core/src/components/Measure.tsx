import { memo, useEffect, useRef, useState } from "react";

interface MeasureProps {
  children: React.ReactNode;
  /** 아이템 고유 식별자 */
  itemId: string;
  /** absolute top 위치 (px) */
  position: number;
  /** 높이 변경 시 호출되는 콜백 */
  onHeightChange: (id: string, height: number) => void;
  /** 사전 측정된 높이 (InitialMeasure에서 측정한 값). 깜빡임 방지용 높이 잠금에 사용 */
  knownHeight?: number;
}

/**
 * 가상 스크롤 내 각 아이템을 감싸는 컴포넌트.
 *
 * 높이 잠금 메커니즘:
 * 1. knownHeight가 있으면 height style로 잠금 (이미지 재로드 중 깜빡임 방지)
 * 2. MutationObserver로 내부 DOM 변경 감지 (이미지 로드 등)
 * 3. 변경 감지 → height style 제거 (자연 리플로우)
 * 4. ResizeObserver로 새 높이 감지 → onHeightChange 호출
 */
function MeasureInner({
  children,
  itemId,
  position,
  onHeightChange,
  knownHeight,
}: MeasureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef<number>(0);
  const [heightLocked, setHeightLocked] = useState(!!knownHeight);

  // --- ResizeObserver: 높이 변경 감지 ---
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

  // --- MutationObserver: 내부 DOM 변경 시 높이 잠금 해제 ---
  useEffect(() => {
    if (!heightLocked) return;
    const node = ref.current;
    if (!node) return;

    const mutationObserver = new MutationObserver(() => {
      // 내부 요소 변경 감지 → 높이 잠금 해제 → 리플로우 허용
      setHeightLocked(false);
    });

    mutationObserver.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "width", "height"],
    });

    return () => {
      mutationObserver.disconnect();
    };
  }, [heightLocked]);

  return (
    <div
      data-dynamic-scroll-item={itemId}
      style={{
        position: "absolute",
        top: position,
        left: 0,
        width: "100%",
        ...(heightLocked && knownHeight ? { height: knownHeight, overflow: "hidden" } : {}),
      }}
      ref={ref}
    >
      {children}
    </div>
  );
}

export const Measure = memo(MeasureInner);
