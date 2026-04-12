# DynamicScroll

**사전 렌더링 기반 채팅앱 최적화 가상 스크롤 라이브러리**

> [Documentation & Demo](<!-- DOCS_URL -->)

메신저 서비스를 개발하면서, 각 요소의 높이를 알 수 없는 상황에서도 사용할 수 있는 가상 스크롤 라이브러리입니다.

기존 가상 스크롤 라이브러리는 요소의 높이를 추정한 뒤 렌더링 후 보정하는 방식으로, 스크롤 점프와 레이아웃 시프트가 불가피했습니다.
**사전 렌더링**을 통해 요소의 높이를 먼저 측정하여 이 문제를 해결하고, 이를 바탕으로 무한 스크롤과 채팅 기능을 구현했습니다.

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **사전 렌더링 기반 가상 스크롤** | 숨겨진 영역에서 실제 DOM 높이를 먼저 측정하여 스크롤 점프와 레이아웃 시프트를 원천 차단 |
| **이진 탐색 O(log n)** | 정렬된 누적합 배열에서 이진 탐색으로 화면에 보여줄 첫 번째 아이템을 빠르게 탐색 |
| **Height Locking** | 사전 측정된 높이를 인라인 스타일로 잠궈 이미지 로드 시 깜빡임 방지 |
| **Sticky Group Header** | Slack 코드 분석에서 발견한 GroupWrapper + Separator 이중 구조로 가상 스크롤에서 떠다니는 날짜 라벨 구현 |
| **양방향 무한 스크롤** | guard ref 패턴으로 위/아래 데이터 로드 시 스크롤 위치 정확하게 보존 |
| **스크롤 API 큐잉** | 측정 중 호출된 scrollToItem/scrollToBottom을 저장해두었다가 측정 완료 후 자동 실행 |
| **Headless** | 스타일링 없이 가상화 엔진 + 스크롤 제어 API만 제공 |

## 아키텍처

```
DynamicScroll (orchestrator)
│
├─ Phase 1: Measure
│  InitialMeasure (visibility: hidden)
│  → useRef<Map> heightMap (측정 중 리렌더 0회)
│  → img.onload 대기 + 5초 타임아웃 fallback
│
├─ Phase 2: Compute
│  childPositions = 누적합 (prefix sum)
│  totalHeight = positions[last]
│
└─ Phase 3: Render (VirtualScroll)
   scrollTop → 이진 탐색 O(log n)
   → startNode / endNode 결정
   → Measure (ResizeObserver + Height Locking)
   → GroupWrapper + Separator (Sticky Header)
```

## 설치

```bash
npm install @dynamic-scroll/core
```

## 사용법

```tsx
import { DynamicScroll } from "@dynamic-scroll/core";

function App() {
  return (
    <DynamicScroll
      items={items}
      renderItem={(item) => <div>{item.content}</div>}
      style={{ height: 600 }}
    />
  );
}
```

## 비교

| 특성 | dynamic-scroll | react-virtuoso | @tanstack/virtual |
|------|---------------|----------------|-------------------|
| 높이 측정 | 사전 렌더링 (정확) | 추정 후 보정 | 추정 후 보정 |
| 스크롤바 정확도 | 처음부터 정확 | 보정 중 점프 | 보정 중 점프 |
| scrollToItem | 정확 | 측정 전 부정확 | 측정 전 부정확 |
| 양방향 무한 스크롤 | 내장 | 내장 | 수동 구현 |
| Sticky Group Header | 내장 (push-up) | 내장 | 수동 구현 |
| Headless | Yes | No | Yes |

## 기술 스택

- React 19
- TypeScript
- Turborepo (monorepo)
- Next.js (docs)

## License

MIT
