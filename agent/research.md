# Project Research

## 아키텍처

### 프로젝트 구조

Turborepo 기반 모노레포. pnpm workspace.

```
dynamic-scroll/
├── packages/core/          # @dynamic-scroll/core 라이브러리
│   ├── src/
│   │   ├── DynamicScroll.tsx           # 최상위 통합 컴포넌트
│   │   ├── types.ts                    # 전체 타입 정의
│   │   ├── index.ts                    # 패키지 엔트리 (public API export)
│   │   ├── components/
│   │   │   ├── VirtualScroll.tsx        # 핵심 가상 스크롤 엔진
│   │   │   ├── Measure.tsx             # ResizeObserver 기반 런타임 높이 측정
│   │   │   ├── InitialMeasure.tsx      # 사전 높이 측정 (visibility:hidden)
│   │   │   └── StickyGroupHeader.tsx   # Sticky 그룹 헤더 (미사용 상태)
│   │   ├── hooks/
│   │   │   ├── useHeightMap.ts         # 높이 맵 관리 (useRef<Map> + 배치 업데이트)
│   │   │   ├── usePositions.ts         # childPositions 누적 위치 계산
│   │   │   ├── useScrollState.ts       # 가시 영역 노드 범위 계산
│   │   │   └── useGroupPositions.ts    # 그룹별 높이/누적 높이 계산
│   │   └── utils/
│   │       └── binarySearch.ts         # 이진 탐색 (start/end/center)
│   ├── tsup.config.ts                  # ESM/CJS 듀얼 빌드
│   └── package.json
├── apps/docs/              # Next.js 16 문서/플레이그라운드 사이트
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # 메인 - ChatPlayground 렌더링
│   │   │   ├── how-it-works/page.tsx   # 구현 원리 페이지
│   │   │   └── layout.tsx              # RootLayout (Sidebar + main)
│   │   ├── components/
│   │   │   ├── playground/
│   │   │   │   └── ChatPlayground.tsx  # 채팅 데모 컴포넌트
│   │   │   ├── layout/
│   │   │   │   └── AppSidebar.tsx      # 사이드바 네비게이션
│   │   │   └── ui/                     # shadcn/ui 컴포넌트들
│   │   └── hooks/, lib/
│   └── package.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 기술 스택

- **언어**: TypeScript
- **빌드**: Turborepo + tsup (ESM/CJS 듀얼 빌드)
- **패키지 관리**: pnpm workspace
- **코어 라이브러리**: React 18+ (peerDep), react-dom (flushSync)
- **문서 사이트**: Next.js 16 (App Router), shadcn/ui, Tailwind CSS 4, Playwright

### 모듈 관계

```
DynamicScroll (최상위 통합)
  ├── useHeightMap        → heightMapRef, isAllMeasured, version
  ├── usePositions        → childPositions, totalHeight (heightMapRef + version 의존)
  ├── useGroupPositions   → groupInfo (items + groupBy + heightMapRef + version)
  ├── InitialMeasure      → 사전 측정 (미측정 아이템만)
  └── VirtualScroll       → 핵심 가상화 렌더링
        ├── useScrollState → startNode, endNode (scrollTop + childPositions)
        ├── Measure        → 런타임 높이 측정 (ResizeObserver)
        └── useImperativeHandle → scrollToItem, scrollToBottom, scrollToOffset
```

## 데이터 흐름

### 핵심 데이터 흐름

```
1. 아이템 입력 (items: T[])
   ↓
2. 높이 측정 게이트 (useHeightMap)
   - 미측정 아이템 → InitialMeasure로 visibility:hidden 렌더링
   - heightMapRef (useRef<Map>) 에 O(1) set (리렌더 없음)
   - 모든 측정 완료 시 1번만 setVersion → isAllMeasured = true
   ↓
3. 위치 계산 (usePositions)
   - childPositions = [0, h0, h0+h1, ...] 누적합 배열
   - totalHeight = childPositions[마지막]
   - version 변경 시 useMemo 재계산
   ↓
4. 가시 영역 계산 (useScrollState)
   - scrollTop + childPositions → 이진 탐색 O(log n)
   - startNode, endNode 결정 (+ overscanCount 버퍼)
   ↓
5. 렌더링 (VirtualScroll)
   - startNode ~ endNode 범위의 아이템만 Measure로 래핑하여 렌더링
   - position: absolute + top: childPositions[i]
   - Measure의 ResizeObserver가 런타임 높이 변경 감지 → onHeightChange → version++
```

### 상태 관리 방식

- **높이 맵**: `useRef<Map<string, number>>` - 리렌더 없이 O(1) 업데이트, version 카운터로 재계산 트리거
- **스크롤 위치**: `useState(scrollTop)` + `requestAnimationFrame` 쓰로틀링
- **하단 고정**: `useRef(isAtBottom)` + `onAtBottomChange` 콜백
- **로딩 플래그**: `useState(isBackwardLoading)` + `useRef(forwardLoading)`
- **측정 중 안정성**: `stableItemsRef` - 백그라운드 측정 중에는 이전 아이템 목록 유지

### Imperative API

`DynamicScrollHandle` (ref로 외부 노출):
- `scrollToItem(index, align)` - start/center/end 정렬
- `scrollToBottom(behavior)` - auto/smooth
- `scrollToOffset(offset, behavior)` - 특정 px 위치
- `getScrollOffset()` - 현재 scrollTop 반환

### 양방향 무한 스크롤

- `onStartReached`: scrollTop <= threshold 시 호출, Promise 기반, isBackwardLoading으로 중복 방지
- `onEndReached`: scrollHeight - scrollTop - clientHeight <= threshold 시 호출
- prepend 시 스크롤 위치 보존: `scrollHeight - prevScrollHeight` 보정 (useLayoutEffect)

## 주요 파일

### packages/core (라이브러리)

| 파일 | 역할 |
|------|------|
| `src/DynamicScroll.tsx` | 최상위 통합 컴포넌트. useHeightMap + usePositions + useGroupPositions + InitialMeasure + VirtualScroll 조합. 측정 중 stableItems 유지 |
| `src/components/VirtualScroll.tsx` | 핵심 가상 스크롤 엔진. 스크롤 이벤트 처리, 가시 영역 렌더링, 양방향 무한 스크롤, stick-to-bottom, imperative API |
| `src/components/Measure.tsx` | absolute positioned 아이템 래퍼. ResizeObserver로 높이 변경 실시간 감지. React.memo 적용 |
| `src/components/InitialMeasure.tsx` | 사전 높이 측정. visibility:hidden 렌더링, img.onload 대기 (3초 타임아웃 fallback), queueMicrotask로 보고 |
| `src/components/StickyGroupHeader.tsx` | Sticky 그룹 헤더. position:sticky + height 제한으로 push-up 효과. **현재 VirtualScroll에서 사용되지 않음** |
| `src/hooks/useHeightMap.ts` | useRef<Map> 기반 높이 맵 관리. 개별 측정은 ref만 변경, 전체 완료 시 1번 setState. ResizeObserver 변경은 rAF 배치 |
| `src/hooks/usePositions.ts` | childPositions 누적합 배열 계산. version 프록시로 useMemo 재계산 |
| `src/hooks/useScrollState.ts` | scrollTop + childPositions → startNode/endNode 이진 탐색 계산 |
| `src/hooks/useGroupPositions.ts` | 그룹별 높이 + 누적 높이 계산. StickyGroupHeader의 height 제한에 사용 |
| `src/utils/binarySearch.ts` | generateStartNodeIndex, generateEndNodeIndex (이진 탐색 O(log n)), generateCenteredStartNodeIndex |
| `src/types.ts` | VirtualScrollItem, ScrollState, DynamicScrollHandle, DynamicScrollProps, VirtualScrollProps 등 |
| `src/index.ts` | 공개 API export. DynamicScroll, VirtualScroll, 훅들, 유틸, 타입 |

### apps/docs (문서 사이트)

| 파일 | 역할 |
|------|------|
| `src/app/page.tsx` | 메인 페이지. ChatPlayground 렌더링 |
| `src/app/how-it-works/page.tsx` | 구현 원리 페이지. 가상 스크롤 원리, 이진 탐색, 높이 측정 설명 |
| `src/app/layout.tsx` | RootLayout. SidebarProvider + AppSidebar + main 영역 |
| `src/components/playground/ChatPlayground.tsx` | 채팅 데모. DynamicScroll 사용, 양방향 무한 스크롤, groupBy/renderGroupHeader, scrollToItem |
| `src/components/layout/AppSidebar.tsx` | 사이드바 네비게이션 |

---

## 작업별 분석

### [2026-04-10] 스크롤 초기 위치 다양화

#### 현재 초기 스크롤 위치 설정 로직

**VirtualScroll.tsx** (line 65-74):
```typescript
// --- 최초 마운트: 하단으로 스크롤 ---
useLayoutEffect(() => {
  const el = containerRef.current;
  if (!el || mountedRef.current || totalHeight <= 0) return;

  mountedRef.current = true;
  el.scrollTop = el.scrollHeight;  // 항상 맨 아래로
  setScrollTop(el.scrollTop);
  isAtBottomRef.current = true;
  onAtBottomChange?.(true);
}, [totalHeight, onAtBottomChange]);
```

- **문제**: `el.scrollTop = el.scrollHeight`로 항상 맨 아래에서 시작
- `mountedRef.current`로 최초 1회만 실행
- `totalHeight <= 0` 가드: 측정 완료 후에만 실행

#### Imperative API 현황

`DynamicScrollHandle` (types.ts line 32-41):
- `scrollToItem(index: number, align?: ScrollAlign)` - "start" | "center" | "end"
- `scrollToBottom(behavior?: ScrollBehavior)` - "auto" | "smooth"
- `scrollToOffset(offset: number, behavior?: ScrollBehavior)`
- `getScrollOffset(): number`

#### initialScrollOffset / initialScrollToItem 옵션 여부

**존재하지 않음.** `DynamicScrollProps` (types.ts line 49-78)에 초기 스크롤 위치 관련 prop이 없다.

#### 분석 결론

1. 초기 위치 변경을 위해 `DynamicScrollProps`에 새 옵션 추가 필요:
   - `initialScrollToItem?: number` (특정 아이템 인덱스)
   - `initialScrollToBottom?: boolean` (기본값: true, 기존 동작 유지)
   - 또는 `initialScrollPosition?: "top" | "bottom" | { index: number; align: ScrollAlign }`
2. VirtualScroll.tsx의 마운트 useLayoutEffect (line 65-74)를 분기 처리해야 함
3. `scrollToItem` 로직 (line 133-149)을 재사용 가능 - 마운트 시에도 같은 로직으로 center/start/end 정렬

---

### [2026-04-10] Sticky Group Header 미적용 문제

#### StickyGroupHeader.tsx 현재 구현 상태

파일은 존재하지만 (`/packages/core/src/components/StickyGroupHeader.tsx`) **VirtualScroll.tsx에서 import/사용되지 않는다.**

StickyGroupHeader 컴포넌트 구현:
```typescript
export function StickyGroupHeader({ groupKey, renderGroupHeader, totalHeight, cumulativeHeight, topOffset = 0 }) {
  return (
    <div style={{
      position: "sticky",
      top: topOffset,
      zIndex: 1,
      height: totalHeight - cumulativeHeight,  // 그룹 영역 끝까지만 높이 제한
      pointerEvents: "none",
    }}>
      <div style={{ pointerEvents: "auto" }}>
        {renderGroupHeader(groupKey)}
      </div>
    </div>
  );
}
```

- position: sticky + height 제한으로 push-up 전환 효과 구현
- `height: totalHeight - cumulativeHeight`로 해당 그룹이 끝나면 자연스럽게 밀려 올라감

#### useGroupPositions.ts 분석

그룹별 높이 정보 계산:
- `heightByGroup`: Map<string, number> - 각 그룹의 전체 높이
- `cumulativeHeightByGroup`: Map<string, number> - 마지막 그룹 = 0, 이전 그룹 = 아래 그룹들의 합
- `groupKeyByIndex`: string[] - 인덱스별 소속 그룹 키

**문제점**: `heightMapRef.current.get(items[i].id) ?? 0`에서 **그룹 헤더 자체의 높이가 포함되지 않을 수 있음.** DynamicScroll.tsx의 `wrappedRenderItem`은 그룹 시작 아이템에 헤더를 inline으로 삽입하므로, 해당 아이템의 Measure 높이에 헤더 높이가 포함된다. 따라서 useGroupPositions의 높이 계산은 헤더 포함된 높이를 반영하게 된다.

#### VirtualScroll.tsx에서의 통합 상태

VirtualScroll.tsx는 StickyGroupHeader를 **전혀 사용하지 않는다.** 그룹 헤더는 DynamicScroll.tsx에서 `wrappedRenderItem`을 통해 각 그룹 첫 아이템에 inline으로 렌더링될 뿐이다 (line 79-95):

```typescript
const wrappedRenderItem = useMemo(() => {
  if (!groupBy || !renderGroupHeader || !groupInfo) return renderItem;
  return (item: T, index: number) => {
    const isGroupStart = currentGroup !== prevGroup;
    return (
      <>
        {isGroupStart && renderGroupHeader(currentGroup)}
        {renderItem(item, index)}
      </>
    );
  };
}, [groupBy, renderGroupHeader, groupInfo, renderItem]);
```

이 방식은 그룹 헤더가 아이템과 함께 스크롤되어 사라지므로 sticky 동작이 없다.

#### StickyGroupHeader를 실제로 동작시키려면

1. **VirtualScroll.tsx의 렌더링 구조 변경 필요**: 현재 구조는 `div(overflow:auto) > div(relative, height:totalHeight) > Measure[]`인데, StickyGroupHeader는 `div(relative)` 안의 최상단에 배치되어야 position:sticky가 동작한다.
2. **핵심 문제**: absolute positioned 아이템들과 sticky는 별개 레이어에서 동작해야 함
   - sticky 헤더는 스크롤 컨테이너의 직접 자식이어야 동작
   - 현재 아이템들은 relative 래퍼의 자식으로 absolute 배치
3. **가능한 접근**: 
   - StickyGroupHeader를 스크롤 컨테이너(`containerRef`)의 직접 자식으로 배치하되, relative 래퍼(`height: totalHeight`) 바깥에 놓아야 함
   - 또는 참고 프로젝트처럼 position:sticky를 사용하되 height 제한으로 push-up 효과를 구현
4. **groupInfo 전달**: VirtualScroll에 groupInfo 관련 props 추가 필요 (현재 없음). DynamicScroll이 가진 groupInfo를 VirtualScroll에 전달해야 StickyGroupHeader 렌더링 가능
5. **현재 그룹 판단**: `startNode` 기반으로 `groupInfo.groupKeyByIndex[startNode]`를 사용하면 현재 보고 있는 그룹의 키를 알 수 있음

#### ChatPlayground.tsx에서의 사용

```typescript
groupBy={(msg) => msg.date}
renderGroupHeader={(dateStr) => (
  <div className="bg-muted/90 backdrop-blur text-center py-1.5 text-xs ...">
    {new Date(dateStr).toLocaleDateString("ko-KR", { ... })}
  </div>
)}
```

- groupBy와 renderGroupHeader를 전달하고 있으나, 실제로는 inline 헤더만 렌더링됨 (sticky 아님)

---

### [2026-04-10] How It Works 페이지 분석

#### 현재 구조

파일: `/Users/heogeonnyeong/Desktop/Project/dynamic-scroll/apps/docs/src/app/how-it-works/page.tsx`

3개 섹션으로 구성:

1. **가상 스크롤 원리** (`#virtual-scroll`)
   - ASCII 다이어그램: 스크롤 컨테이너 > 컨텐츠 영역 > 렌더링된 아이템 구조
   - childPositions 배열 설명
   - absolute positioning + scrollTop 기반 렌더링 설명

2. **이진 탐색 알고리즘** (`#binary-search`)
   - generateStartNodeIndex 단계별 탐색 과정 예제
   - 노드 중심점 비교 기준 설명

3. **높이 측정 시스템** (`#measurement`)
   - InitialMeasure (사전 측정) 흐름 다이어그램
   - Measure (ResizeObserver 런타임 측정) 흐름 다이어그램
   - useRef<Map> + 배치 업데이트 핵심 설명

#### 디자인 상태

- shadcn/ui Card 컴포넌트 사용
- `<pre>` 태그로 ASCII 다이어그램 표시 (text-xs, bg-muted)
- `<code>` 태그로 인라인 코드 표시
- Separator로 섹션 구분
- **인터랙티브 요소 없음** - 정적 텍스트와 ASCII 다이어그램만
- **Sticky Group Header 섹션 없음**

#### 개선 포인트

1. **Sticky Group Header 원리 섹션 추가 필요**
   - CSS sticky + height 제한으로 push-up 효과 구현 원리
   - cumulativeHeight 계산 로직
   - 그룹 전환 메커니즘
2. **디자인/가독성 개선 가능**
   - ASCII 다이어그램을 시각적 컴포넌트(SVG, CSS)로 개선
   - 인터랙티브 데모 추가 가능 (scrollTop 슬라이더 등)
   - 섹션 간 네비게이션 (앵커 링크)
   - 코드 블록 스타일 개선 (실제 코드 하이라이팅)

---

### [2026-04-10] 채팅 데모 UI 분석

#### 현재 UI 구성

파일: `/Users/heogeonnyeong/Desktop/Project/dynamic-scroll/apps/docs/src/components/playground/ChatPlayground.tsx`

**구성 요소**:

1. **상태 표시 바** (line 151-157): Badge로 메시지 수, 하단 위치 여부, 로딩 상태 표시
2. **컨트롤 패널** (line 160-189): Card 안에 메시지 인덱스 입력 + "해당 메시지로 이동" 버튼 + "하단으로" 버튼
3. **채팅 영역** (line 192-250): DynamicScroll 컴포넌트, height: 500px 고정
4. **메시지 입력** (line 253-269): 텍스트 input + 전송 버튼
5. **기능 설명 카드** (line 273-290): 4개 카드 (사전 높이 측정, 양방향 무한 스크롤, Sticky 날짜 헤더, 하단 고정)

**메시지 렌더링** (renderItem, line 202-225):
- 발신자명 + 시간 + 인덱스(#) 표시
- 랜덤 이미지 (picsum.photos, 15% 확률)
- 내 메시지는 `bg-primary/5` 배경

**데이터 생성**:
- `generateInitialMessages()`: 7일치 메시지, 각 날짜별 5-15개 랜덤
- `generateOlderMessages()`: onStartReached시 40개씩 생성
- 메시지 전송: 내 메시지 추가, 20% 이미지 포함

#### 현재 UI 문제점 및 개선 가능 부분

1. **채팅 버블 디자인**: 현재 단순 div + padding만 사용. 실제 채팅 앱처럼 말풍선 스타일 없음
   - 내 메시지/상대 메시지 좌우 분리 없음 (bg-primary/5로만 구분)
   - 아바타/프로필 이미지 없음
2. **날짜 헤더**: inline으로만 표시, sticky 미동작 (위 분석 참고)
3. **컨트롤 패널**: scrollToItem의 align 옵션(start/center/end) 선택 UI 없음
4. **기능 설명 카드**: "Sticky 날짜 헤더" 기능이 실제로 동작하지 않는데 설명이 있음
5. **메시지 입력**: native input 사용, shadcn/ui Input 미사용
6. **반응형**: height: 500px 고정, 모바일 대응 부족 가능
7. **"하단으로" 플로팅 버튼**: 현재 컨트롤 패널 안에만 있고, 스크롤 중 하단에 플로팅 버튼 없음
