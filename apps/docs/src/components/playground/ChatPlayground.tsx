"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DynamicScroll,
  type DynamicScrollHandle,
  type InitialScrollPosition,
  type VirtualScrollItem,
} from "@dynamic-scroll/core";

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
  "저랑 보쌈도시락해요. 이전에 논산에서 새로이 오픈하여 포장해서 와요",
  "감사합니다!",
  "이 PR 리뷰 부탁드려요.",
  "네, 확인하겠습니다.",
  "점심 뭐 드실 건가요?",
  "디자인 시안 확인해주세요.",
  "오 맛있겠다",
  "저도 같이 먹을래요!",
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
    timestamp: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}:${String(id % 60).padStart(2, "0")}`,
    date: dateStr,
    hasImage,
    imageHeight: hasImage
      ? Math.floor(Math.random() * 150) + 80
      : undefined,
    isMyMessage,
  };
}

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

// --- 아이콘 ---

function IconText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function IconArrowDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}

// --- Action Controller 버튼 ---

function ActionButton({
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
    </button>
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
  const [newMessageCount, setNewMessageCount] = useState(0);
  const pendingMessagesRef = useRef<ChatMessage[]>([]);
  const isAtBottomRef = useRef(true);

  const [mode, setMode] = useState<PlaygroundMode>("normal");
  const [modeKey, setModeKey] = useState(0);
  const [isLastMessageLoaded, setIsLastMessageLoaded] = useState(true);

  const fullPoolRef = useRef<ChatMessage[]>([]);
  const loadRangeRef = useRef({ start: 0, end: 0 });
  const lastReadRelativeIndexRef = useRef(0);
  const lastReadIdRef = useRef<string | null>(null);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlightMessage = useCallback((id: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedId(id);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_DURATION);
  }, []);

  useEffect(() => {
    const pool = generateFullMessagePool();
    fullPoolRef.current = pool;

    if (mode === "normal") {
      const start = Math.max(0, pool.length - 60);
      loadRangeRef.current = { start, end: pool.length };
      lastReadIdRef.current = null;
      setIsLastMessageLoaded(true);
      setMessages(pool.slice(start));
    } else {
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

  const switchMode = useCallback((newMode: PlaygroundMode) => {
    setMode(newMode);
    setModeKey((k) => k + 1);
  }, []);

  const initialScrollPosition: InitialScrollPosition =
    mode === "unread"
      ? { index: lastReadRelativeIndexRef.current, align: "center" }
      : "bottom";

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

  const goToLatest = useCallback(() => {
    if (isLastMessageLoaded) {
      scrollRef.current?.scrollToBottom("auto");
    } else {
      const pool = fullPoolRef.current;
      const newStart = Math.max(0, pool.length - 60);
      loadRangeRef.current = { start: newStart, end: pool.length };
      setIsLastMessageLoaded(true);
      setMessages(pool.slice(newStart));
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToBottom("auto");
      });
    }
  }, [isLastMessageLoaded]);

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
    setInputText("");

    if (isLastMessageLoaded) {
      setMessages((prev) => [...prev, msg]);
    } else {
      const pool = fullPoolRef.current;
      const newStart = Math.max(0, pool.length - 60);
      loadRangeRef.current = { start: newStart, end: pool.length };
      setIsLastMessageLoaded(true);
      setMessages([...pool.slice(newStart), msg]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToBottom("auto");
      });
    }
  }, [inputText, isLastMessageLoaded]);

  /** 텍스트 메시지 수신 (이미지 없음) */
  const receiveTextMessage = useCallback(() => {
    const sender = SENDERS[Math.floor(Math.random() * SENDERS.length)];
    const text = MESSAGES_KO[Math.floor(Math.random() * MESSAGES_KO.length)];
    const msg: ChatMessage = {
      id: `msg-${nextId++}`,
      sender,
      text,
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date().toISOString().split("T")[0],
      hasImage: false,
      isMyMessage: false,
    };
    appendOrBuffer(msg);
  }, []);

  /** 이미지 메시지 수신 */
  const receiveImageMessage = useCallback(() => {
    const sender = SENDERS[Math.floor(Math.random() * SENDERS.length)];
    const imageHeight = Math.floor(Math.random() * 150) + 80;
    const msg: ChatMessage = {
      id: `msg-${nextId++}`,
      sender,
      text: "",
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date().toISOString().split("T")[0],
      hasImage: true,
      imageHeight,
      isMyMessage: false,
    };
    appendOrBuffer(msg);
  }, []);

  /** 메시지를 추가하거나 버퍼에 저장 */
  const appendOrBuffer = useCallback((msg: ChatMessage) => {
    if (isAtBottomRef.current) {
      if (isLastMessageLoaded) {
        setMessages((prev) => [...prev, msg]);
      } else {
        const pool = fullPoolRef.current;
        const newStart = Math.max(0, pool.length - 60);
        loadRangeRef.current = { start: newStart, end: pool.length };
        setIsLastMessageLoaded(true);
        setMessages([...pool.slice(newStart), msg]);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollToBottom("auto");
        });
      }
    } else {
      pendingMessagesRef.current.push(msg);
      setNewMessageCount((c) => c + 1);
    }
  }, [isLastMessageLoaded]);

  const goToNewMessages = useCallback(() => {
    const pending = pendingMessagesRef.current;
    pendingMessagesRef.current = [];
    setNewMessageCount(0);

    if (isLastMessageLoaded) {
      setMessages((prev) => [...prev, ...pending]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToBottom("auto");
      });
    } else {
      const pool = fullPoolRef.current;
      const newStart = Math.max(0, pool.length - 60);
      loadRangeRef.current = { start: newStart, end: pool.length };
      setIsLastMessageLoaded(true);
      setMessages([...pool.slice(newStart), ...pending]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToBottom("auto");
      });
    }
  }, [isLastMessageLoaded]);

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

    let targetPoolIdx: number;
    const hasUnloadedBefore = start > 0;
    const hasUnloadedAfter = end < pool.length;

    if (!hasUnloadedBefore && !hasUnloadedAfter) return;

    if (hasUnloadedBefore && hasUnloadedAfter) {
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

    const newStart = Math.max(0, targetPoolIdx - INITIAL_WINDOW_BEFORE);
    const newEnd = Math.min(pool.length, targetPoolIdx + INITIAL_WINDOW_AFTER + 1);
    const newRelativeIdx = targetPoolIdx - newStart;
    const targetId = pool[targetPoolIdx].id;

    loadRangeRef.current = { start: newStart, end: newEnd };
    setIsLastMessageLoaded(newEnd >= pool.length);
    setMessages(pool.slice(newStart, newEnd));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToItem(newRelativeIdx, "center");
      highlightMessage(targetId);
    });
  }, [highlightMessage]);

  const hasUnloadedMessages =
    fullPoolRef.current.length > 0 &&
    (loadRangeRef.current.start > 0 || loadRangeRef.current.end < fullPoolRef.current.length);

  return (
    <div id="demo" className="border rounded-xl overflow-hidden bg-card">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">
        {/* Chat area */}
        <div className="relative flex flex-col" style={{ height: 800 }}>
          {/* Chat header */}
          <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0 bg-card">
            <div className="w-9 h-9 rounded-full bg-foreground/90 shrink-0" />
            <div>
              <p className="text-sm font-semibold leading-tight">대화방</p>
              <p className="text-xs text-muted-foreground">{SENDERS.length}명 참여중</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 relative bg-background">
            {!mounted || messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                로딩 중...
              </div>
            ) : (
              <DynamicScroll
                key={modeKey}
                ref={scrollRef}
                items={messages}
                initialScrollPosition={initialScrollPosition}
                initialLoadingComponent={
                  <div className="flex items-center justify-center text-muted-foreground text-xs gap-2 h-full">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    메시지 높이 측정 중...
                  </div>
                }
                renderItem={(msg, index) => (
                  <div
                    className={`px-4 py-1 transition-colors duration-500 ${
                      highlightedId === msg.id ? "bg-yellow-200/60 dark:bg-yellow-900/30" : ""
                    }`}
                  >
                    {msg.isMyMessage ? (
                      /* 내 메시지: 오른쪽 정렬, 다크 말풍선 */
                      <div className="flex flex-col items-end">
                        <div className="flex items-end gap-1.5">
                          <span className="text-[10px] text-muted-foreground shrink-0 mb-0.5">
                            {msg.timestamp}
                          </span>
                          <div className="bg-foreground text-background rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[240px]">
                            {msg.hasImage && (
                              <img
                                src={`https://picsum.photos/seed/${msg.id}/300/${msg.imageHeight}`}
                                alt=""
                                className="rounded-lg mb-1.5 w-full"
                              />
                            )}
                            {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 상대방 메시지: 왼쪽 정렬, 밝은 말풍선 */
                      <div className="flex flex-col items-start">
                        <p className="text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">{msg.sender}</span>
                          {" · "}
                          오후 {msg.timestamp}
                        </p>
                        <div className="flex items-end gap-1.5">
                          <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[240px]">
                            {msg.hasImage && (
                              <img
                                src={`https://picsum.photos/seed/${msg.id}/300/${msg.imageHeight}`}
                                alt=""
                                className="rounded-lg mb-1.5 w-full"
                              />
                            )}
                            {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                    {mode === "unread" &&
                      msg.id === lastReadIdRef.current && (
                        <div className="flex items-center gap-3 mt-2">
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
                  <div className="text-center py-1">
                    <span className="text-xs text-muted-foreground bg-muted/80 rounded-full px-3 py-1 border">
                      {new Date(dateStr).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      })}
                    </span>
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
                style={{ height: "100%" }}
                onStartReached={loadRangeRef.current.start > 0 ? handleStartReached : undefined}
                onEndReached={!isLastMessageLoaded ? handleEndReached : undefined}
                overscanCount={20}
                onAtBottomChange={(atBottom) => {
                  setIsAtBottom(atBottom);
                  isAtBottomRef.current = atBottom;
                  if (atBottom && pendingMessagesRef.current.length > 0) {
                    const pending = pendingMessagesRef.current;
                    pendingMessagesRef.current = [];
                    setMessages((prev) => [...prev, ...pending]);
                    setNewMessageCount(0);
                  } else if (atBottom) {
                    setNewMessageCount(0);
                  }
                }}
                loadingComponent={<LoadingSpinner text="이전 메시지 불러오는 중..." />}
                bottomLoadingComponent={<LoadingSpinner text="새 메시지 불러오는 중..." />}
              />
            )}

            {/* 새 메시지 알림 */}
            {newMessageCount > 0 && !isAtBottom && (
              <button
                onClick={goToNewMessages}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 13 12 18 17 13" />
                </svg>
                새 메시지 {newMessageCount}개
              </button>
            )}

            {/* 최하단 이동 버튼 */}
            {!isAtBottom && mounted && messages.length > 0 && newMessageCount === 0 && (
              <button
                onClick={goToLatest}
                className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full border bg-background/95 backdrop-blur shadow-md hover:bg-accent transition-colors flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
              </button>
            )}
          </div>

          {/* 메시지 입력 */}
          <div className="border-t px-3 py-2.5 flex items-center gap-2 shrink-0 bg-card">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && sendMessage()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            <button
              onClick={sendMessage}
              className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 transition-colors shrink-0"
            >
              <IconSend />
            </button>
          </div>
        </div>

        {/* Action Controller */}
        <div className="border-l p-5 space-y-5 hidden lg:block overflow-y-auto" style={{ height: 800 }}>
          <div>
            <h3 className="text-base font-semibold">Action Controller</h3>
            <p className="text-xs text-muted-foreground mt-0.5">기능을 직접 테스트해보세요</p>
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">메시지</p>
            <ActionButton
              icon={<IconText />}
              title="새 텍스트 메시지"
              description="랜덤 메시지를 하단에 추가"
              onClick={receiveTextMessage}
            />
            <ActionButton
              icon={<IconImage />}
              title="새 이미지 메시지"
              description="다양한 높이의 이미지 추가"
              onClick={receiveImageMessage}
            />
          </div>

          {/* 탐색 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">탐색</p>
            <ActionButton
              icon={<IconArrowDown />}
              title="랜덤 메시지로 이동 (로드됨)"
              description="현재 로드된 메시지 중 랜덤 이동"
              onClick={goToLoadedMessage}
            />
            <ActionButton
              icon={<IconLayers />}
              title="랜덤 메시지로 이동 (미로드)"
              description="범위 밖 메시지 fetch 후 이동"
              onClick={goToUnloadedMessage}
              disabled={!hasUnloadedMessages}
            />
          </div>

          {/* 모드 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">모드</p>
            <ActionButton
              icon={<IconBell />}
              title="안읽은 메시지로 로드하기"
              description="중간 위치에서 채팅 열기"
              onClick={() => switchMode(mode === "unread" ? "normal" : "unread")}
            />
          </div>
        </div>
      </div>

      {/* Mobile controls */}
      <div className="lg:hidden border-t p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={receiveTextMessage} className="text-xs rounded-lg border px-3 py-1.5 hover:bg-accent">텍스트 수신</button>
          <button onClick={receiveImageMessage} className="text-xs rounded-lg border px-3 py-1.5 hover:bg-accent">이미지 수신</button>
          <button onClick={goToLoadedMessage} className="text-xs rounded-lg border px-3 py-1.5 hover:bg-accent">로드된 메시지 이동</button>
          <button onClick={goToUnloadedMessage} disabled={!hasUnloadedMessages} className="text-xs rounded-lg border px-3 py-1.5 hover:bg-accent disabled:opacity-40">미로드 메시지 이동</button>
          <button onClick={() => switchMode(mode === "unread" ? "normal" : "unread")} className="text-xs rounded-lg border px-3 py-1.5 hover:bg-accent">
            {mode === "unread" ? "일반 모드" : "안읽은 메시지"}
          </button>
        </div>
      </div>
    </div>
  );
}
