# Plan

## 핵심 차별점
> 대부분의 가상 스크롤 라이브러리는 `estimatedItemSize`로 높이를 추정하여 스크롤바 점프, 위치 부정확 문제가 발생한다.
> 이 라이브러리는 **사전 렌더링 측정(Pre-render Measurement)** 방식으로, hidden 영역에 실제 DOM을 렌더링하여 정확한 높이를 미리 확보한다.
> 모든 아이템의 높이가 측정된 후에야 가상 스크롤이 시작되므로 childPositions가 처음부터 정확하고, 스크롤바 점프가 없다.
> 문서 사이트에서 이 차별점을 기존 라이브러리와의 비교 데모로 강조할 것.

## 기존 문제점 → 개선 방안

### 아키텍처/설계 문제

| # | 기존 문제 | 원인 | 개선 방안 | 반영 버전 |
|---|----------|------|----------|----------|
| 1 | DynamicScrollWrapper에 메신저 로직 강결합 | `useChat()`, `insertDate()`, `insertLastSeenMessage()`, `noticeMode` 등이 Wrapper 내부에 직접 존재 | Wrapper 제거. 높이 측정/위치 계산을 훅으로 분리하고, 데이터 전처리는 소비자 책임으로 | v6a |
| 2 | DynamicScroll 내부에 메신저 전용 렌더링 분기 | `messageId === "date"`, `"lastSeenMessage"`, `.startsWith("error")` 등 하드코딩된 분기문 | `renderItem(item, index)` render prop으로 렌더링 100% 외부 위임 | v4b |
| 3 | action 타입이 메신저 전용 | `"MY_MESSAGE" \| "OTHER_MESSAGE" \| "BOTTOM"` 이라는 도메인 개념이 스크롤 엔진에 침투 | action 개념 제거. `scrollToBottom()`, `scrollToItem()` imperative API로 대체 | v4a |
| 4 | 3중 div 래핑 + `mt-auto` | 채팅 UI의 하단 정렬을 위한 CSS hack이 컴포넌트에 직접 박혀있음 | 헤드리스 설계. 컨테이너 스타일을 소비자가 className/style로 주입 | v4b |
| 5 | Tailwind 클래스 하드코딩 | `"mt-auto flex scrollable !pl-0"` 등 프레임워크 종속 스타일 | 레이아웃용 인라인 스타일(position, top)만 사용. 시각적 스타일 없음 | v4b |

### 성능 문제

| # | 기존 문제 | 영향 | 개선 방안 | 반영 버전 |
|---|----------|------|----------|----------|
| 6 | `flushSync`로 매 스크롤 이벤트 동기 렌더링 | 빠른 스크롤 시 프레임 드롭 유발 | rAF + 일반 setState 기본. `syncScrollUpdates` 옵션으로 flushSync 선택 가능 | v4a |
| 7 | `childPositions` O(n) 전체 재계산 | heightMap 한 건 변경에도 전체 누적합 재계산 | Map 기반 heightMap + useMemo 참조 안정성 개선. 향후 세그먼트 트리 확장 가능하게 설계 | v2d |
| 8 | `heightMapByMessageId`가 object spread + 매 측정마다 setState | `{...prev, [id]: height}` → 매번 O(n) 복사 + 아이템 N개면 N번 리렌더 | `useRef<Map>` + 배치 업데이트. 개별 측정은 ref만 변경(리렌더 0), 전체 완료 시 1번만 트리거 | v3c |
| 9 | `generateEndNodeIndex`가 선형 탐색 O(k) | 화면 노드 수가 적어 실질적 이슈는 적지만 비일관적 | 이진 탐색 O(log n)으로 통일 | v2b |
| 10 | `visibleChildren` useMemo에 `childPositions` 의존 | 높이 변경마다 배열 참조 변경 → 불필요한 재계산 | startNode/endNode만 의존하도록 분리. positions는 Measure에서 직접 참조 | v4b |

### 엣지 케이스/버그

| # | 기존 문제 | 증상 | 개선 방안 | 반영 버전 |
|---|----------|------|----------|----------|
| 11 | InitialMeasure에서 이미지 로드 전 측정 | 이미지 포함 아이템의 초기 높이 부정확 → 깜빡임 | InitialMeasure에서 `img.complete` 체크 + onLoad 대기. 타임아웃 fallback | v3b |
| 12 | 모든 날짜 구분선 id가 `"date"`로 동일 | heightMap에서 모든 날짜 구분선이 같은 높이 공유. 다른 높이 불가 | 라이브러리에서 날짜 개념 제거. 그룹 헤더는 고유 id 필수 (`groupBy` 반환값 사용) | v5a |
| 13 | `scrollTop` 초기값 `-1` | 마운트 직후 이진탐색에 -1 전달 → 비정상 startNode 계산 후 보정 | 초기값 `0`. 마운트 시 `containerRef.current.scrollTop`으로 즉시 동기화 | v4a |
| 14 | `handleItemCountChange`에서 `isBottom` stale closure | `[itemCount]` 의존성만 있어서 isBottom이 최신 값이 아닐 수 있음 | `useRef`로 isBottom 최신값 추적. 또는 의존성 배열에 포함하고 조건문으로 중복 실행 방지 | v4d |
| 15 | `handleStayBottom`에서 `isLengthChanged` race condition | totalHeight/isBottom 변경과 isLengthChanged 변경이 동시에 일어나면 예측 불가 | stick-to-bottom 로직을 단일 useLayoutEffect로 통합. 분산된 상태 대신 하나의 판단 흐름으로 | v4d |
| 16 | ReactPortal로 InitialMeasure → width 불일치 | `#chatroom` DOM과 실제 스크롤 영역의 width가 다를 수 있음 (스크롤바 등) | ReactPortal 제거. 컨테이너 내부 hidden 영역에서 측정 → 동일 width 보장 | v3b |
| 17 | `visibleNodeCount + 1` 배열 생성 후 `idx === 0` 스킵 | 의미 없는 +1 할당 + 조건 분기. 코드 가독성 저하 | `startNode`부터 `endNode`까지 직접 순회. 불필요한 배열 할당 제거 | v4b |

## v1. 프로젝트 초기 설정
- [x] a: 프로젝트 구조 생성 - Turborepo 기반 monorepo. `packages/core` (라이브러리)와 `apps/docs` (문서/플레이그라운드 사이트) 디렉토리 설정. root `package.json` (pnpm workspace), `turbo.json` (build/dev/lint 파이프라인, 캐싱 설정), `pnpm-workspace.yaml`, `tsconfig.json` (base config), `.gitignore` 생성
- [x] b: `packages/core` 패키지 초기화 - `package.json` (name: `@dynamic-scroll/core`, main/module/types 엔트리), `tsconfig.json` (React JSX, declaration 출력), tsup 빌드 설정 (ESM/CJS 듀얼 빌드, dts 생성). 디렉토리: `packages/core/src/`. **헤드리스 설계**: 인라인 스타일은 레이아웃(position, top)에만 사용, 시각적 스타일링 없음. 소비자가 className/style을 주입할 수 있도록 설계
- [x] c: `apps/docs` 플레이그라운드 초기화 - Next.js + TypeScript (App Router). `packages/core`를 workspace dependency로 연결. shadcn/ui + Tailwind CSS 설정. Playwright 설치. `turbo.json`에서 `docs#build`가 `core#build`에 의존하도록 파이프라인 설정
- [ ] d: 커밋 컨벤션 + 자동 릴리스 설정 (hiworks-editor 참고, GitHub 버전)
  - **cz-git**: `cz.config.ts` 생성 (한글 메시지, emoji, scopes: core/docs). root `package.json`에 commitizen config + `commit` 스크립트 추가. devDependencies: `commitizen`, `cz-git`
  - **semantic-release**: `packages/core/release.config.mjs` 생성. plugins: commit-analyzer (core scope → feat=minor, fix=patch), release-notes-generator, changelog, npm publish, git (CHANGELOG.md + package.json 커밋). devDependencies: `semantic-release`, `@semantic-release/changelog`, `@semantic-release/git`
  - **GitHub Actions**: `.github/workflows/release.yml` 생성. master push 시 → pnpm install → turbo build → semantic-release. secrets: `NPM_TOKEN`, `GITHUB_TOKEN` (자동 제공)

## v2. 핵심 가상화 엔진 구현
- [x] a: 타입 시스템 설계 - `packages/core/src/types.ts` 생성. 제네릭 `VirtualScrollItem<T>` (id: string 필수), `ScrollState`, `HeightMap`, `ChildPositions`, `ImperativeHandle` (scrollToItem, scrollToBottom, scrollToOffset, getScrollOffset) 타입 정의
- [x] b: 유틸리티 함수 구현 - `packages/core/src/utils/` 하위에 `binarySearch.ts` 생성. `generateStartNodeIndex`, `generateEndNodeIndex` (이진탐색으로 개선), `generateStartNodeIndexWhenCenterNodeIsFixed` 구현. 메신저 종속 함수(insertDate, insertLastSeenMessage, getFloatingPosition) 제외
- [x] c: `useScrollState` 훅 구현 - `packages/core/src/hooks/useScrollState.ts` 생성. scrollTop + childPositions 기반 startNode/endNode/visibleNodeCount 계산. 기존 로직에서 DisplayMessage 타입 의존 제거, 순수하게 positions 배열과 itemCount만 사용
- [x] d: childPositions 계산 훅 구현 - `packages/core/src/hooks/usePositions.ts` 생성. heightMap 기반 누적 위치 배열 계산. totalHeight 도출. heightMap은 `useRef<Map<string, number>>`로 관리하여 개별 높이 업데이트 시 리렌더 없이 O(1) set. childPositions 재계산은 모든 측정 완료 시 또는 ResizeObserver 변경 시 rAF로 배치하여 한 번만 트리거

## v3. 높이 측정 시스템 구현
- [x] a: Measure 컴포넌트 구현 - `packages/core/src/components/Measure.tsx` 생성. ResizeObserver 기반 동적 높이 감지, absolute positioning, React.memo 적용. 기존 구현 기반으로 하되 props를 범용적으로 설계 (messageId -> itemId)
- [x] b: InitialMeasure 컴포넌트 구현 - `packages/core/src/components/InitialMeasure.tsx` 생성. visibility:hidden으로 사전 높이 측정. ReactPortal 대신 컨테이너 내부 hidden 영역에 렌더링하는 방식으로 개선 (width 불일치 문제 해결)
- [x] c: 높이 측정 관리 훅 구현 - `packages/core/src/hooks/useHeightMap.ts` 생성. `useRef<Map<string, number>>`로 heightMap 저장 (개별 업데이트 시 리렌더 없음). 미측정 아이템 카운트를 ref로 추적하여 `isAllMeasured` 판단. **배치 업데이트**: InitialMeasure가 각 아이템 측정할 때는 ref만 변경 → 모든 측정 완료 시 1번만 상태 업데이트로 리렌더 트리거. ResizeObserver 변경도 rAF로 묶어서 동일 프레임 내 여러 변경을 1번으로 배치. **핵심 게이트**: isAllMeasured가 true일 때만 VirtualScroll에 데이터 전달 → childPositions가 처음부터 정확. estimatedItemSize는 fallback 옵션으로만 제공 (기본값은 사전 측정 필수)

## v4. 메인 VirtualScroll 컴포넌트 구현
- [x] a: 스크롤 컨테이너 및 이벤트 처리 구현 - `packages/core/src/components/VirtualScroll.tsx` 생성. scrollTop 상태 관리 (requestAnimationFrame 쓰로틀링), flushSync 대신 rAF 내에서 일반 setState로 시작하되 성능 이슈 시 옵션으로 flushSync 활성화 가능하게 설계. forwardRef + useImperativeHandle로 scrollToItem(index, align), scrollToBottom(behavior), scrollToOffset(offset) API 노출
- [x] b: 가시 영역 렌더링 구현 - renderItem render prop 패턴으로 아이템 렌더링 위임. `renderItem: (item: T, index: number) => ReactNode` 형태. Measure 컴포넌트로 각 아이템 래핑. visibleChildren을 useMemo로 최적화. **헤드리스**: 컨테이너/아이템에 className, style props 주입 가능. 라이브러리는 position/top만 제어
- [x] c: 양방향 무한 스크롤 구현 - onStartReached / onEndReached 콜백. flag ref로 중복 호출 방지. 상단 데이터 로드 시 scrollHeight - prevScrollHeight로 스크롤 위치 보존. threshold 옵션 지원 (기존은 scrollTop === 0이지만, 설정 가능하게)
- [x] d: stick-to-bottom 구현 - isAtBottom 상태 관리. totalHeight 변경 시 하단에 있으면 자동 스크롤. onAtBottomChange 콜백으로 외부에 상태 전달

## v5. Sticky Group Header 구현
- [x] a: 그룹 헤더 시스템 설계 - `packages/core/src/components/StickyGroupHeader.tsx` 생성. 기존 날짜 헤더를 일반적인 group header API로 추상화. `groupBy: (item: T) => string` 함수로 그룹 기준 지정, `renderGroupHeader: (groupKey: string) => ReactNode`로 렌더링 위임
- [x] b: 그룹별 높이 계산 훅 구현 - `packages/core/src/hooks/useGroupPositions.ts` 생성. 그룹별 높이, 누적 높이 계산. 기존 cumulativeHeightByDate/heightByDate 로직을 범용화
- [x] c: sticky 전환 효과 구현 - startNode 기반 현재 그룹 판단, 그룹 전환 시 자연스러운 push-up 애니메이션. 기존 height 제한 방식 유지하되 CSS position:sticky 활용도 옵션으로 검토

## v6. 통합 및 공개 API 정리
- [x] a: 메인 엔트리 컴포넌트 구현 - `packages/core/src/DynamicScroll.tsx` 생성. VirtualScroll + 높이 측정 + 그룹 헤더를 통합하는 최상위 컴포넌트. 기존 DynamicScrollWrapper 역할을 하되 메신저 종속 로직 없이 범용적으로. items, renderItem, estimatedItemSize, onStartReached, onEndReached 등 props 통합
- [x] b: 패키지 엔트리 포인트 정리 - `packages/core/src/index.ts`에서 공개 API export. DynamicScroll (기본), VirtualScroll (저수준), useScrollState, useHeightMap 등 개별 훅도 export. JSDoc으로 모든 public API 문서화
- [x] c: tsup 빌드 검증 및 패키지 메타데이터 완성 - ESM/CJS 빌드 확인, peerDependencies (react, react-dom), keywords, repository 등 package.json 완성
- [x] d: README.md 작성 - 아래 구조로 프로젝트 루트 README 작성:
  - **Why**: 왜 이 라이브러리를 만들었는가 — 기존 가상 스크롤 라이브러리의 한계 (추정 높이 → 스크롤바 점프, 위치 부정확)
  - **Design Challenges**: 개발 과정에서 마주한 핵심 고민 5가지
    1. 높이를 모르는 아이템의 정확한 위치 계산 — 사전 렌더링 측정(Pre-render Measurement) 방식 도입, isAllMeasured 게이트로 정확도 보장
    2. 상단 prepend 시 스크롤 점프 — scrollHeight - prevScrollHeight 보정 패턴
    3. 가상 스크롤에서 Sticky Header — CSS sticky 사용 불가 → 고정 헤더 + 인라인 헤더 이중 구조, cumulativeHeight로 height 제한하여 push-up 전환 효과를 JS로 구현
    4. stick-to-bottom vs 읽는 중 안 움직이기 — isAtBottom 상태 + 높이 변경/아이템 추가 구분으로 의도에 맞는 스크롤 동작 분기
    5. 스크롤-렌더링 동기화 — rAF 쓰로틀링 + 동기 렌더링 트레이드오프 (빈 영역 깜빡임 vs 프레임 드롭)
    6. 수천 개 아이템의 높이 관리 — Object spread `{...prev, [id]: h}`는 매번 O(n) 복사+GC 압박, 게다가 매 측정마다 리렌더 유발 → `useRef<Map>`으로 O(1) set + 리렌더 제로, 모든 측정 완료 시 1번만 배치 업데이트
  - **Features**: 주요 기능 목록 (동적 높이, 양방향 무한 스크롤, sticky group header, scrollToItem, stick-to-bottom, 헤드리스)
  - **Quick Start**: 설치 + 최소 코드 예제
  - **Architecture**: 내부 구조 다이어그램 (측정 → 위치 계산 → 가시 영역 → 렌더링)
  - **Comparison**: 기존 라이브러리(react-virtuoso, tanstack-virtual) 대비 차별점 표

## v7. 문서 사이트 기본 구조
- [x] a: 문서 사이트 레이아웃 구현 - `apps/docs/app/` 하위에 Next.js App Router로 라우팅. shadcn/ui 컴포넌트 활용: Sidebar, NavigationMenu, Card, Tabs 등. 반응형 레이아웃. 페이지 구조: `/` (Home), `/getting-started`, `/api-reference`, `/examples`, `/how-it-works`
- [x] b: Getting Started 페이지 구현 - 설치 방법, 기본 사용법 코드 예제, 최소 동작 예제. 코드 하이라이팅 (shiki). shadcn/ui의 Card, CodeBlock 스타일 활용

## v8. 인터랙티브 데모 페이지
- [x] a: 기본 가상 스크롤 데모 - 동적 높이 아이템 1만개 렌더링. **랜덤 사이즈 이미지 포함 아이템** 필수 (picsum.photos 등으로 랜덤 높이 이미지 로드 → 렌더링 전에는 높이를 알 수 없는 실제 상황 재현). 텍스트만 있는 아이템, 이미지+텍스트 아이템, 이미지만 있는 아이템을 랜덤 혼합. 실시간 렌더링 노드 수, scrollTop, fps 표시. shadcn/ui Card로 아이템 스타일링. Playwright 테스트로 스크롤 동작 검증
- [x] b: 양방향 무한 스크롤 데모 - 채팅 UI 시뮬레이션. 위/아래 스크롤 시 데이터 로드, 스크롤 위치 보존 시연. 새 메시지 도착 시 stick-to-bottom 동작 시연
- [x] c: scrollToItem 데모 - 특정 아이템 검색 후 해당 위치로 이동. align 옵션 (center, start, end) 비교 시연
- [x] d: sticky group header 데모 - 날짜별 그룹 헤더가 스크롤 시 상단에 고정되는 동작 시연. 그룹 전환 시 push-up 효과
- [x] e: **사전 측정 vs 추정 높이 비교 데모** - 좌우 분할 화면으로 **동일한 랜덤 이미지 포함 데이터셋**을 (1) 사전 렌더링 측정 방식 (2) estimatedItemSize 추정 방식으로 나란히 비교. 랜덤 이미지가 있어야 추정 높이의 부정확함이 극명하게 드러남. 스크롤바 점프, scrollToItem 정확도, 초기 렌더링 위치 차이를 시각적으로 보여줌

## v9. 기술 구현 원리 문서 (How It Works)
- [x] a: 가상 스크롤 원리 설명 페이지 - absolute positioning 방식 설명, childPositions 누적 배열 시각화, viewport 내 가시 영역 계산 도식. 인터랙티브 다이어그램으로 scrollTop 변경에 따른 startNode/endNode 변화 시각화
- [x] b: 이진탐색 알고리즘 설명 페이지 - generateStartNodeIndex의 이진탐색 로직 시각화. 단계별 탐색 과정을 애니메이션으로. O(log n) vs O(n) 성능 비교 차트
- [x] c: 높이 측정 시스템 설명 페이지 - ResizeObserver 동작 원리, InitialMeasure vs Measure 역할 분담, 높이 변경 시 전체 업데이트 플로우 다이어그램
- [x] d: API Reference 페이지 - 모든 props, hooks, 타입의 상세 문서. 각 prop별 예제 코드 포함
