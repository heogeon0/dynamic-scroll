import { useEffect, useRef } from "react";
import { debugLog, isDebugEnabled } from "../debug";

interface InitialMeasureProps {
  children: React.ReactNode;
  itemId: string;
  onMeasured: (id: string, height: number) => void;
}

const IMAGE_LOAD_TIMEOUT = 5000;

/**
 * 사전 높이 측정용 컴포넌트.
 * visibility: hidden으로 렌더링하여 실제 높이를 측정한다.
 * 이미지가 있으면 onload를 대기한다.
 */
export function InitialMeasure({
  children,
  itemId,
  onMeasured,
}: InitialMeasureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || reportedRef.current) return;

    const report = (reason: string) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      const height = Math.ceil(node.offsetHeight);
      // 아래 imgInfo 는 **로그에만** 쓰인다. 가드 밖에 두면 측정하는 아이템마다
      // img 를 전부 훑게 되는데, 채팅처럼 항목이 많으면 그 비용이 그대로 쌓인다.
      if (isDebugEnabled()) {
        const imgInfo = Array.from(node.querySelectorAll("img")).map((img) => ({
          complete: img.complete,
          naturalHeight: img.naturalHeight,
          offsetHeight: img.offsetHeight,
          src: img.src.slice(-40),
        }));
        debugLog(
          `[InitialMeasure] ${itemId} → ${height}px (${reason})`,
          imgInfo.length > 0 ? imgInfo : "no images",
        );
      }
      onMeasured(itemId, Math.max(height, 1));
    };

    // 이미지 체크
    const images = node.querySelectorAll("img");
    const pending: HTMLImageElement[] = [];
    images.forEach((img) => {
      if (!img.complete) pending.push(img);
    });

    if (pending.length === 0) {
      queueMicrotask(() => report(images.length > 0 ? "images already complete" : "no images"));
      return;
    }

    debugLog(`[InitialMeasure] ${itemId} waiting for ${pending.length} image(s)`);

    let remaining = pending.length;
    const onSettled = () => {
      remaining--;
      if (remaining <= 0) report("image load/error");
    };

    pending.forEach((img) => {
      img.addEventListener("load", onSettled, { once: true });
      img.addEventListener("error", onSettled, { once: true });
    });

    const timeout = setTimeout(() => report("timeout"), IMAGE_LOAD_TIMEOUT);

    return () => {
      clearTimeout(timeout);
      pending.forEach((img) => {
        img.removeEventListener("load", onSettled);
        img.removeEventListener("error", onSettled);
      });
    };
  }, [itemId, onMeasured]);

  return (
    <div
      ref={ref}
      data-dynamic-scroll-measure={itemId}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}
