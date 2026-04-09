import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HowItWorksPage() {
  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold tracking-tight">구현 원리</h1>

      <section id="virtual-scroll" className="space-y-4">
        <h2 className="text-2xl font-semibold">가상 스크롤 원리</h2>
        <p className="text-muted-foreground">
          가상 스크롤은 뷰포트에 보이는 아이템만 실제 DOM으로 렌더링합니다.
          수만 개의 아이템이 있어도 DOM 노드는 수십 개로 유지됩니다.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">핵심 구조</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`┌─ 스크롤 컨테이너 (overflow: auto) ──────────────┐
│                                                   │
│  ┌─ 컨텐츠 영역 (height: totalHeight) ─────────┐ │
│  │                                               │ │
│  │  [ 뷰포트 위 숨겨진 아이템들 ]                │ │
│  │                                               │ │
│  │  ┌─ 렌더링된 아이템 (absolute positioned) ──┐ │ │
│  │  │  Item[startNode]   top: positions[start] │ │ │
│  │  │  Item[startNode+1] top: positions[s+1]   │ │ │
│  │  │  ...                                     │ │ │
│  │  │  Item[endNode]     top: positions[end]   │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │  [ 뷰포트 아래 숨겨진 아이템들 ]              │ │
│  └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘

childPositions = [0, h0, h0+h1, h0+h1+h2, ...]
                  ↑    ↑       ↑
              아이템0  아이템1  아이템2  의 top 위치`}
            </pre>
          </CardContent>
        </Card>

        <div className="space-y-2 text-sm">
          <p>
            각 아이템은 <code className="bg-muted px-1 rounded">position: absolute</code>와
            <code className="bg-muted px-1 rounded">childPositions</code> 배열의 top 값으로 위치가 결정됩니다.
            컨텐츠 영역의 높이를 <code className="bg-muted px-1 rounded">totalHeight</code>로 설정하여
            전체 컨텐츠를 정확하게 나타내는 자연스러운 스크롤바가 생성됩니다.
          </p>
          <p>
            사용자가 스크롤하면 <code className="bg-muted px-1 rounded">scrollTop</code> 변경이
            뷰포트 내 아이템 범위를 재계산합니다. 해당 아이템(+ overscan 버퍼)만
            실제 DOM 노드로 렌더링됩니다.
          </p>
        </div>
      </section>

      <Separator />

      <section id="binary-search" className="space-y-4">
        <h2 className="text-2xl font-semibold">이진 탐색 알고리즘</h2>
        <p className="text-muted-foreground">
          주어진 scrollTop 위치에 해당하는 아이템을 찾기 위해, 정렬된 childPositions 배열에서
          이진 탐색을 사용합니다. O(n) 대신 O(log n).
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">generateStartNodeIndex 탐색 과정</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`childPositions: [0, 50, 120, 200, 350, 420, 500, 580, 700]
scrollTop: 340

1단계: 범위 [0, 7], mid=3, 중심점=(200+350)/2=275
       275 <= 340 → 오른쪽 탐색, 범위 [3, 7]

2단계: 범위 [3, 7], mid=5, 중심점=(420+500)/2=460
       460 > 340 → 왼쪽 탐색, 범위 [3, 5]

3단계: 범위 [3, 5], mid=4, 중심점=(350+420)/2=385
       385 > 340 → 왼쪽 탐색, 범위 [3, 4]

4단계: 범위 [3, 4], mid=3, 중심점=(200+350)/2=275
       275 <= 340 && 350 > 340 → 찾음! 인덱스 3 반환

결과: 인덱스 3의 아이템 (top: 200px, bottom: 350px)이 scrollTop 340을 포함`}
            </pre>
          </CardContent>
        </Card>

        <p className="text-sm">
          비교 기준으로 <strong>노드 중심점</strong>(아이템 top과 bottom의 중간값)을 사용합니다.
          이렇게 하면 시작점만이 아니라, 해당 scrollTop 위치를 실제로 포함하고 있는
          아이템을 정확하게 찾을 수 있습니다.
        </p>
      </section>

      <Separator />

      <section id="measurement" className="space-y-4">
        <h2 className="text-2xl font-semibold">높이 측정 시스템</h2>
        <p className="text-muted-foreground">
          이 라이브러리의 핵심 차별점: 가상 스크롤이 시작되기 전에 실제 DOM 높이를 측정합니다.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">측정 흐름</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`1단계: 사전 측정 (InitialMeasure)
┌─────────────────────────────────────────────────┐
│  컨테이너 (보이는 영역)                          │
│  ┌─ 숨겨진 영역 (visibility: hidden) ──────────┐ │
│  │  InitialMeasure[item-0] → 72px    ─┐        │ │
│  │  InitialMeasure[item-1] → 148px    │ ref.set │ │
│  │  InitialMeasure[item-2] → 56px     │ (리렌더│ │
│  │  ...                               │  없음) │ │
│  │  InitialMeasure[item-n] → 200px   ─┘        │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  미측정 카운트가 0이 되면 → 1번만 setState         │
│  isAllMeasured = true → VirtualScroll 렌더링      │
└─────────────────────────────────────────────────┘

2단계: 런타임 측정 (ResizeObserver)
┌─────────────────────────────────────────────────┐
│  VirtualScroll (활성)                            │
│  ┌─ Measure[item-5] ───────────────────────────┐ │
│  │  ResizeObserver가 높이 변경 감지             │ │
│  │  (예: 이미지 로드: 56px → 280px)             │ │
│  │  → heightMapRef.set("item-5", 280)           │ │
│  │  → rAF 배치 → 1번만 setState                │ │
│  │  → childPositions 재계산                     │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

핵심: useRef<Map>이므로 N번 측정 = 리렌더 0번
     모든 측정 완료 시 딱 1번만 리렌더`}
            </pre>
          </CardContent>
        </Card>

        <div className="space-y-2 text-sm">
          <p>
            <strong>InitialMeasure</strong>는 각 아이템을 숨겨진 영역에 렌더링하고
            이미지 로드를 대기합니다 (<code className="bg-muted px-1 rounded">img.onload</code> + 3초 타임아웃 fallback).
            높이는 <code className="bg-muted px-1 rounded">useRef&lt;Map&gt;</code>에 저장되므로
            측정 중에는 React 리렌더가 발생하지 않습니다.
          </p>
          <p>
            <strong>Measure</strong>는 렌더링된 각 아이템을 ResizeObserver로 감시합니다.
            런타임에 높이가 변경되면(이미지 로드, 동적 컨텐츠 등)
            <code className="bg-muted px-1 rounded">requestAnimationFrame</code>으로 배치하여
            같은 프레임 내 여러 변경을 1번의 위치 재계산으로 처리합니다.
          </p>
        </div>
      </section>
    </div>
  );
}
