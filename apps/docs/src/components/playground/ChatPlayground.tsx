"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DynamicScroll,
  type DynamicScrollHandle,
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

function generateInitialMessages(): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let day = 7; day >= 0; day--) {
    const count = Math.floor(Math.random() * 10) + 5;
    for (let j = 0; j < count; j++) {
      messages.push(createMessage(nextId++, day));
    }
  }
  return messages;
}

function generateOlderMessages(count: number, oldestDate: string): ChatMessage[] {
  const base = new Date(oldestDate);
  const messages: ChatMessage[] = [];
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / 5) + 1;
    const date = new Date(base);
    date.setDate(date.getDate() - dayOffset);
    messages.unshift(createMessage(nextId++, dayOffset + 7));
  }
  return messages;
}

// --- 컴포넌트 ---

export function ChatPlayground() {
  const scrollRef = useRef<DynamicScrollHandle>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 클라이언트에서만 초기 메시지 생성 (hydration mismatch 방지)
  useEffect(() => {
    setMessages(generateInitialMessages());
    setMounted(true);
  }, []);
  const [searchIndex, setSearchIndex] = useState("");
  const [inputText, setInputText] = useState("");

  /** 위로 스크롤 → 이전 메시지 로드 */
  const handleStartReached = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const oldestDate = messages[0]?.date ?? new Date().toISOString().split("T")[0];
    const older = generateOlderMessages(40, oldestDate);
    setMessages((prev) => [...older, ...prev]);
    setLoading(false);
  }, [messages]);

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

  /** 특정 메시지로 이동 */
  const handleScrollToMessage = useCallback(() => {
    const idx = parseInt(searchIndex);
    if (!isNaN(idx) && idx >= 0 && idx < messages.length) {
      scrollRef.current?.scrollToItem(idx, "center");
    }
  }, [searchIndex, messages.length]);

  return (
    <div className="space-y-4">
      {/* 상태 표시 */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <Badge variant="outline">{messages.length}개 메시지</Badge>
        <Badge variant={isAtBottom ? "default" : "secondary"}>
          {isAtBottom ? "하단 위치" : "위로 스크롤 중"}
        </Badge>
        {loading && <Badge variant="secondary">이전 메시지 로딩 중...</Badge>}
      </div>

      {/* 컨트롤 패널 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">컨트롤</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={searchIndex}
              onChange={(e) => setSearchIndex(e.target.value)}
              placeholder="메시지 인덱스"
              min={0}
              max={messages.length - 1}
              className="w-32 border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={handleScrollToMessage}
              className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm hover:bg-accent"
            >
              해당 메시지로 이동
            </button>
            <Separator orientation="vertical" className="h-6" />
            <button
              onClick={() => scrollRef.current?.scrollToBottom("smooth")}
              className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm hover:bg-accent"
            >
              하단으로
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 채팅 영역 */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {!mounted || messages.length === 0 ? (
            <div style={{ height: 500 }} className="flex items-center justify-center text-muted-foreground text-sm">
              로딩 중...
            </div>
          ) : <DynamicScroll
            ref={scrollRef}
            items={messages}
            renderItem={(msg, index) => (
              <div
                className={`px-4 py-2 ${msg.isMyMessage ? "bg-primary/5" : ""}`}
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
                    style={{ height: msg.imageHeight }}
                  />
                )}
                <p className="text-sm mt-0.5">{msg.text}</p>
              </div>
            )}
            groupBy={(msg) => msg.date}
            renderGroupHeader={(dateStr) => (
              <div className="bg-muted/90 backdrop-blur text-center py-1.5 text-xs font-medium text-muted-foreground border-y">
                {new Date(dateStr).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </div>
            )}
            style={{ height: 500 }}
            onStartReached={handleStartReached}
            overscanCount={20}
            onAtBottomChange={setIsAtBottom}
            loadingComponent={loading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                이전 메시지 불러오는 중...
              </div>
            ) : null}
          />}
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
          <p>위로 스크롤하면 이전 메시지를 로드하고 스크롤 위치가 보존됩니다.</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">Sticky 날짜 헤더</p>
          <p>날짜별 그룹 헤더가 스크롤 시 상단에 고정됩니다.</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">하단 고정</p>
          <p>하단에 있을 때 새 메시지가 오면 자동으로 스크롤됩니다.</p>
        </div>
      </div>
    </div>
  );
}
