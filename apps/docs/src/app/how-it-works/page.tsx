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
            이미지 로드를 대기합니다 (<code className="bg-muted px-1 rounded">img.onload</code> + 5초 타임아웃 fallback).
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3단계: 높이 잠금 (Height Locking)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`문제: 이미지가 포함된 아이템의 높이 깜빡임
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
InitialMeasure에서 이미지 로드 대기 → 정확한 높이 측정 (148px)
                    ↓
VirtualScroll에서 실제 렌더
  → 브라우저가 img를 다시 로드 (캐시 miss 가능)
  → 초기: 이미지 없는 높이 (32px) ← 깜빡!
  → 이후: 이미지 로드 완료 (148px)

해결: Measure 컴포넌트의 높이 잠금
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─ Measure[item-5] ──────────────────────────────┐
│                                                 │
│  ① 마운트 시: knownHeight(148px) → height 잠금  │
│     style={{ height: 148px, overflow: hidden }} │
│     → 이미지 로드 전에도 148px 유지 (깜빡임 X)  │
│                                                 │
│  ② MutationObserver가 내부 DOM 변경 감지        │
│     (img 로드 완료, src 변경, 자식 추가 등)     │
│     → height style 제거 (잠금 해제)             │
│     → 브라우저가 자연 리플로우                   │
│                                                 │
│  ③ ResizeObserver가 새 높이 감지                │
│     → onHeightChange → heightMap 갱신           │
│     → childPositions 재계산                     │
└─────────────────────────────────────────────────┘`}
            </pre>
            <p className="text-sm text-muted-foreground mt-3">
              <strong>knownHeight</strong>는 InitialMeasure에서 측정된 값으로,
              heightMap에 이미 저장되어 있습니다.
              Measure가 마운트될 때 이 값을 인라인 height style로 적용하면,
              이미지가 아직 로드되지 않았더라도 사전 측정된 높이가 유지됩니다.
              내부 콘텐츠가 실제로 변경된 경우에만 잠금을 해제하여 리플로우를 허용합니다.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="bidirectional-scroll" className="space-y-4">
        <h2 className="text-2xl font-semibold">양방향 무한 스크롤</h2>
        <p className="text-muted-foreground">
          채팅 앱처럼 상단(과거)과 하단(미래) 양방향으로 데이터를 로드할 때,
          스크롤 위치를 정확하게 보존하는 것이 핵심 과제입니다.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">문제: prepend vs append</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`Backward (prepend) — 위로 스크롤해서 과거 메시지 로드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [새 아이템들]  ← 상단에 삽입됨
  ───────────
  [기존 아이템]  ← 유저가 보고 있던 위치
  ───────────
  문제: 위에 컨텐츠가 추가되면 scrollTop은 그대로인데
       기존 아이템의 위치가 아래로 밀림 → 화면이 점프

Forward (append) — 아래로 스크롤해서 새 메시지 로드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [기존 아이템]  ← 유저가 보고 있던 위치
  ───────────
  [새 아이템들]  ← 하단에 삽입됨
  ───────────
  문제: stick-to-bottom이 활성화되어 있으면
       새 아이템 추가 시 자동으로 맨 아래로 끌려감`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">해결: 방향별 가드 ref + totalHeight effect</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`┌─ 도달 감지 (scrollTop 변경 시) ───────────────────┐
│                                                     │
│  상단 도달? → backwardLoadingRef = true              │
│              prevScrollHeightRef = el.scrollHeight   │
│              onStartReached() 호출                   │
│                                                     │
│  하단 도달? → forwardLoadingRef = true               │
│              onEndReached() 호출                     │
└─────────────────────────────────────────────────────┘
              ↓ 새 아이템 도착 → 측정 시작 (isMeasuring)
              ↓ 측정 완료 → totalHeight 변경
┌─ totalHeight effect (측정 완료 시) ─────────────────┐
│                                                     │
│  ① backward?                                        │
│     diff = 새 scrollHeight - 저장된 scrollHeight     │
│     el.scrollTop += diff → 위치 보존 완료            │
│     가드 ref 해제                                    │
│                                                     │
│  ② forward?                                         │
│     아무것도 안 함 (stick-to-bottom 차단)             │
│     isMeasuring 끝나면 가드 ref 해제                  │
│                                                     │
│  ③ 둘 다 아님?                                      │
│     isAtBottom이면 stick-to-bottom (하단 유지)        │
│     (이미지 리사이즈, 새 메시지 전송 등)               │
└─────────────────────────────────────────────────────┘`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">핵심: 가드 ref의 생명주기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Backward (prevScrollHeightRef)</p>
                <pre className="text-xs bg-muted p-3 rounded-lg">
{`설정: 상단 도달 시 현재 scrollHeight 저장
유지: isMeasuring 중 → 아직 정확한 높이 모름
해제: !isMeasuring && diff 보정 완료
효과: prepend된 만큼 scrollTop 보정
     → 유저 시점에서 화면 변화 없음`}
                </pre>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Forward (forwardLoadingRef)</p>
                <pre className="text-xs bg-muted p-3 rounded-lg">
{`설정: 하단 도달 시 true
유지: isMeasuring 중 → 아직 높이 확정 안됨
해제: !isMeasuring 시 false로
효과: stick-to-bottom 차단
     → 유저가 직접 스크롤해서 내려가야 함`}
                </pre>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              두 가드 ref 모두 <strong>도달 감지에서 설정</strong>하고 <strong>totalHeight effect에서 해제</strong>하는
              동일한 패턴을 따릅니다. 이렇게 하면 비동기 데이터 로드 → 측정 → 위치 보정까지의
              전체 사이클이 하나의 가드로 보호됩니다.
              <code className="bg-muted px-1 rounded">.finally()</code>에서 해제하면
              React 리렌더 전에 가드가 풀려 중복 호출이 발생할 수 있기 때문에,
              반드시 측정 완료 후 useLayoutEffect에서 해제해야 합니다.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="chat-patterns" className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">응용 패턴</p>
          <h2 className="text-2xl font-semibold">채팅 앱 구현 패턴</h2>
          <p className="text-muted-foreground">
            가상 스크롤 라이브러리는 &quot;받은 데이터를 가상화&quot;하는 엔진입니다.
            채팅 앱 특유의 데이터 로딩/네비게이션 패턴은 소비자가 라이브러리 API를 조합하여 구현합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">핵심 개념: 부분 로딩 윈도우</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`전체 메시지 타임라인 (서버):
[1] [2] ... [80] [81] [82] ... [110] [111] ... [200]

현재 로드된 범위 (클라이언트):
              ┌─────── items ────────┐
              [80] [81] ... [100] ... [110]
                              ↑
                        lastReadMessage
                        (화면 중앙)

isLastMessageLoaded = false  ← [200]까지 안 왔음
isFirstMessageLoaded = false ← [1]까지 안 왔음`}
            </pre>
            <p className="text-sm text-muted-foreground mt-3">
              채팅은 전체 메시지의 <strong>일부분만</strong> 로드합니다.
              라이브러리는 받은 items가 전부인 줄 알고 가상화하며,
              &quot;뒤에 더 있는지&quot;는 소비자가 관리합니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">패턴 1: 마지막 읽은 메시지에서 열기</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`1. 서버에서 lastRead 기준 위 20개 + 아래 10개 fetch
2. items에 설정
3. <DynamicScroll
     initialScrollPosition={{ index: lastReadIdx, align: "center" }}
   />
4. 위로 스크롤 → onStartReached → 과거 메시지 fetch
5. 아래로 스크롤 → onEndReached → 최신 메시지 fetch`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">패턴 2: 메시지 전송 시 분기</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`if (isLastMessageLoaded) {
  ┌──────────────────────────────────────────┐
  │  최신 메시지가 이미 로드됨                 │
  │  → 그냥 items에 append                   │
  │  → scrollToBottom()                      │
  │  → stick-to-bottom이 알아서 처리          │
  └──────────────────────────────────────────┘
} else {
  ┌──────────────────────────────────────────┐
  │  최신 메시지가 아직 로드 안 됨             │
  │  → 서버에 메시지 전송                     │
  │  → 최신 범위 re-fetch                    │
  │  → items 교체 + isLastMessageLoaded=true  │
  │  → scrollToBottom() 호출                  │
  │    (측정 중이면 ref가 자동 큐잉            │
  │     → 측정 완료 시 실행)                   │
  └──────────────────────────────────────────┘
}`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">패턴 3: 메시지 이동 (로드된 vs 로드 안된)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">로드된 메시지로 이동</p>
                <pre className="text-xs bg-muted p-3 rounded-lg">
{`// 대상이 현재 items 안에 있음
// → 즉시 이동 가능

const idx = messages.findIndex(
  m => m.id === targetId
);
scrollRef.current?.scrollToItem(
  idx, "center"
);

// 측정할 것 없음 → 즉시 실행`}
                </pre>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">로드 안된 메시지로 이동</p>
                <pre className="text-xs bg-muted p-3 rounded-lg">
{`// 대상이 현재 items 밖에 있음
// → 새 데이터 fetch 후 이동

const around = await fetchAround(
  targetId
);
setMessages(around.messages);

// 측정 중이어도 OK!
// ref가 알아서 큐잉 → 측정 완료 시 실행
scrollRef.current?.scrollToItem(
  around.targetIdx, "center"
);`}
                </pre>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              핵심 차이: 로드 안된 메시지는 items 교체 → 높이 재측정이 필요합니다.
              ref의 imperative API(<code className="bg-muted px-1 rounded">scrollToItem</code>,
              <code className="bg-muted px-1 rounded">scrollToBottom</code>)는 내부에 <strong>큐잉 로직</strong>이 있어서,
              측정 중에 호출해도 측정 완료 후 자동 실행됩니다.
              소비자가 타이밍을 신경 쓸 필요가 없습니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">라이브러리 vs 소비자 책임</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">라이브러리가 제공하는 것</p>
                <pre className="text-xs bg-muted p-3 rounded-lg">
{`scrollToItem(index, align)  ← 큐잉 지원
scrollToBottom(behavior)    ← 큐잉 지원
onStartReached / onEndReached
initialScrollPosition
onAtBottomChange`}
                </pre>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">소비자가 구현하는 것</p>
                <pre className="text-xs bg-muted p-3 rounded-lg">
{`isLastMessageLoaded 상태 관리
isFirstMessageLoaded 상태 관리
데이터 fetch 로직
메시지 전송 시 분기 처리
검색 시 범위 판단 + fetch
로드 범위 (start/end) 추적`}
                </pre>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              라이브러리에 채팅 도메인 로직을 넣으면 범용성이 떨어집니다.
              라이브러리는 <strong>가상화 엔진 + 스크롤 제어 API</strong>만 제공하고,
              소비자가 이를 조합하여 채팅 UX를 구현하는 것이 헤드리스 설계 원칙에 맞습니다.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
