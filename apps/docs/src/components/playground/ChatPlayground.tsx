"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DynamicScroll,
  type DynamicScrollHandle,
  type InitialScrollPosition,
  type VirtualScrollItem,
} from "@dynamic-scroll/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// --- 타입 ---

interface ChatMessage extends VirtualScrollItem {
  sender: string;
  text: string;
  timestamp: string;
  date: string;
  hasImage: boolean;
  imageHeight?: number;
  isMyMessage: boolean;
}

type PlaygroundMode = "normal" | "unread";

// --- 데이터 생성 ---

const SENDERS = ["민수", "지연", "현우"];

const MESSAGES_KO = [
  "안녕하세요!",
  "오늘 회의 몇 시였죠?",
  "확인해볼게요.",
  "좋습니다!",
  "파일 보내드릴게요. 이전에 논의했던 내용이 포함되어 있습니다.",
  "감사합니다!",
  "이 PR 리뷰 부탁드려요.",
  "네, 확인하겠습니다.",
  "점심 뭐 드실 건가요?",
  "디자인 시안 확인해주세요.",
  "배포 완료했습니다.",
  "테스트 결과 문제 없었어요.",
];

let nextId = Date.now();

function createMessage(id: number, dayOffset: number): ChatMessage {
  const isMyMessage = Math.random() < 0.3;
  const hasImage = Math.random() < 0.15;
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  const dateStr = date.toISOString().split("T")[0];

  return {
    id: `msg-${id}`,
    sender: isMyMessage ? "나" : SENDERS[id % SENDERS.length],
    text: MESSAGES_KO[id % MESSAGES_KO.length],
    timestamp: `${9 + (id % 12)}:${String(id % 60).padStart(2, "0")}`,
    date: dateStr,
    hasImage,
    imageHeight: hasImage
      ? Math.floor(Math.random() * 150) + 80
      : undefined,
    isMyMessage,
  };
}

/** 전체 메시지 풀 생성 (~200개) */
function generateFullMessagePool(): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let day = 20; day >= 0; day--) {
    const count = Math.floor(Math.random() * 8) + 6;
    for (let j = 0; j < count; j++) {
      messages.push(createMessage(nextId++, day));
    }
  }
  return messages;
}

// --- 상수 ---

const LAST_READ_INDEX = 100;
const INITIAL_WINDOW_BEFORE = 20;
const INITIAL_WINDOW_AFTER = 10;
const LOAD_CHUNK_SIZE = 30;
const HIGHLIGHT_DURATION = 2000;

// --- 로딩 스피너 ---

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}
    </div>
  );
}

// --- 컴포넌트 ---

export function ChatPlayground() {
  const scrollRef = useRef<DynamicScrollHandle>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inputText, setInputText] = useState("");

  // --- 모드 관리 ---
  const [mode, setMode] = useState<PlaygroundMode>("normal");
  const [modeKey, setModeKey] = useState(0);
  const [isLastMessageLoaded, setIsLastMessageLoaded] = useState(true);

  // 풀 기반 데이터: 양쪽 모드 모두 사용
  const fullPoolRef = useRef<ChatMessage[]>([]);
  const loadRangeRef = useRef({ start: 0, end: 0 });
  const lastReadRelativeIndexRef = useRef(0);
  const lastReadIdRef = useRef<string | null>(null);

  // --- 하이라이팅 ---
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 메시지 하이라이트 (일정 시간 후 자동 해제) */
  const highlightMessage = useCallback((id: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedId(id);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_DURATION);
  }, []);

  /** 모드 초기화 */
  useEffect(() => {
    const pool = generateFullMessagePool();
    fullPoolRef.current = pool;

    if (mode === "normal") {
      // 일반 모드: 마지막 부분부터 시작
      const start = Math.max(0, pool.length - 60);
      loadRangeRef.current = { start, end: pool.length };
      lastReadIdRef.current = null;
      setIsLastMessageLoaded(true);
      setMessages(pool.slice(start));
    } else {
      // 안읽은 메시지 모드: 중간에서 시작
      const lastRead = Math.min(LAST_READ_INDEX, pool.length - 1);
      const start = Math.max(0, lastRead - INITIAL_WINDOW_BEFORE);
      const end = Math.min(pool.length, lastRead + INITIAL_WINDOW_AFTER + 1);
      loadRangeRef.current = { start, end };
      lastReadRelativeIndexRef.current = lastRead - start;
      lastReadIdRef.current = pool[lastRead].id;
      setIsLastMessageLoaded(end >= pool.length);
      setMessages(pool.slice(start, end));
    }
    setHighlightedId(null);
    setMounted(true);
  }, [mode, modeKey]);

  /** 모드 전환 */
  const switchMode = useCallback((newMode: PlaygroundMode) => {
    setMode(newMode);
    setModeKey((k) => k + 1);
  }, []);

  /** initialScrollPosition */
  const initialScrollPosition: InitialScrollPosition =
    mode === "unread"
      ? { index: lastReadRelativeIndexRef.current, align: "center" }
      : "bottom";

  /** 위로 스크롤 → 이전 메시지 로드 */
  const handleStartReached = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 100));

    const pool = fullPoolRef.current;
    const { start } = loadRangeRef.current;
    if (start <= 0) {
      setLoading(false);
      return;
    }
    const newStart = Math.max(0, start - LOAD_CHUNK_SIZE);
    const olderChunk = pool.slice(newStart, start);
    loadRangeRef.current.start = newStart;
    setMessages((prev) => [...olderChunk, ...prev]);
    setLoading(false);
  }, []);

  /** 아래로 스크롤 → 새 메시지 로드 */
  const handleEndReached = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 100));

    const pool = fullPoolRef.current;
    const { end } = loadRangeRef.current;
    if (end >= pool.length) return;

    const newEnd = Math.min(pool.length, end + LOAD_CHUNK_SIZE);
    const newerChunk = pool.slice(end, newEnd);
    loadRangeRef.current.end = newEnd;
    if (newEnd >= pool.length) {
      setIsLastMessageLoaded(true);
    }
    setMessages((prev) => [...prev, ...newerChunk]);
  }, []);

  /** 최하단으로 이동 (isLastMessageLoaded에 따라 분기) */
  const goToLatest = useCallback(() => {
    if (isLastMessageLoaded) {
      scrollRef.current?.scrollToBottom("smooth");
    } else {
      // 최신 메시지가 로드 안 됨 → 풀 끝부분으로 재로드
      const pool = fullPoolRef.current;
      const newStart = Math.max(0, pool.length - 60);
      loadRangeRef.current = { start: newStart, end: pool.length };
      setIsLastMessageLoaded(true);
      setMessages(pool.slice(newStart));
      // React 재렌더 후 isMeasuring=true → ref가 큐잉 → 측정 완료 시 실행
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToBottom("auto");
      });
    }
  }, [isLastMessageLoaded]);

  /** 메시지 전송 */
  const sendMessage = useCallback(() => {
    const text = inputText.trim() || "새 메시지";
    const hasImage = Math.random() < 0.2;
    const msg: ChatMessage = {
      id: `msg-${nextId++}`,
      sender: "나",
      text,
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date().toISOString().split("T")[0],
      hasImage,
      imageHeight: hasImage
        ? Math.floor(Math.random() * 120) + 80
        : undefined,
      isMyMessage: true,
    };
    setMessages((prev) => [...prev, msg]);
    setInputText("");
  }, [inputText]);

  /** 로드된 메시지로 이동 (랜덤) */
  const goToLoadedMessage = useCallback(() => {
    if (messages.length === 0) return;
    const idx = Math.floor(Math.random() * messages.length);
    scrollRef.current?.scrollToItem(idx, "center");
    highlightMessage(messages[idx].id);
  }, [messages, highlightMessage]);

  /** 로드 안된 메시지로 이동 (풀에서 범위 밖 메시지) */
  const goToUnloadedMessage = useCallback(() => {
    const pool = fullPoolRef.current;
    const { start, end } = loadRangeRef.current;
    if (pool.length === 0) return;

    // 범위 밖 인덱스를 랜덤 선택 (앞쪽 또는 뒤쪽)
    let targetPoolIdx: number;
    const hasUnloadedBefore = start > 0;
    const hasUnloadedAfter = end < pool.length;

    if (!hasUnloadedBefore && !hasUnloadedAfter) return; // 모두 로드됨

    if (hasUnloadedBefore && hasUnloadedAfter) {
      // 앞뒤 중 랜덤 선택
      if (Math.random() < 0.5) {
        targetPoolIdx = Math.floor(Math.random() * start);
      } else {
        targetPoolIdx = end + Math.floor(Math.random() * (pool.length - end));
      }
    } else if (hasUnloadedBefore) {
      targetPoolIdx = Math.floor(Math.random() * start);
    } else {
      targetPoolIdx = end + Math.floor(Math.random() * (pool.length - end));
    }

    // 해당 메시지 주변으로 윈도우 재설정
    const newStart = Math.max(0, targetPoolIdx - INITIAL_WINDOW_BEFORE);
    const newEnd = Math.min(pool.length, targetPoolIdx + INITIAL_WINDOW_AFTER + 1);
    const newRelativeIdx = targetPoolIdx - newStart;
    const targetId = pool[targetPoolIdx].id;

    loadRangeRef.current = { start: newStart, end: newEnd };
    setIsLastMessageLoaded(newEnd >= pool.length);
    setMessages(pool.slice(newStart, newEnd));
    // React 재렌더 후 isMeasuring=true → ref가 큐잉 → 측정 완료 시 실행
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToItem(newRelativeIdx, "center");
      highlightMessage(targetId);
    });
  }, [highlightMessage]);

  /** 범위 밖 메시지 존재 여부 */
  const hasUnloadedMessages =
    fullPoolRef.current.length > 0 &&
    (loadRangeRef.current.start > 0 || loadRangeRef.current.end < fullPoolRef.current.length);

  return (
    <div className="space-y-4">
      {/* 모드 선택 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => switchMode("normal")}
          className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "normal"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          일반 채팅
        </button>
        <button
          onClick={() => switchMode("unread")}
          className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "unread"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          안읽은 메시지에서 열기
        </button>
      </div>

      {/* 상태 표시 */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <Badge variant="outline">{messages.length}개 메시지</Badge>
        <Badge variant={isAtBottom ? "default" : "secondary"}>
          {isAtBottom ? "하단 위치" : "위로 스크롤 중"}
        </Badge>
        {loading && <Badge variant="secondary">이전 메시지 로딩 중...</Badge>}
        <Badge variant="outline">
          풀: {fullPoolRef.current.length}개 중 {loadRangeRef.current.start}~{loadRangeRef.current.end} 로드
        </Badge>
        <Badge variant={isLastMessageLoaded ? "default" : "destructive"}>
          {isLastMessageLoaded ? "최신 메시지 로드됨" : "최신 메시지 미로드"}
        </Badge>
        {mode === "unread" && (
          <Badge variant="secondary">
            lastRead: #{lastReadRelativeIndexRef.current} (중앙 정렬)
          </Badge>
        )}
      </div>

      {/* 컨트롤 패널 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">컨트롤</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={goToLoadedMessage}
              className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm hover:bg-accent"
            >
              로드된 메시지로 이동
            </button>
            <button
              onClick={goToUnloadedMessage}
              disabled={!hasUnloadedMessages}
              className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              로드 안된 메시지로 이동
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 채팅 영역 */}
      <Card className="overflow-hidden relative">
        <CardContent className="p-0">
          {!mounted || messages.length === 0 ? (
            <div style={{ height: "50vh" }} className="flex items-center justify-center text-muted-foreground text-sm">
              로딩 중...
            </div>
          ) : (
            <DynamicScroll
              key={modeKey}
              ref={scrollRef}
              items={messages}
              initialScrollPosition={initialScrollPosition}
              initialLoadingComponent={
                <div className="flex items-center justify-center text-muted-foreground text-xs gap-2" style={{ height: "50vh" }}>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  메시지 높이 측정 중...
                </div>
              }
              renderItem={(msg, index) => (
                <div
                  className={`px-4 py-2 transition-colors duration-500 ${
                    highlightedId === msg.id
                      ? "bg-yellow-200/60 dark:bg-yellow-900/30"
                      : msg.isMyMessage
                        ? "bg-primary/5"
                        : ""
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm">{msg.sender}</span>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      #{index}
                    </span>
                  </div>
                  {msg.hasImage && (
                    <img
                      src={`https://picsum.photos/seed/${msg.id}/300/${msg.imageHeight}`}
                      alt=""
                      className="rounded mt-1.5 max-w-[200px]"
                    />
                  )}
                  <p className="text-sm mt-0.5">{msg.text}</p>
                  {mode === "unread" &&
                    msg.id === lastReadIdRef.current && (
                      <div className="flex items-center gap-3 mt-2 -mx-4 px-4">
                        <div className="flex-1 h-px bg-blue-400/50" />
                        <span className="text-xs text-blue-500/80 font-medium shrink-0">
                          여기까지 읽었습니다
                        </span>
                        <div className="flex-1 h-px bg-blue-400/50" />
                      </div>
                    )}
                </div>
              )}
              groupBy={(msg) => msg.date}
              renderGroupHeader={(dateStr) => (
                <div className="bg-muted/95 backdrop-blur-sm text-center py-1.5 text-xs font-medium text-muted-foreground rounded-full mx-auto w-fit px-4 shadow-sm border">
                  {new Date(dateStr).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </div>
              )}
              renderGroupSeparator={(dateStr) => (
                <div className="flex items-center gap-3 py-2 px-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground/60 shrink-0">
                    {new Date(dateStr).toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              style={{ height: "50vh" }}
              onStartReached={loadRangeRef.current.start > 0 ? handleStartReached : undefined}
              onEndReached={!isLastMessageLoaded ? handleEndReached : undefined}
              overscanCount={20}
              onAtBottomChange={setIsAtBottom}
              loadingComponent={<LoadingSpinner text="이전 메시지 불러오는 중..." />}
              bottomLoadingComponent={<LoadingSpinner text="새 메시지 불러오는 중..." />}
            />
          )}

          {/* 플로팅 최하단 이동 버튼 */}
          {!isAtBottom && mounted && messages.length > 0 && (
            <button
              onClick={goToLatest}
              className="absolute bottom-16 right-4 z-10 flex items-center gap-1.5 rounded-full border bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-md hover:bg-accent transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 13 12 18 17 13" />
                <polyline points="7 6 12 11 17 6" />
              </svg>
              {isLastMessageLoaded ? "최하단으로" : "최신 메시지로"}
            </button>
          )}
        </CardContent>

        {/* 메시지 입력 */}
        <div className="border-t p-3 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 border rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={sendMessage}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            전송
          </button>
        </div>
      </Card>

      {/* 기능 설명 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
        <div className="border rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">사전 높이 측정</p>
          <p>이미지 포함 메시지도 렌더 전에 정확한 높이를 측정합니다.</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">양방향 무한 스크롤</p>
          <p>위/아래 스크롤 시 메시지를 로드하고 스크롤 위치가 보존됩니다.</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">메시지 검색 이동</p>
          <p>로드된/안된 메시지 모두 이동 가능. 하이라이트로 위치를 표시합니다.</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">초기 위치 지정</p>
          <p>마지막 읽은 메시지 위치에서 채팅을 열 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
