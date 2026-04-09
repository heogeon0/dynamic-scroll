# Project Research

## 아키텍처

### 현재 프로젝트 (dynamic-scroll)

- **상태**: 초기 커밋. LICENSE 파일(MIT)만 존재. 빌드 도구, package.json, 소스 코드 없음.
- **목적**: 가상 스크롤 라이브러리를 독립 패키지로 분리하기 위한 레포지토리.

### 참고 프로젝트 (next-generation-messenger)

- **기술 스택**: React, Next.js, TypeScript, react-virtualized(AutoSizer만 사용), react-dom(createPortal)
- **가상 스크롤 위치**: `src/lib/dynamic-scroll/` 디렉토리에 독립적으로 분리되어 있음
- **모듈 구조**:
  ```
  src/lib/dynamic-scroll/
  ├── DynamicScroll.tsx         # 핵심 VirtualScroll 컴포넌트
  ├── DynamicScrollWrapper.tsx  # 높이 측정 + 메시지 전처리 래퍼
  ├── DynamicScrollType.ts      # 외부 노출 타입 (imperative handle)
  ├── Measure.tsx               # 렌더링 중 아이템 높이 실시간 측정 (ResizeObserver)
  ├── InitialMeasure.tsx        # 최초 높이 측정 (ReactPortal로 숨겨진 DOM에서 측정)
  ├── hooks/
  │   └── useScrollState.tsx    # 가시 영역 노드 범위 계산 훅
  └── utils/
      └── index.ts              # 이진 탐색 기반 노드 인덱스 계산, 날짜 삽입 등 유틸
  ```

## 데이터 흐름

### 가상 스크롤 데이터 흐름 (참고 프로젝트 기준)

```
1. ChatProvider (ChatContext.tsx)
   - messages, targetMessage, action, isBottom 등 상태 관리
   - WebSocket으로 실시간 메시지 수신
   - 이전/다음 메시지 페이지네이션 API 호출

2. MessageListVersionThree.tsx
   - AutoSizer로 컨테이너 width/height 자동 계산
   - DynamicScrollWrapper에 Item, ErrorItem 렌더 컴포넌트 전달

3. DynamicScrollWrapper.tsx (높이 측정 + 전처리 레이어)
   - ReactPortal로 InitialMeasure 컴포넌트를 숨겨진 DOM에 렌더링
   - 각 메시지의 실제 높이를 heightMapByMessageId에 저장
   - 모든 메시지 높이가 측정되면 childPositions(누적 위치 배열) 계산
   - insertDate(): 날짜 구분선 메시지 삽입
   - insertLastSeenMessage(): 마지막 읽은 메시지 마커 삽입

4. VirtualScroll (DynamicScroll.tsx) (핵심 가상 스크롤)
   - scrollTop 기반으로 useScrollState 훅이 startNode/endNode 계산
   - childPositions[index]를 top으로 사용하는 absolute positioning
   - Measure 컴포넌트가 ResizeObserver로 높이 변경 감지 및 업데이트
```

### 상태 관리 방식

- **스크롤 위치**: `useState(scrollTop)` + `requestAnimationFrame` + `flushSync`
- **아이템 높이**: `heightMapByMessageId` (메시지ID -> 높이 맵)
- **누적 위치**: `childPositions[]` (useMemo로 heightMap 변경시 재계산)
- **양방향 무한 스크롤 플래그**: `flag.current.isBackwardUpload`, `flag.current.isForwardUpload`
- **하단 고정**: `isBottom` 상태로 새 메시지 도착 시 자동 스크롤

## 주요 파일

### 참고 프로젝트 - 가상 스크롤 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/lib/dynamic-scroll/DynamicScroll.tsx` | VirtualScroll 컴포넌트. 스크롤 이벤트 처리, 가시 영역 렌더링, 양방향 무한 스크롤, 하단 고정, 특정 메시지 이동 |
| `src/lib/dynamic-scroll/DynamicScrollWrapper.tsx` | 높이 사전 측정(ReactPortal), childPositions 계산, 날짜/마커 삽입 전처리 |
| `src/lib/dynamic-scroll/DynamicScrollType.ts` | 외부 imperative handle 타입 정의 (`handleScrollSetBottom`) |
| `src/lib/dynamic-scroll/Measure.tsx` | absolute positioned 아이템 래퍼. ResizeObserver로 높이 변경 실시간 감지 |
| `src/lib/dynamic-scroll/InitialMeasure.tsx` | 최초 렌더링 전 높이 측정용 컴포넌트. visibility:hidden으로 숨겨서 측정 후 제거 |
| `src/lib/dynamic-scroll/hooks/useScrollState.tsx` | scrollTop + childPositions로 startNode/endNode/visibleNodeCount 계산 |
| `src/lib/dynamic-scroll/utils/index.ts` | 이진 탐색 노드 인덱스 계산, 날짜 삽입, 마지막 읽은 메시지 마커 삽입 유틸 |

### 참고 프로젝트 - 사용처 (메신저 종속)

| 파일 | 역할 |
|------|------|
| `src/components/chatroom/chatRoomMessageList/MessageListVersionThree.tsx` | DynamicScrollWrapper 사용. AutoSizer로 크기 계산 후 전달 |
| `src/components/chatroom/hooks/ChatContext.tsx` | 메시지 CRUD, WebSocket 연동, 스크롤 imperative handle 관리 |

---

## 작업별 분석

### [2026-04-09] 가상 스크롤 구현 상세 분석

---

#### 1. DynamicScroll.tsx (VirtualScroll 컴포넌트) 상세 분석

**파일 경로**: `/Users/gilbert/Desktop/Project/next-generation-messenger/src/lib/dynamic-scroll/DynamicScroll.tsx`

##### Props 전체 목록과 역할

```typescript
interface Props {
  Item: React.FC<any>;                    // 일반 메시지 렌더링 컴포넌트
  ErrorItem: React.FC<any>;               // 에러 메시지 렌더링 컴포넌트
  messagesInfo: MessageListInfo;           // 메시지 목록 + 메타정보 (action, targetMessage 등)
  onScrollStartReach: () => void;          // 상단 도달 시 이전 메시지 로드 콜백
  onScrollEndReach: () => void;            // 하단 도달 시 다음 메시지 로드 콜백
  handleTargetMessageReset: () => void;    // 특정 메시지 이동 후 target 초기화
  cumulativeHeightByDate: { [key: string]: number }; // 날짜별 누적 높이 (sticky 헤더용)
  heightMapByMessageId: { [key: string]: number };   // 메시지ID -> 높이 맵
  updateHeightMap: (messageId: string, height: number) => void; // 높이 업데이트 콜백
  height: number;                          // 뷰포트 높이 (AutoSizer에서 전달)
  width: number;                           // 뷰포트 너비
  handleIsBottom: (isBottom: boolean) => void; // 하단 도달 상태 업데이트 콜백
  isBottom: boolean;                       // 현재 하단에 위치해 있는지
  childPositions: number[];                // 각 아이템의 누적 top 위치 배열
  totalHeight: number;                     // 전체 컨텐츠 높이
  heightByDate: { [key: string]: number }; // 각 날짜 그룹의 전체 높이 (sticky 헤더용)
  noticePosition: number;                  // 공지 모드에 따른 상단 오프셋 (sticky 헤더 top 위치)
  handleActionReset: () => void;           // action 상태 초기화 콜백
  handleIsLengthChangedReset: () => void;  // isLengthChanged 플래그 초기화 콜백
}
```

##### messagesInfo 구조체 분해

```typescript
const {
  messages,        // DisplayMessage[] - 실제 렌더링할 메시지 배열 (날짜, 마커 포함)
  targetMessage,   // string - 이동할 타겟 메시지 ID (빈 문자열이면 없음)
  itemCount,       // number - 현재 메시지 수
  prevItemCount,   // number - 이전 메시지 수 (변경 감지용)
  isLengthChanged, // boolean - 메시지 수 변경 여부 플래그
  action,          // null | "MY_MESSAGE" | "OTHER_MESSAGE" | "BOTTOM" - 현재 수행할 스크롤 액션
  isLoading,       // boolean - 데이터 로딩 중 여부 (로딩 중엔 추가 페이지네이션 방지)
} = messagesInfo;
```

##### State & Ref

```typescript
const [scrollTop, setScrollTop] = useState(-1);       // 현재 스크롤 위치. -1은 초기 미설정 상태
const animationFrame = useRef<number>();               // rAF cancel용 ID
const containerRef = useRef<HTMLDivElement>(null);     // 스크롤 컨테이너 DOM ref
const prevScrollHeight = useRef(0);                    // 상단 로드 시 스크롤 위치 보존용
const flag = useRef({
  isBackwardUpload: false,  // 위로 스크롤 데이터 로딩 중 플래그
  isForwardUpload: false,   // 아래로 스크롤 데이터 로딩 중 플래그
});
```

##### useScrollState 호출

```typescript
const { visibleNodeCount, startNode, endNode } = useScrollState({
  scrollTop,
  messages,
  renderAhead: 8,        // 가시 영역 전후로 8개씩 추가 렌더링
  wrapperHeight: height,
  childPositions,
});
```

##### onScroll 핸들러 (useCallback)

```typescript
const onScroll = useCallback((e: Event) => {
  if (animationFrame.current) {
    cancelAnimationFrame(animationFrame.current);  // 이전 rAF 취소
  }
  animationFrame.current = requestAnimationFrame(() => {
    const scroll = e.target as HTMLDivElement;
    flushSync(() => {
      setScrollTop(scroll.scrollTop);  // 동기적으로 scrollTop 업데이트
    });
  });
}, []);
```

- `requestAnimationFrame`으로 스크롤 이벤트를 프레임 단위로 쓰로틀링
- `flushSync`로 React 배칭 없이 즉시 렌더링 트리거 (스크롤 위치와 렌더링 동기화를 위해)

##### useEffect: 스크롤 이벤트 등록 (빈 의존성)

```typescript
useEffect(() => {
  const scrollContainer = containerRef.current;
  if (!scrollContainer) return;
  scrollContainer.addEventListener("scroll", onScroll);
  return () => scrollContainer.removeEventListener("scroll", onScroll);
}, []);
```

- 마운트 시 한 번만 등록. 의존성 배열이 빈 배열이라 onScroll의 클로저가 고정되지만, onScroll 자체에 state setter만 사용하므로 문제 없음.

##### handleScrollSetMessage (특정 메시지로 이동)

```typescript
const handleScrollSetMessage = (messageId: string) => {
  const targetMessageIndex = messages.findIndex(
    (message: any) => message.id === messageId
  );
  const targetRowHeight = heightMapByMessageId[messageId] || 44; // 기본값 44px
  const startIndex = generateStartNodeIndexWhenCenterNodeIsFixed(
    childPositions, targetRowHeight, targetMessageIndex, height
  );
  containerRef.current.scrollTo({
    top: childPositions[startIndex],
    left: 0,
    behavior: "auto",
  });
};
```

- 타겟 메시지를 뷰포트 중앙에 배치하기 위해 적절한 startIndex를 이진탐색으로 계산
- `scrollTo`로 해당 위치로 즉시 이동

##### handleScrollSetBottom (하단 이동)

```typescript
const handleScrollSetBottom = (behavior: "smooth" | "auto") => {
  const scroll = containerRef.current;
  if (!scroll || !messages.length) return;
  scroll.scrollTo({ top: totalHeight, left: 0, behavior });
  handleIsBottom(true);
};
```

##### useImperativeHandle (외부 노출 API)

```typescript
useImperativeHandle(outerRef, () => ({
  handleScrollSetBottom: (behavior: "smooth" | "auto") =>
    handleScrollSetBottom(behavior),
}));
```

- `DynamicScroll` 타입으로 노출. ChatContext에서 `outerRef.current.handleScrollSetBottom("auto")` 형태로 호출됨.

##### useEffect: handleTargetMessageScroll (targetMessage 변경 시)

```typescript
useEffect(function handleTargetMessageScroll() {
  if (targetMessage) {
    handleScrollSetMessage(targetMessage);
    handleTargetMessageReset();
    return;
  }
}, [targetMessage]);
```

- targetMessage가 설정되면 해당 메시지로 스크롤 이동 후 초기화

##### useEffect: handleInitialScrollBottom (마운트 시 초기 스크롤 위치)

```typescript
useEffect(function handleInitialScrollBottom() {
  if (targetMessage) return;  // targetMessage가 있으면 그쪽으로 이동할 것이므로 스킵
  if (messages.some((msg) => msg.id === "lastSeenMessage")) {
    handleScrollSetMessage("lastSeenMessage");  // 마지막 읽은 메시지가 있으면 그 위치로
    return;
  }
  handleScrollSetBottom("auto");  // 없으면 하단으로
}, []);
```

##### useEffect: handleItemCountChange (메시지 수 변경 시 스크롤 처리)

```typescript
useEffect(function handleItemCountChange() {
  const scroll = containerRef.current;
  if (!scroll) return;

  // 1. BOTTOM 액션: 무조건 하단 이동
  if (action === "BOTTOM") {
    handleScrollSetBottom("auto");
    handleActionReset();
    return;
  }

  // 2. 내 메시지 (1-2개 추가): 무조건 하단 이동
  if (itemCount - prevItemCount <= 2 && action === "MY_MESSAGE") {
    handleScrollSetBottom("auto");
    handleActionReset();
    return;
  }

  // 3. 다른 사람 메시지 + 이미 하단: 하단 유지
  if (itemCount - prevItemCount <= 2 && action === "OTHER_MESSAGE" && isBottom) {
    handleScrollSetBottom("auto");
    handleActionReset();
    return;
  }

  // 4. 상단 데이터 로드 완료: 스크롤 위치 보존
  if (flag.current.isBackwardUpload) {
    containerRef.current.scrollTop =
      containerRef.current.scrollHeight - prevScrollHeight.current;
    flag.current.isBackwardUpload = false;
    return;
  }

  // 5. 하단 데이터 로드 완료: 아무것도 안 함 (현재 위치 유지)
  if (flag.current.isForwardUpload) {
    flag.current.isForwardUpload = false;
    return;
  }

  if (action) handleActionReset();
}, [itemCount]);
```

- **핵심 로직**: `itemCount - prevItemCount <= 2` 조건으로 소수 메시지 추가(실시간 수신)와 대량 로드(페이지네이션)를 구분
- **스크롤 위치 보존**: `scrollHeight - prevScrollHeight`로 상단에 새 데이터가 추가되어도 현재 보고 있던 위치 유지

##### useLayoutEffect: handleScroll (scrollTop 변경 시)

```typescript
useLayoutEffect(function handleScroll() {
  const scroll = containerRef.current;
  if (!scroll) return;

  // 하단 도달 판정
  if (Math.floor(scroll.scrollHeight - scrollTop) <= height) {
    handleIsBottom(true);
  } else {
    handleIsBottom(false);
  }

  if (action !== null) return;  // action 진행 중이면 페이지네이션 방지

  // 상단 도달: 이전 메시지 로드
  if (scrollTop === 0 && !isLoading && !flag.current.isBackwardUpload) {
    flag.current.isBackwardUpload = true;
    prevScrollHeight.current = scroll.scrollHeight;  // 현재 scrollHeight 저장
    (async function () {
      try {
        await onScrollStartReach();
      } catch (e) {
        flag.current.isBackwardUpload = false;
      }
    })();
    return;
  }

  // 하단 도달: 다음 메시지 로드
  if (
    Math.floor(scroll.scrollHeight - scrollTop) <= height &&
    !isLoading && !flag.current.isForwardUpload
  ) {
    flag.current.isForwardUpload = true;
    (async function () {
      try {
        await onScrollEndReach();
      } catch (e) {
        flag.current.isForwardUpload = false;
      }
    })();
    return;
  }
}, [scrollTop]);
```

- **상단 도달 조건**: `scrollTop === 0` (정확히 최상단)
- **하단 도달 조건**: `scrollHeight - scrollTop <= height` (뷰포트 아래에 더 이상 컨텐츠 없음)
- flag로 중복 호출 방지. async/await으로 로드 완료 후에만 다음 로드 가능.

##### useLayoutEffect: handleStayBottom (하단 고정)

```typescript
useLayoutEffect(function handleStayBottom() {
  if (isBottom && !isLengthChanged) {
    handleScrollSetBottom("auto");
  }
  handleIsLengthChangedReset();
}, [totalHeight, height, isBottom]);
```

- **조건**: 이미 하단에 있고(`isBottom`) 메시지 수가 변경되지 않은 경우(`!isLengthChanged`)
- **동작**: 높이가 변경(이미지 로드, 리사이즈 등)되면 자동으로 하단 유지
- `isLengthChanged`를 체크하는 이유: 메시지 수 변경은 `handleItemCountChange`에서 처리하므로 중복 방지

##### visibleChildren (useMemo) - 가시 영역 렌더링

```typescript
const visibleChildren = useMemo(() => {
  let isFirstErrorMessage = true;
  return new Array(visibleNodeCount + 1).fill(null).map((_, idx) => {
    const index = idx - 1;
    if (index + startNode >= messages.length) return null;
    if (idx === 0) return;  // 첫 번째 슬롯은 항상 건너뜀 (0-indexed → 1-indexed 보정)

    const messageId = messages[index + startNode].id;

    // 1. lastSeenMessage 마커
    if (messageId === "lastSeenMessage") {
      return <LastSeenMessageMarker key={"last-seen-message"} height={...} top={...} />;
    }

    // 2. 날짜 구분선
    if (messageId === "date") {
      return <ChatRoomTimeStamp key={...} top={...} height={...} noticePosition={...} date={...} maxHeight={...} isLine={true} />;
    }

    // 3. 에러 메시지
    if (messageId.startsWith("error")) {
      const isFirst = isFirstErrorMessage;
      isFirstErrorMessage = false;
      return <Measure ...><ErrorItem message={...} isFirst={isFirst} /></Measure>;
    }

    // 4. 일반 메시지
    return <Measure ...><Item message={...} prevMessage={...} /></Measure>;
  });
}, [startNode, endNode, Item, childPositions, noticePosition]);
```

- 의존성: `startNode, endNode, Item, childPositions, noticePosition`
- **주의**: `visibleNodeCount + 1` 크기 배열 생성 후 `idx === 0`을 건너뛰는 패턴. 실질적으로 visibleNodeCount개 렌더링.
- 메시지 타입별 분기: lastSeenMessage, date, error, 일반 4가지

##### JSX 구조

```tsx
<div style={{ height, width }} className={"mt-auto flex scrollable !pl-0"} ref={containerRef}>
  <div className={"mt-auto w-full"}>
    <div className="viewport" style={{ width: "100%", marginTop: "auto", position: "relative", height: `${totalHeight}px` }}>
      {/* 항상 표시되는 sticky 날짜 헤더 (현재 startNode의 날짜) */}
      <ChatRoomTimeStamp
        top={0}
        height={totalHeight - (cumulativeHeightByDate[messages[startNode]?.date] || 0)}
        noticePosition={noticePosition}
        date={messages[startNode].date}
        isLine={false}
      />

      {visibleChildren}
    </div>
  </div>
</div>
```

- 3중 div 래핑: 외부 스크롤 컨테이너 → mt-auto 정렬용 → viewport (relative 포지셔닝 기준)
- `mt-auto`: 메시지가 적을 때 하단 정렬 (채팅 UI 특성)
- 고정 ChatRoomTimeStamp: `startNode`의 날짜를 항상 표시 (sticky 날짜 헤더)

---

#### 2. DynamicScrollWrapper.tsx 상세 분석

**파일 경로**: `/Users/gilbert/Desktop/Project/next-generation-messenger/src/lib/dynamic-scroll/DynamicScrollWrapper.tsx`

##### Props

```typescript
interface Props {
  height: number;              // AutoSizer에서 전달된 뷰포트 높이
  chatRoomId: string;          // 채팅방 ID (방 전환 시 상태 리셋용)
  width: number;               // AutoSizer에서 전달된 뷰포트 너비
  Item: (props) => JSX.Element;      // 일반 메시지 렌더 컴포넌트
  ErrorItem: (props) => JSX.Element; // 에러 메시지 렌더 컴포넌트
  noticeMode: ChatRoomNoticeModeRecord; // 공지 모드 설정
  noticeCount: number;         // 공지 개수
}
```

##### 타입 정의

```typescript
export type MessageListInfo = {
  messages: DisplayMessage[];                          // 렌더링할 메시지 배열
  targetMessage: string;                               // 이동할 타겟 메시지 ID
  lastSeenMessageId: string;                           // 마지막 읽은 메시지 ID
  itemCount: number;                                   // 현재 메시지 수
  prevItemCount: number;                               // 이전 메시지 수
  isLengthChanged: boolean;                            // 메시지 수 변경 여부
  action: null | "MY_MESSAGE" | "OTHER_MESSAGE" | "BOTTOM"; // 스크롤 액션
  isLoading: boolean;                                  // 로딩 상태
};

// DisplayMessage = Message | Wrapper | Date 유니온 타입
// - Message: displayType "message", 실제 메시지 데이터
// - Wrapper: displayType "wrapper" (사용되지 않는 듯)
// - Date: displayType "date", 날짜 구분선
```

##### State 전체

```typescript
const [messageInfo, setMessageInfo] = useState<MessageListInfo>({...}); // VirtualScroll에 전달할 최종 메시지 정보
const [heightMapByMessageId, setHeightMapByMessageId] = useState<{[key:string]:number}>(() => ({
  date: 36,              // 날짜 구분선 기본 높이 36px
  lastSeenMessage: 16,   // 마지막 읽은 메시지 마커 기본 높이 16px
  buffer: 20,            // 버퍼 기본 높이 20px
}));
const [doMount, setDoMount] = useState(false);    // 채팅방 전환 시 리마운트 제어
const [heightByDate, setHeightByDate] = useState<{[key:string]:number}>({}); // 날짜별 그룹 높이
const [cumulativeHeightByDate, setCumulativeHeightByDate] = useState<{[key:string]:number}>({}); // 날짜별 누적 높이
const [reactPortal, setReactPortal] = useState<React.ReactPortal[]>([]); // InitialMeasure 포탈 목록
```

##### useChat() 에서 가져오는 데이터

```typescript
const {
  handlePrevMessageLoad,      // 이전 메시지 로드 함수
  handleLoadNextMessage,      // 다음 메시지 로드 함수
  messages,                   // MessageInfo[] - 원본 메시지 배열 (API 데이터)
  targetMessage,              // 이동할 타겟 메시지
  handleTargetMessageReset,   // 타겟 메시지 초기화
  handleIsBottom,             // 하단 상태 업데이트
  action,                     // 스크롤 액션
  outerRef,                   // RefObject<DynamicScroll> - imperative handle ref
  lastSeenMessageId,          // 마지막 읽은 메시지 ID
  isLoading,                  // 로딩 상태
  isBottom,                   // 하단 위치 여부
  handleActionReset,          // 액션 리셋
} = useChat();
```

##### handleHeightMapUpdate (높이 맵 업데이트)

```typescript
const handleHeightMapUpdate = (messageId: string, newHeight: number) => {
  setHeightMapByMessageId((prev) => ({ ...prev, [messageId]: newHeight }));
};
```

- InitialMeasure에서 측정 완료 시 호출, Measure에서 ResizeObserver 감지 시 호출

##### handleReactPortalRemove (포탈 제거)

```typescript
const handleReactPortalRemove = (messageId: string) => {
  setReactPortal((prev) => prev.filter((item) => item.key !== messageId));
};
```

- InitialMeasure에서 높이 측정 완료 후 해당 포탈을 제거

##### useLayoutEffect: handleChatRoomBubbleHeightGet (초기 높이 측정)

```typescript
useLayoutEffect(function handleChatRoomBubbleHeightGet() {
  const root = document.getElementById("chatroom");
  if (!root) return;

  const messageComponents = messages
    .filter((message) => !heightMapByMessageId[message.id])  // 아직 측정되지 않은 메시지만
    .map((message) => {
      // ReactDOM.createPortal로 InitialMeasure 생성
      // - error 메시지: ErrorItem으로 렌더링
      // - 일반 메시지: Item으로 렌더링
      return ReactDOM.createPortal(
        React.createElement(InitialMeasure, {
          key: message.id,
          handleHeightMapUpdate,
          handleReactPortalRemove,
          messageId: message.id,
          children: React.createElement(Item/ErrorItem, {...}),
        }),
        root,      // #chatroom DOM에 포탈
        message.id // 포탈 key
      );
    });

  setReactPortal(messageComponents);
}, [messages]);
```

- **핵심 메커니즘**: messages가 변경될 때마다 아직 높이가 측정되지 않은 메시지만 필터링하여 InitialMeasure 포탈 생성
- `#chatroom` DOM에 `visibility: hidden`으로 렌더링하여 실제 높이 측정
- 측정 완료 후 handleReactPortalRemove로 포탈 제거

##### useEffect: chatRoomId 변경 시 리마운트 처리

```typescript
useEffect(() => {
  setDoMount(true);
  return () => {
    setDoMount(false);
    setMessageInfo({...초기값});
  };
}, [chatRoomId]);
```

- 채팅방 전환 시 VirtualScroll을 언마운트 → 리마운트하여 깨끗한 상태로 시작

##### childPositions (useMemo) - 누적 위치 배열 계산

```typescript
const childPositions = useMemo(() => {
  const results = [0];  // 첫 번째 아이템은 항상 top: 0
  for (let i = 0; i < messageInfo.messages.length; i++) {
    const messageId = messageInfo.messages[i].id;
    const childHeight = heightMapByMessageId[messageId];
    results.push(results[i] + childHeight);  // 누적합
  }
  return results;
}, [heightMapByMessageId, messageInfo.messages]);
```

- `results[i]` = i번째 아이템의 top 위치
- `results[length]` = 전체 높이 (totalHeight)
- 배열 길이: messages.length + 1

##### totalHeight (useMemo)

```typescript
const totalHeight = useMemo(() => {
  if (messageInfo.messages.length === 0) return 0;
  return childPositions[childPositions.length - 1];
}, [childPositions, heightMapByMessageId]);
```

##### useLayoutEffect: 메시지 전처리 (높이 측정 완료 후)

```typescript
useLayoutEffect(() => {
  // targetMessage가 있는데 messages에 없으면 대기
  if (targetMessage && !messages.some((msg) => msg.id === targetMessage)) return;

  // 모든 메시지의 높이가 측정되었는지 확인
  const isAllCalculated = messages.every(
    (message) => !!heightMapByMessageId[message.id]
  );
  if (!isAllCalculated || !messages) return;

  // 1단계: lastSeenMessage 마커 삽입
  const messageWithLastSeenMessage = insertLastSeenMessage(messages, lastSeenMessageId);
  // 2단계: 날짜 구분선 삽입
  const messageWithDate = insertDate(messageWithLastSeenMessage);

  // messageInfo 업데이트
  setMessageInfo((prev) => ({
    action,
    messages: messageWithDate,
    targetMessage,
    isLoading,
    lastSeenMessageId,
    isLengthChanged: prev.itemCount !== messageWithDate.length,
    prevItemCount: prev.itemCount !== messageWithDate.length ? prev.itemCount : prev.prevItemCount,
    itemCount: messageWithDate.length,
  }));
}, [heightMapByMessageId, messages, targetMessage, action]);
```

- **핵심 게이트**: `isAllCalculated`가 true일 때만 VirtualScroll에 데이터 전달
- 측정이 완료되지 않으면 VirtualScroll이 렌더링되지 않음 (childPositions가 올바르지 않으므로)
- `isLengthChanged`, `prevItemCount` 추적으로 DynamicScroll에서 스크롤 동작 결정에 활용

##### useEffect: 날짜별 높이 계산

```typescript
useEffect(() => {
  let date = "";
  const newHeightByDate = new Map<string, number>();

  for (let i = 0; i < messageInfo.messages.length; i++) {
    const message = messageInfo.messages[i];
    if (message.displayType === "date") {
      date = message.date;
    }
    const childHeight = heightMapByMessageId[message.id];
    newHeightByDate.set(date, (newHeightByDate.get(date) || 0) + childHeight);
  }

  setCumulativeHeightByDate(() =>
    Object.fromEntries(calculateCumulativeSumDescending(newHeightByDate))
  );
  setHeightByDate(() => Object.fromEntries(newHeightByDate));
}, [childPositions, heightMapByMessageId, messageInfo.messages, totalHeight]);
```

- 각 날짜 그룹의 총 높이를 계산 (heightByDate)
- 날짜별 누적 높이를 내림차순으로 계산 (cumulativeHeightByDate) - sticky 헤더의 높이 제한에 사용

##### JSX

```tsx
<>
  {reactPortal}  {/* 초기 높이 측정용 포탈 (측정 완료 후 자동 제거) */}
  {doMount && messageInfo.messages.length !== 0 && (
    <VirtualScroll
      ErrorItem={ErrorItem}
      handleActionReset={handleActionReset}
      Item={Item}
      noticePosition={getFloatingPosition(noticeCount, noticeMode)}
      messagesInfo={messageInfo}
      cumulativeHeightByDate={cumulativeHeightByDate}
      onScrollStartReach={handlePrevMessageLoad}
      onScrollEndReach={handleLoadNextMessage}
      handleIsLengthChangedReset={handleIsLengthChangedReset}
      handleTargetMessageReset={onTargetMessageReset}
      heightMapByMessageId={heightMapByMessageId}
      updateHeightMap={handleHeightMapUpdate}
      height={height}
      width={width}
      childPositions={childPositions}
      totalHeight={totalHeight}
      isBottom={isBottom}
      handleIsBottom={handleIsBottom}
      ref={outerRef}
      heightByDate={heightByDate}
    />
  )}
</>
```

- `doMount && messageInfo.messages.length !== 0` 조건으로 VirtualScroll 렌더링 게이트

---

#### 3. useScrollState.tsx 상세 분석

**파일 경로**: `/Users/gilbert/Desktop/Project/next-generation-messenger/src/lib/dynamic-scroll/hooks/useScrollState.tsx`

##### Props

```typescript
interface Props {
  scrollTop: number;            // 현재 스크롤 위치
  messages: DisplayMessage[];   // 메시지 배열 (length 사용)
  renderAhead?: number;         // 가시 영역 전후 추가 렌더링 수 (기본 5, 호출 시 8 전달)
  wrapperHeight: number;        // 뷰포트 높이
  childPositions: number[];     // 누적 위치 배열
}
```

##### 로직 흐름

```typescript
// 1. 이진탐색으로 첫 번째 가시 노드 찾기
const firstVisibleNode = useMemo(() => {
  return generateStartNodeIndex(scrollTop, childPositions, messages.length);
}, [scrollTop, childPositions, messages.length]);

// 2. renderAhead 적용하여 실제 렌더링 시작 인덱스 계산
const startNode = Math.max(0, firstVisibleNode - renderAhead);

// 3. 선형탐색으로 마지막 가시 노드 찾기
const lastVisibleNode = useMemo(() => {
  return generateEndNodeIndex(childPositions, firstVisibleNode, messages.length, wrapperHeight);
}, [childPositions, firstVisibleNode, messages.length, wrapperHeight]);

// 4. renderAhead 적용하여 실제 렌더링 끝 인덱스 계산
const endNode = Math.min(messages.length - 1, lastVisibleNode + renderAhead);

// 5. 가시 노드 수 계산
const visibleNodeCount = endNode - startNode + 1;

// 6. 패딩 계산 (미사용 - DynamicScroll에서는 absolute positioning 사용)
const paddingTop = childPositions[startNode];
const paddingBottom = childPositions[childPositions.length - 1] - childPositions[endNode];
```

##### 반환값

```typescript
return {
  firstVisibleNode,   // 실제 뷰포트에 보이는 첫 노드 (renderAhead 미적용)
  lastVisibleNode,    // 실제 뷰포트에 보이는 마지막 노드 (renderAhead 미적용)
  startNode,          // 렌더링할 시작 인덱스 (renderAhead 적용)
  endNode,            // 렌더링할 끝 인덱스 (renderAhead 적용)
  visibleNodeCount,   // 렌더링할 총 노드 수
  paddingTop,         // 미사용 (absolute positioning이므로)
  paddingBottom,      // 미사용
};
```

---

#### 4. utils/index.ts 상세 분석

**파일 경로**: `/Users/gilbert/Desktop/Project/next-generation-messenger/src/lib/dynamic-scroll/utils/index.ts`

##### generateStartNodeIndex (이진 탐색 - 시작 노드)

```typescript
export function generateStartNodeIndex(
  scrollTop: number,
  nodePositions: number[],  // 누적 위치 배열
  itemCount: number
): number {
  let startRange = 0;
  let endRange = itemCount - 1;
  if (endRange < 0) return 0;

  while (endRange !== startRange) {
    const middle = Math.floor((endRange - startRange) / 2 + startRange);
    const nodeCenter = (nodePositions[middle] + nodePositions[middle + 1]) / 2;

    // scrollTop이 노드 중심과 다음 노드 시작점 사이에 있는 경우
    if (nodeCenter <= scrollTop && nodePositions[middle + 1] > scrollTop) {
      return middle;
    }

    if (middle === startRange) {
      return endRange;
    } else {
      if (nodeCenter <= scrollTop) {
        startRange = middle;  // scrollTop이 중심보다 아래 → 더 아래쪽 탐색
      } else {
        endRange = middle;    // scrollTop이 중심보다 위 → 더 위쪽 탐색
      }
    }
  }
  return itemCount;
}
```

**알고리즘 상세**:
- `nodeCenter = (nodePositions[middle] + nodePositions[middle + 1]) / 2`: 노드의 중앙점 계산
- 종료 조건 1: scrollTop이 노드 중심 ~ 다음 노드 시작점 사이에 있으면 해당 인덱스 반환
- 종료 조건 2: `middle === startRange`이면 더 이상 좁힐 수 없으므로 endRange 반환
- 종료 조건 3: 루프 탈출 시 (`endRange === startRange`) itemCount 반환
- 시간 복잡도: O(log n)

##### generateEndNodeIndex (선형 탐색 - 끝 노드)

```typescript
export function generateEndNodeIndex(
  nodePositions: number[],
  startNodeIndex: number,  // firstVisibleNode (renderAhead 미적용 값)
  itemCount: number,
  viewportHeight: number
): number {
  let endNodeIndex;
  for (endNodeIndex = startNodeIndex; endNodeIndex < itemCount; endNodeIndex++) {
    if (
      nodePositions[endNodeIndex] - nodePositions[startNodeIndex + 1] > viewportHeight
    ) {
      return endNodeIndex;
    }
  }
  return endNodeIndex;
}
```

**알고리즘 상세**:
- `startNodeIndex + 1`의 위치를 기준으로 viewport 높이를 넘는 첫 번째 노드를 찾음
- `startNodeIndex + 1`을 기준으로 사용하는 이유: startNodeIndex는 부분적으로 보이는 노드일 수 있으므로, 그 다음 노드부터 완전히 보이는 영역 시작
- 시간 복잡도: O(k) (k = 화면에 보이는 노드 수, 일반적으로 작음)

##### generateStartNodeIndexWhenCenterNodeIsFixed (이진 탐색 - 중앙 배치)

```typescript
export function generateStartNodeIndexWhenCenterNodeIsFixed(
  nodePositions: number[],
  targetRowHeight: number,  // 타겟 아이템의 높이
  targetRowIndex: number,   // 타겟 아이템의 인덱스
  viewportHeight: number
): number {
  let start = 0;
  let end = targetRowIndex;

  const totalHeight = nodePositions[targetRowIndex] + targetRowHeight;

  if (!nodePositions) return 0;
  if (totalHeight <= viewportHeight) return 0;  // 전체 높이가 뷰포트보다 작으면 맨 위부터

  const viewHalf = Math.floor(viewportHeight / 2);

  let answer = 0;
  let stand = Infinity;  // 현재까지 가장 가까운 거리

  while (start <= end) {
    const middle = Math.floor((end - start) / 2 + start);
    // middle부터 targetRow까지의 높이
    const middleHeight =
      nodePositions[targetRowIndex] - nodePositions[middle] + targetRowHeight;

    // viewHalf와의 거리가 가장 가까운 값을 answer로 갱신
    if (Math.abs(middleHeight - viewHalf) < stand) {
      stand = Math.abs(middleHeight - viewHalf);
      answer = middle;
    }

    if (viewHalf < middleHeight) {
      start = middle + 1;  // 높이가 너무 큼 → 시작점을 아래로
    } else {
      end = middle - 1;    // 높이가 너무 작음 → 시작점을 위로
    }
  }
  return answer;
}
```

**알고리즘 상세**:
- 목표: 타겟 메시지가 뷰포트 중앙(viewHalf)에 오도록 하는 scrollTop 위치의 첫 번째 가시 노드를 찾음
- `middleHeight`: middle 인덱스부터 타겟까지의 총 높이
- 이 높이가 `viewHalf`에 가장 가까운 middle을 이진탐색으로 찾음
- 시간 복잡도: O(log n)

##### getFloatingPosition (메신저 전용 - 공지 위치)

```typescript
export const getFloatingPosition = (noticeCount, noticeMode) => {
  if (noticeMode === "한줄로 접혀있는 상태") return 64;
  if (noticeMode === "모든 공지가 보이도록 펼쳐져있는 상태") {
    if (noticeCount === 1) return 114;
    if (noticeCount === 2) return 164;
    if (noticeCount === 3) return 214;
    else return 250;
  }
  return 0;
};
```

- sticky 날짜 헤더의 top 오프셋 계산 (공지가 차지하는 공간만큼 내려야 함)

##### insertDate (날짜 구분선 삽입)

```typescript
export const insertDate = (messages: BeforeInsertDateMessage[]): DisplayMessage[] => {
  const result: DisplayMessage[] = [];
  let currentDate = "";

  messages.forEach((message) => {
    const itemDate = message.created_at.split("T")[0];  // ISO 날짜 파싱

    if (currentDate !== itemDate && itemDate !== "ERROR") {
      result.push({ displayType: "date", date: itemDate, id: "date" });
      currentDate = itemDate;
    }
    result.push({ ...message, displayType: "message", date: currentDate });
  });

  return [...result];
};
```

- 날짜가 바뀔 때마다 `{ displayType: "date", id: "date" }` 아이템 삽입
- **주의**: 모든 날짜 구분선의 id가 `"date"`로 동일. heightMap에서 동일 키를 공유하므로 모든 날짜 구분선 높이가 같다고 가정.

##### insertLastSeenMessage (마지막 읽은 메시지 마커 삽입)

```typescript
export const insertLastSeenMessage = (
  messages: MessageInfo[],
  lastSeenMessageId: string
): BeforeInsertDateMessage[] => {
  const lastSeenMessageIndex = messages.findIndex(msg => msg.id === lastSeenMessageId);
  if (lastSeenMessageIndex === -1) return messages;
  if (lastSeenMessageIndex === messages.length - 1) return messages; // 마지막 메시지가 읽은 메시지면 마커 불필요

  const lastSeenMessage: LastSeenMessage = {
    displayType: "message",
    created_at: messages[lastSeenMessageIndex].created_at,
    id: "lastSeenMessage",
  };

  return [
    ...messages.slice(0, lastSeenMessageIndex + 1),
    lastSeenMessage,  // 마지막 읽은 메시지 바로 다음에 삽입
    ...messages.slice(lastSeenMessageIndex + 1),
  ];
};
```

##### calculateCumulativeSumDescending (날짜별 누적 높이 - 내림차순)

```typescript
export function calculateCumulativeSumDescending(map: Map<string, number>): Map<string, number> {
  // 최신 날짜순 정렬
  const entries = Array.from(map.entries()).sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );

  const cumulativeMap = new Map();

  if (entries.length > 0) {
    cumulativeMap.set(entries[0][0], 0);  // 가장 최근 날짜 = 0
  }

  let cumulativeSum = 0;
  for (let i = 1; i < entries.length; i++) {
    cumulativeSum += entries[i - 1][1];  // 이전 날짜의 높이를 누적
    cumulativeMap.set(entries[i][0], cumulativeSum);
  }

  return cumulativeMap;
}
```

- **용도**: sticky 날짜 헤더의 height 제한 계산. 가장 최근 날짜는 0, 이전 날짜일수록 그 아래 날짜들의 누적 높이.
- DynamicScroll.tsx에서 `cumulativeHeightByDate[messages[startNode]?.date]`로 사용되어 sticky 헤더의 최대 높이를 계산.

---

#### 5. Measure.tsx 상세 분석

**파일 경로**: `/Users/gilbert/Desktop/Project/next-generation-messenger/src/lib/dynamic-scroll/Measure.tsx`

##### Props

```typescript
interface Props {
  children: React.ReactNode;   // 실제 메시지 컴포넌트
  height: number;              // 현재 알려진 높이 (data-height 속성에만 사용)
  messageId: string;           // 메시지 식별자
  updateHeightMap: (messageId: string, height: number) => void; // 높이 변경 콜백
  position: number;            // absolute top 위치
}
```

##### 로직

```typescript
function Measure({ children, position, height, messageId, updateHeightMap }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const beforeHeightRef = useRef(height);  // 이전 높이 캐싱 (불필요한 업데이트 방지)

  const measure = () => {
    const node = ref.current;
    if (node && node.ownerDocument && node.ownerDocument.defaultView &&
        node instanceof node.ownerDocument.defaultView.HTMLElement) {
      const newSize = Math.ceil(node.offsetHeight);  // 올림으로 소수점 제거
      if (beforeHeightRef.current === newSize) return;  // 동일하면 스킵
      beforeHeightRef.current = newSize;
      updateHeightMap(messageId, newSize);
    }
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const resizeObserver = new ResizeObserver(() => { measure(); });
    resizeObserver.observe(node);
    return () => { resizeObserver.disconnect(); };
  }, []);  // 마운트 시 한 번만 설정

  return (
    <div
      data-height={height}
      style={{ position: "absolute", top: `${position}px`, left: 0, width: "100%" }}
      data-id={messageId}
      ref={ref}
    >
      {children}
    </div>
  );
}

export default memo(Measure);
```

**핵심 동작**:
- `ResizeObserver`로 아이템 DOM의 높이 변경을 실시간 감지
- 높이가 변경되면 `updateHeightMap` 호출 → `heightMapByMessageId` 업데이트 → `childPositions` 재계산 → 가상 스크롤 전체 업데이트
- `Math.ceil(node.offsetHeight)`: 서브 픽셀 렌더링으로 인한 반올림 차이 방지
- `memo`로 불필요한 리렌더링 방지 (position, height 등 변경 시에만 리렌더)
- `ownerDocument.defaultView.HTMLElement` 체크: iframe 등 다른 window context에서의 호환성 보장

---

#### 6. InitialMeasure.tsx 상세 분석

**파일 경로**: `/Users/gilbert/Desktop/Project/next-generation-messenger/src/lib/dynamic-scroll/InitialMeasure.tsx`

##### Props

```typescript
interface Props {
  children: React.ReactNode;                              // 측정할 메시지 컴포넌트
  handleHeightMapUpdate: (messageId: string, height: number) => void; // 높이 보고 콜백
  handleReactPortalRemove: (messageId: string) => void;   // 측정 완료 후 자신을 제거하는 콜백
  messageId: string;                                       // 메시지 식별자
}
```

##### 로직

```typescript
export default function InitialMeasure({
  children, handleHeightMapUpdate, messageId, handleReactPortalRemove,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnLoad = () => {
      if (!ref.current) return;
      handleHeightMapUpdate(messageId, ref.current.offsetHeight);  // 높이 보고
      handleReactPortalRemove(messageId);                          // 자신 제거
    };
    // setTimeout(handleOnLoad, 500);  // 주석 처리됨 - 이전에 이미지 로드 대기용?
    handleOnLoad();
  }, []);

  return (
    <div ref={ref} style={{ position: "absolute", top: 0, left: 0, visibility: "hidden" }}>
      {children}
    </div>
  );
}
```

**핵심 동작**:
- ReactPortal로 `#chatroom` DOM에 `visibility: hidden`으로 렌더링
- `useEffect`에서 `offsetHeight`로 실제 렌더링된 높이를 측정
- 측정 완료 후 즉시 자신을 제거 (handleReactPortalRemove)
- `visibility: hidden`은 공간은 차지하지만 보이지 않음 → offsetHeight 측정 가능

**한계점**:
- 이미지가 포함된 메시지의 경우, 이미지 로드 전에 측정하면 잘못된 높이가 측정됨 (주석 처리된 setTimeout이 이를 위한 것으로 보임)
- 현재는 Measure의 ResizeObserver가 이미지 로드 후 높이 변경을 잡아주므로 문제가 심각하지 않음

---

#### 7. Sticky 날짜 헤더 기능 상세 분석

##### 날짜 삽입 과정

1. `insertDate()` (utils/index.ts): 메시지 배열을 순회하며 날짜가 바뀔 때마다 `{ displayType: "date", id: "date", date: "YYYY-MM-DD" }` 아이템 삽입
2. 모든 날짜 구분선의 `id`가 `"date"`로 동일 → `heightMapByMessageId["date"]`로 높이 공유 (기본값 36px)

##### Sticky 헤더 구현 방식

DynamicScroll.tsx에서 두 가지 ChatRoomTimeStamp가 렌더링됨:

1. **고정 sticky 헤더** (항상 표시):
   ```tsx
   <ChatRoomTimeStamp
     top={0}
     height={totalHeight - (cumulativeHeightByDate[messages[startNode]?.date] || 0)}
     noticePosition={noticePosition}
     date={messages[startNode].date}
     isLine={false}
   />
   ```
   - `top={0}`: viewport relative 기준 최상단
   - `height`: `totalHeight - cumulativeHeightByDate[날짜]` → 해당 날짜 영역이 끝나는 지점까지의 높이
   - `isLine={false}`: 구분선 없이 날짜만 표시
   - `noticePosition`: 공지 영역만큼 top 오프셋
   - `messages[startNode].date`를 사용하므로 스크롤할 때마다 현재 보고 있는 영역의 날짜가 자동으로 변경됨

2. **인라인 날짜 구분선** (visibleChildren 내):
   ```tsx
   if (messageId === "date") {
     return <ChatRoomTimeStamp
       top={childPositions[index + startNode]}
       height={heightByDate[messages[index + startNode].date]}
       noticePosition={noticePosition}
       date={messages[index + startNode].date}
       maxHeight={totalHeight - childPositions[index + startNode]}
       isLine={true}
     />;
   }
   ```
   - `top`: absolute 포지셔닝 위치
   - `height`: 해당 날짜 그룹의 전체 높이
   - `isLine={true}`: 날짜 구분선 표시
   - `maxHeight`: 해당 날짜 구분선부터 컨텐츠 끝까지의 높이

##### 날짜 전환 메커니즘

- `startNode`는 `scrollTop` 변경 시 `useScrollState`에서 재계산됨
- `messages[startNode].date`가 현재 보고 있는 영역의 날짜
- 스크롤하여 다음 날짜 영역으로 넘어가면 `startNode`가 변경되고, sticky 헤더의 `date`도 자동 변경
- `height` 제한으로 인해 sticky 헤더가 해당 날짜 영역 끝에서 자연스럽게 사라짐 (CSS `position: sticky`와 유사한 효과를 JS로 구현)

##### cumulativeHeightByDate의 역할

- 최신 날짜 = 0, 이전 날짜 = 그 아래 날짜들의 누적 높이
- 예: 4월 9일(최신) = 0, 4월 8일 = 4월 9일 높이, 4월 7일 = 4월 9일 + 4월 8일 높이
- sticky 헤더의 `height = totalHeight - cumulativeHeight`로 해당 날짜 영역 끝까지만 헤더가 보이도록 제한

---

#### 8. 실제 사용 패턴 분석

**파일**: `/Users/gilbert/Desktop/Project/next-generation-messenger/src/components/chatroom/chatRoomMessageList/MessageListVersionThree.tsx`

```tsx
const MessageList = ({ chatRoomId, noticeMode, noticeCount, ... }: Prop) => {
  // ChatRoom: 일반 메시지 렌더러 (ChatRoomBubble 래핑)
  const ChatRoom = useCallback(({ message, prevMessage }) => {
    return <ChatRoomBubble ... />;
  }, [highlightMessageId, bookmarkInfo, isRegisteredNotice]);

  // ErrorChatRoomBubble: 에러 메시지 렌더러
  const ErrorChatRoomBubble = useCallback(({ message, isFirst }) => {
    return <ChatRoomErrorBubble chatRoomId={chatRoomId} message={message} isFirst={isFirst} />;
  }, [chatRoomId]);

  return (
    <div className={"h-full"} id={"chatroom"}>
      <AutoSizer>
        {({ height, width }) => (
          <DynamicScrollWrapper
            noticeCount={noticeCount}
            noticeMode={noticeMode}
            chatRoomId={chatRoomId}
            height={height}
            ErrorItem={ErrorChatRoomBubble}
            Item={ChatRoom}
            width={width}
          />
        )}
      </AutoSizer>
    </div>
  );
};
```

**ChatContext에서의 imperative handle 사용**:

```typescript
// ChatContext.tsx
const outerRef = useRef<DynamicScroll>(null);

// 플로팅 버튼 클릭 시 하단 이동
const handleClickFloatingBtn = async () => {
  if (isLastRendered && outerRef.current) {
    outerRef.current.handleScrollSetBottom("auto");
    setNewMessage(null);
    return;
  }
  // ... 마지막 메시지가 아직 로드되지 않은 경우 API 호출
};
```

---

#### 9. 개선 가능한 점 및 문제점

##### 아키텍처/API 설계 문제

1. **DynamicScrollWrapper에 메신저 도메인 로직 강결합**
   - `useChat()`, `insertDate()`, `insertLastSeenMessage()`, `noticeMode` 등이 모두 Wrapper 안에 있음
   - 라이브러리화 시 Wrapper를 완전히 재설계해야 함. 핵심 가상화 엔진(DynamicScroll + useScrollState + Measure)은 분리 가능하지만 Wrapper는 사실상 애플리케이션 레이어

2. **DynamicScroll에도 메신저 전용 렌더링 직접 포함**
   - `LastSeenMessageMarker`, `ChatRoomTimeStamp`, `ChatRoomErrorBubble` import
   - `messageId === "date"`, `messageId === "lastSeenMessage"`, `messageId.startsWith("error")` 분기
   - 이 부분을 render prop이나 children factory 패턴으로 추상화해야 함

3. **action 타입이 메신저 전용**
   - `"MY_MESSAGE" | "OTHER_MESSAGE" | "BOTTOM"` → 일반적인 가상 스크롤에서는 `"scrollToBottom" | "scrollToItem"` 등으로 추상화

##### 성능 최적화 포인트

1. **flushSync 사용**: `flushSync(() => setScrollTop(...))`로 모든 스크롤 이벤트를 동기 렌더링. 이는 프레임 드롭을 유발할 수 있음. 최적화 방안:
   - 스크롤 방향이 같고 빠른 스크롤 시에는 batched update 허용
   - `useTransition`이나 `startTransition` 활용 고려

2. **visibleChildren의 useMemo 의존성**: `[startNode, endNode, Item, childPositions, noticePosition]` - `childPositions`가 매 높이 변경마다 새 배열이므로 빈번한 재계산 발생. 참조 안정성 개선 가능.

3. **childPositions 계산**: `O(n)` 선형 누적합. 아이템 수가 수만 개일 때 매 높이 변경마다 전체 재계산. 세그먼트 트리나 부분 업데이트로 개선 가능.

4. **heightMapByMessageId가 object spread로 업데이트**: `{...prev, [messageId]: newHeight}` → 매번 새 객체 생성. Map이나 immer 활용 가능.

5. **generateEndNodeIndex가 선형 탐색**: 이진 탐색으로 변경하면 O(log n)으로 개선 가능. (현재는 화면에 보이는 노드 수만큼만 순회하므로 실질적 성능 이슈는 적음)

##### 엣지 케이스 및 버그 가능성

1. **InitialMeasure에서 이미지 로드 전 측정**: 이미지가 포함된 메시지의 초기 높이가 잘못 측정될 수 있음. Measure의 ResizeObserver가 후속 보정하지만, 초기 childPositions가 잘못 계산되어 깜빡임 발생 가능.

2. **모든 날짜 구분선의 id가 "date"로 동일**: heightMap에서 모든 날짜 구분선이 같은 높이를 공유. 날짜별로 다른 높이가 필요한 경우(예: 연도 표시 등) 대응 불가.

3. **scrollTop 초기값 -1**: 마운트 직후 scrollTop이 -1인 상태에서 useScrollState가 호출됨. `generateStartNodeIndex(-1, ...)` → scrollTop이 0보다 작으므로 모든 노드가 조건을 만족하지 않아 itemCount 반환 → startNode가 `itemCount - renderAhead`가 될 수 있음. 하지만 `handleInitialScrollBottom`이 즉시 실행되어 보정됨.

4. **스크롤 이벤트 리스너의 빈 의존성**: `useEffect`에서 `onScroll`을 등록하지만 의존성 배열이 빈 배열. `onScroll`이 useCallback으로 안정적이므로 문제 없지만, ESLint exhaustive-deps 규칙에 걸릴 수 있음.

5. **handleItemCountChange에서 isBottom이 stale closure**: `[itemCount]` 의존성만 있어서 isBottom이 최신 값이 아닐 수 있음. action이 "OTHER_MESSAGE"일 때 isBottom 판단이 부정확할 가능성.

6. **handleStayBottom에서 isLengthChanged race condition**: `totalHeight, height, isBottom` 변경 시 실행되는데, `isLengthChanged`가 messageInfo state의 일부이므로 다른 state 업데이트와 동시에 변경될 때 예상치 못한 동작 가능.

7. **ReactPortal 기반 InitialMeasure의 width 문제**: `#chatroom` DOM에 포탈로 렌더링하므로 실제 메시지 영역과 width가 다를 수 있음 (스크롤바 너비 등). 이 경우 측정된 높이가 실제와 다를 수 있음.

##### 라이브러리화 시 권장 개선사항

1. **렌더링 로직 완전 분리**: `renderItem(data, index)` render prop으로 아이템 렌더링을 완전히 외부 위임
2. **높이 측정 전략 플러그인화**: InitialMeasure(사전 측정), Measure(동적 측정), estimatedItemSize(추정치)를 옵션으로 선택 가능하게
3. **sticky 헤더를 일반적인 group header API로 추상화**: 날짜 헤더 뿐만 아니라 임의의 그룹 헤더 지원
4. **imperative API 확장**: `scrollToItem(index, align)`, `scrollToOffset(offset)`, `getScrollOffset()` 등
5. **TypeScript 제네릭**: `DynamicScroll<T extends { id: string }>` 형태로 아이템 타입 안전성 확보
6. **CSS-in-JS 제거**: Tailwind 클래스 대신 인라인 스타일만 사용하여 프레임워크 독립적으로

---

### [2026-04-09] 라이브러리 분리를 위한 종속성 분석

#### 메신저에 종속된 부분 (라이브러리에서 제거 필요)

1. **DynamicScroll.tsx의 메신저 전용 렌더링 로직**
   - `LastSeenMessageMarker` 컴포넌트 직접 import/렌더링 (line 18, 300-306)
   - `ChatRoomTimeStamp` 컴포넌트 직접 import/렌더링 (line 20, 309-320, 376-385)
   - `ChatRoomErrorBubble` import (line 21)
   - `messageId === "lastSeenMessage"`, `messageId === "date"`, `messageId.startsWith("error")` 등 메신저 전용 분기 로직 (line 299-339)
   - `action` 타입 ("MY_MESSAGE", "OTHER_MESSAGE", "BOTTOM") 은 메신저 전용 개념

2. **DynamicScrollWrapper.tsx의 메신저 전용 전처리**
   - `insertDate()`, `insertLastSeenMessage()` - 메신저 도메인 로직
   - `noticeMode`, `noticeCount` - 메신저 공지 관련
   - `ChatContext` (useChat) 직접 의존
   - `MessageInfo`, `UserMessageInfo` 등 메신저 API 타입 의존
   - `ReactPortal` 기반 높이 사전 측정 전략 - 라이브러리화 가능하나 현재 구현은 메신저에 강결합

3. **utils/index.ts의 메신저 전용 유틸**
   - `getFloatingPosition()` - 공지 모드에 따른 위치 계산
   - `insertDate()` - 날짜 구분선 삽입
   - `insertLastSeenMessage()` - 마지막 읽은 메시지 마커 삽입
   - `calculateCumulativeSumDescending()` - 날짜별 누적 높이 계산

#### 라이브러리로 분리 가능한 순수 로직

1. **핵심 가상화 엔진** (반드시 포함)
   - `useScrollState` 훅 전체 - scrollTop + positions로 가시 범위 계산
   - `generateStartNodeIndex()` - 이진 탐색 기반 시작 노드 인덱스 계산
   - `generateEndNodeIndex()` - 끝 노드 인덱스 계산
   - `generateStartNodeIndexWhenCenterNodeIsFixed()` - 특정 아이템 중앙 배치용 시작 노드 계산

2. **높이 측정 시스템** (반드시 포함)
   - `Measure` 컴포넌트 - ResizeObserver 기반 동적 높이 측정
   - `InitialMeasure` 컴포넌트 - 사전 높이 측정

3. **스크롤 관리 로직** (추상화 후 포함)
   - scrollTop 상태 관리 (requestAnimationFrame + flushSync 패턴)
   - 양방향 무한 스크롤 (onScrollStartReach, onScrollEndReach 콜백)
   - 스크롤 위치 보존 (상단 로드 시 prevScrollHeight 활용)
   - 하단 고정 (isBottom + totalHeight 변경 감지)
   - 특정 아이템으로 스크롤 이동 (imperative API)

4. **위치 계산 시스템** (추상화 후 포함)
   - childPositions 누적 위치 배열 계산
   - totalHeight 계산
   - heightMap 관리

#### 구현된 기능 목록

| 기능 | 설명 | 분리 난이도 |
|------|------|-------------|
| 동적 높이 가상 스크롤 | 각 아이템이 서로 다른 높이를 가질 수 있음 | 낮음 |
| ResizeObserver 기반 높이 업데이트 | 아이템 높이 변경 시 자동 반영 | 낮음 |
| 사전 높이 측정 (ReactPortal) | 렌더링 전 숨겨진 DOM에서 높이 측정 | 중간 |
| 양방향 무한 스크롤 | 상단/하단 도달 시 콜백 호출 | 낮음 |
| 스크롤 위치 보존 | 상단 데이터 로드 시 현재 보고 있던 위치 유지 | 낮음 |
| 하단 고정 (stick to bottom) | 하단에 있을 때 새 아이템 추가시 자동 스크롤 | 낮음 |
| 특정 아이템으로 이동 | 아이템을 viewport 중앙에 배치 | 낮음 |
| renderAhead 버퍼 | 가시 영역 전후로 추가 렌더링 (기본값 8) | 낮음 |
| absolute positioning | transform 대신 absolute + top으로 위치 지정 | 낮음 |
| imperative handle | forwardRef + useImperativeHandle로 외부 제어 | 낮음 |
| Sticky 날짜 헤더 | 현재 보고 있는 날짜가 상단에 고정되는 기능 | 높음 (메신저 강결합) |
