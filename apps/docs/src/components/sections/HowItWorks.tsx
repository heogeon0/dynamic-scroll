"use client";

import React from "react";

// --- 태그 컴포넌트 ---

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground">
      {children}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-base bg-muted px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

// --- Virtual Scroll 다이어그램 ---

function VirtualScrollDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 justify-center">
        <div className="w-48 shrink-0">
          <div className="border rounded-lg bg-background p-3 space-y-2">
            <div className="h-6 rounded bg-muted" />
            <div className="h-8 rounded bg-muted" />
            <div className="border-2 border-blue-400 rounded-md p-1.5 space-y-2">
              <div className="h-7 rounded bg-foreground/80" />
              <div className="h-10 rounded bg-foreground" />
              <div className="h-5 rounded bg-foreground/70" />
            </div>
            <div className="h-7 rounded bg-muted" />
            <div className="h-6 rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-3 max-w-xs">
          <p className="text-base font-medium text-blue-500">Viewport 영역</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            전체 리스트 중 보이는 영역만 렌더링하여 DOM 노드 수를 최소화합니다.
          </p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>회색 = 렌더링 안 됨</p>
            <p>검정 = 렌더링 됨</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 이진 탐색 다이어그램 ---

function BinarySearchDiagram() {
  const positions = [0, 50, 120, 200, 350, 420, 500, 580, 700];
  const currentScrollPosition = 340;
  const foundIdx = 3;

  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="space-y-6">
        {/* positions 배열 시각화 */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-muted-foreground">메시지들의 위치 배열</p>
          <div className="flex gap-1 flex-wrap">
            {positions.map((pos, i) => (
              <div
                key={i}
                className={`flex flex-col items-center rounded-md border px-2.5 py-1.5 text-xs font-mono ${
                  i === foundIdx
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background"
                }`}
              >
                <span className="text-[10px] text-inherit opacity-60">[{i}]</span>
                <span>{pos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 현재 스크롤 위치 표시 */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">현재 스크롤 위치:</span>
          <span className="text-sm font-mono font-semibold">{currentScrollPosition}</span>
          <span className="text-xs text-muted-foreground">→ 인덱스 {foundIdx} 반환 (top: {positions[foundIdx]}, bottom: {positions[foundIdx + 1]})</span>
        </div>

        {/* 탐색 과정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { step: 1, range: "[0, 7]", mid: 3, center: 275, dir: "오른쪽 →", result: "[3, 7]" },
            { step: 2, range: "[3, 7]", mid: 5, center: 460, dir: "← 왼쪽", result: "[3, 5]" },
            { step: 3, range: "[3, 5]", mid: 4, center: 385, dir: "← 왼쪽", result: "[3, 4]" },
            { step: 4, range: "[3, 4]", mid: 3, center: 275, dir: "찾음!", result: "idx 3" },
          ].map(({ step, range, mid, center, dir, result }) => (
            <div key={step} className="flex items-center gap-2 text-xs font-mono">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px]">{step}</span>
              <span className="text-muted-foreground">범위 {range}, mid={mid}, 중심={center}</span>
              <span className={`font-medium ${step === 4 ? "text-foreground" : "text-muted-foreground"}`}>{dir}</span>
              <span className="text-muted-foreground">→ {result}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Pre-render Measurement 다이어그램 ---

function MeasurementDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 justify-center">
        <div className="w-56 shrink-0 space-y-3">
          <div className="border border-dashed rounded-lg p-3 space-y-2 opacity-60">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">visibility: hidden</p>
            <div className="flex items-center gap-2">
              <div className="h-5 flex-1 rounded bg-muted" />
              <span className="text-[10px] font-mono text-muted-foreground">72px</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 flex-1 rounded bg-muted" />
              <span className="text-[10px] font-mono text-muted-foreground">148px</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 rounded bg-muted" />
              <span className="text-[10px] font-mono text-muted-foreground">56px</span>
            </div>
          </div>
          <div className="flex justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <div className="border rounded-lg p-3 bg-background">
            <p className="text-[10px] font-mono text-muted-foreground mb-1.5">heightMap (Ref)</p>
            <div className="font-mono text-[10px] space-y-0.5">
              <p><span className="text-muted-foreground">item-0:</span> 72</p>
              <p><span className="text-muted-foreground">item-1:</span> 148</p>
              <p><span className="text-muted-foreground">item-2:</span> 56</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 max-w-xs">
          <p className="text-base font-medium">렌더 전 높이 확보</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            숨겨진 영역에서 모든 아이템을 렌더링하여 실제 DOM 높이를 측정합니다.
            이미지 로드까지 대기하며, 측정 결과는 Ref에 저장하여 리렌더 없이 수집합니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            모든 측정이 끝나면 딱 1번만 setState하여 가상 스크롤을 시작합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Height Locking 다이어그램 ---

function HeightLockingDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="space-y-6">
        {/* 문제 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-500/80">문제: 이미지 깜빡임</p>
          <div className="flex items-center gap-3">
            <div className="border rounded-lg p-3 bg-background space-y-1 w-32 text-center">
              <div className="h-9 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">img 로드됨</div>
              <p className="text-[10px] font-mono">148px</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
            <div className="border border-red-300 rounded-lg p-3 bg-background space-y-1 w-32 text-center">
              <div className="h-3 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">img 없음</div>
              <p className="text-[10px] font-mono text-red-500">32px !</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
            <div className="border rounded-lg p-3 bg-background space-y-1 w-32 text-center">
              <div className="h-9 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">img 로드됨</div>
              <p className="text-[10px] font-mono">148px</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground ml-36">InitialMeasure → VirtualScroll (캐시 miss) → 로드 완료</p>
        </div>

        {/* 해결 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-green-600/80">해결: Height Locking</p>
          <div className="flex items-center gap-4">
            {[
              { step: "1", label: "마운트", desc: "height: 148px 잠금", color: "border-blue-300" },
              { step: "2", label: "DOM 변경 감지", desc: "MutationObserver → 잠금 해제", color: "border-amber-300" },
              { step: "3", label: "높이 감지", desc: "ResizeObserver → heightMap 갱신", color: "border-green-300" },
            ].map(({ step, label, desc, color }) => (
              <div key={step} className={`border-2 ${color} rounded-lg p-3 bg-background flex-1`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-mono">{step}</span>
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sticky Header 다이어그램 ---

function StickyHeaderDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 justify-center">
        <div className="w-52 shrink-0">
          <div className="border rounded-lg bg-background overflow-hidden">
            <div className="px-3 pt-3 pb-1 flex justify-center">
              <span className="bg-muted text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                2024년 1월 15일
              </span>
            </div>
            <div className="p-2 space-y-1.5">
              <div className="h-5 rounded bg-muted w-3/4" />
              <div className="h-7 rounded bg-muted w-full" />
              <div className="h-5 rounded bg-muted w-2/3" />
            </div>
            <div className="relative flex items-center px-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background text-[10px] text-muted-foreground px-3 py-0.5 rounded-full border">1월 16일</span>
              </span>
            </div>
            <div className="p-2 space-y-1.5">
              <div className="h-6 rounded bg-muted w-5/6" />
              <div className="h-5 rounded bg-muted w-1/2" />
            </div>
          </div>
        </div>
        <div className="space-y-3 max-w-xs">
          <p className="text-base font-medium">GroupWrapper + Separator</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            GroupWrapper는 스크롤 위치에 영향을 주지 않으면서 그룹 전체 높이를 가집니다.
            그 안에서 sticky 날짜 라벨이 동작하며, 그룹 경계에서 자연스럽게 push-up됩니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            Separator는 스크롤 위치에 영향을 주는 일반 아이템으로 측정되어,
            sticky 라벨과 하나처럼 연결됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Sticky 문제 시각화 다이어그램 ---

function StickyProblemDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 원하는 동작 */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-blue-500/80">원하는 동작</p>
          <div className="border rounded-lg bg-background overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 z-10 px-3 py-1.5 flex justify-center">
              <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                1월 15일 수요일
              </span>
            </div>
            <div className="p-2 pt-8 space-y-1.5">
              <div className="h-5 rounded bg-muted w-3/4" />
              <div className="h-7 rounded bg-muted w-full" />
              <div className="h-5 rounded bg-muted w-2/3" />
              <div className="h-6 rounded bg-muted w-full" />
            </div>
            <p className="text-[10px] text-center text-muted-foreground py-1">
              스크롤해도 날짜가 상단에 떠 있음
            </p>
          </div>
        </div>

        {/* 해결: GroupWrapper */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-green-500/80">GroupWrapper (레이아웃 무영향)</p>
          <div className="border border-green-200 dark:border-green-900/50 rounded-lg bg-background p-3 space-y-2">
            <div className="text-[10px] font-mono text-muted-foreground space-y-1">
              <p className="text-green-600 dark:text-green-400">GroupWrapper <span className="text-muted-foreground">height: 그룹 전체</span></p>
              <div className="ml-3 space-y-1 border-l border-green-300 dark:border-green-800 pl-2">
                <p className="text-green-600 dark:text-green-400">└─ 날짜 라벨 <span className="text-muted-foreground">sticky</span></p>
              </div>
            </div>
            <p className="text-[10px] text-green-600/80 dark:text-green-400/80">
              스크롤 위치에 영향 없이 sticky 라벨이 동작
            </p>
          </div>
        </div>

        {/* 해결: Separator */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-green-500/80">Separator (레이아웃 반영)</p>
          <div className="border border-green-200 dark:border-green-900/50 rounded-lg bg-background p-3 space-y-2">
            <div className="text-[10px] font-mono text-muted-foreground space-y-1">
              <p className="text-green-600 dark:text-green-400">Separator <span className="text-muted-foreground">일반 아이템으로 측정</span></p>
              <div className="ml-3 flex items-center gap-2 mt-1">
                <div className="flex-1 h-px bg-green-300 dark:bg-green-700" />
                <span className="text-[9px] text-green-600 dark:text-green-400">1월 16일</span>
                <div className="flex-1 h-px bg-green-300 dark:bg-green-700" />
              </div>
            </div>
            <p className="text-[10px] text-green-600/80 dark:text-green-400/80">
              sticky 라벨과 하나처럼 자연스럽게 연결
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sticky 착지 효과 다이어그램 ---

function StickyLandingDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 스크롤 중 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">스크롤 중 (그룹 A 영역)</p>
          <div className="border rounded-lg bg-background overflow-hidden">
            <div className="px-3 pt-3 pb-1 flex justify-center">
              <span className="bg-muted text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                1월 15일 수요일
              </span>
            </div>
            <div className="p-2 space-y-1.5">
              <div className="h-5 rounded bg-muted w-3/4" />
              <div className="h-5 rounded bg-muted w-2/3" />
              <div className="h-5 rounded bg-muted w-full" />
            </div>
            <div className="relative flex items-center px-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background text-[10px] text-muted-foreground px-3 py-0.5 rounded-full border">1월 16일</span>
              </span>
            </div>
            <div className="p-2 space-y-1">
              <div className="h-5 rounded bg-muted w-5/6" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">날짜 라벨이 상단에 떠 있음</p>
        </div>

        {/* Push-up */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">그룹 A 끝 도달 (push-up)</p>
          <div className="border rounded-lg bg-background overflow-hidden">
            <div className="p-2 space-y-1.5">
              <div className="h-5 rounded bg-muted w-full" />
            </div>
            <div className="px-3 py-1 flex justify-center opacity-50">
              <span className="bg-muted text-[10px] font-medium px-3 py-0.5 rounded-full">
                1월 15일 수요일 ↑
              </span>
            </div>
            <div className="relative flex items-center px-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background text-[10px] text-muted-foreground px-3 py-0.5 rounded-full border">1월 16일</span>
              </span>
            </div>
            <div className="p-2 space-y-1">
              <div className="h-5 rounded bg-muted w-5/6" />
              <div className="h-5 rounded bg-muted w-2/3" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">&quot;1월 15일&quot;이 밀려 내려오고 &quot;1월 16일&quot;이 떠오름</p>
        </div>
      </div>
    </div>
  );
}

// --- GroupWrapper height 계산 다이어그램 ---

function GroupHeightDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="space-y-4">
        {/* items 배열 */}
        <div className="flex gap-1 flex-wrap items-center">
          {[
            { id: "sep-A", h: 32, type: "sep" },
            { id: "msg-1", h: 64, type: "msg" },
            { id: "msg-2", h: 48, type: "msg" },
            { id: "msg-3", h: 120, type: "msg" },
            { id: "sep-B", h: 32, type: "sep" },
            { id: "msg-4", h: 64, type: "msg" },
            { id: "msg-5", h: 48, type: "msg" },
          ].map((item) => (
            <div
              key={item.id}
              className={`rounded px-2 py-1 text-[10px] font-mono ${
                item.type === "sep"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {item.id} <span className="opacity-60">{item.h}px</span>
            </div>
          ))}
        </div>

        {/* GroupWrapper 계산 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-3 bg-background">
            <p className="text-xs font-medium mb-1">GroupWrapper A</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              top = 0, height = 32 + 64 + 48 + 120 = <span className="text-foreground font-medium">264px</span>
            </p>
          </div>
          <div className="border rounded-lg p-3 bg-background">
            <p className="text-xs font-medium mb-1">GroupWrapper B</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              top = 264px, height = 32 + 64 + 48 = <span className="text-foreground font-medium">144px</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Bidirectional Scroll 다이어그램 ---

function BidirectionalDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 justify-center">
        <div className="w-52 shrink-0 space-y-3">
          <div className="border rounded-lg bg-background p-3">
            <div className="space-y-1.5">
              <div className="h-4 rounded bg-blue-200 w-full" />
              <div className="h-4 rounded bg-blue-200 w-3/4" />
              <div className="border-t border-dashed my-1" />
              <div className="h-4 rounded bg-foreground/20 w-full" />
              <div className="h-4 rounded bg-foreground/20 w-2/3" />
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              prepend → scrollTop += diff
            </p>
          </div>
          <div className="border rounded-lg bg-background p-3">
            <div className="space-y-1.5">
              <div className="h-4 rounded bg-foreground/20 w-full" />
              <div className="h-4 rounded bg-foreground/20 w-2/3" />
              <div className="border-t border-dashed my-1" />
              <div className="h-4 rounded bg-green-200 w-full" />
              <div className="h-4 rounded bg-green-200 w-3/4" />
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              append → stick-to-bottom 차단
            </p>
          </div>
        </div>
        <div className="space-y-3 max-w-xs">
          <p className="text-base font-medium">가드 Ref로 위치 보존</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            위로 스크롤 시 과거 메시지가 prepend되면 scrollTop을 보정하여 화면 점프를 방지합니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            아래로 스크롤 시 새 메시지가 append되면 stick-to-bottom을 차단하여
            유저가 보던 위치를 유지합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- 가드 ref 흐름 다이어그램 ---

function GuardRefFlowDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="space-y-6">
        {/* 도달 감지 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">도달 감지 (scrollTop 변경 시)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded-lg p-3 bg-background">
              <p className="text-xs font-medium text-blue-500 mb-1">상단 도달</p>
              <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
                <p>backwardLoadingRef = true</p>
                <p>prevScrollHeightRef = scrollHeight</p>
                <p>onStartReached() 호출</p>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-background">
              <p className="text-xs font-medium text-green-600 mb-1">하단 도달</p>
              <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
                <p>forwardLoadingRef = true</p>
                <p>onEndReached() 호출</p>
              </div>
            </div>
          </div>
        </div>

        {/* 화살표 */}
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
          <p className="text-[10px]">새 아이템 도착 → 측정 시작 → 측정 완료 → totalHeight 변경</p>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </div>

        {/* totalHeight effect */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">totalHeight effect (측정 완료 시)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border-2 border-blue-200 rounded-lg p-3 bg-background">
              <p className="text-xs font-medium mb-1">backward?</p>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>diff = 새 scrollHeight - 저장값</p>
                <p>el.scrollTop += diff</p>
                <p className="text-foreground font-medium">→ 위치 보존 완료</p>
              </div>
            </div>
            <div className="border-2 border-green-200 rounded-lg p-3 bg-background">
              <p className="text-xs font-medium mb-1">forward?</p>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>아무것도 안 함</p>
                <p>stick-to-bottom 차단</p>
                <p className="text-foreground font-medium">→ 측정 완료 후 해제</p>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-background">
              <p className="text-xs font-medium mb-1">둘 다 아님?</p>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>isAtBottom이면</p>
                <p>stick-to-bottom 유지</p>
                <p className="text-foreground font-medium">→ 하단 자동 유지</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Chat Patterns 다이어그램 ---

function ChatPatternsDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 justify-center">
        <div className="w-64 shrink-0">
          <div className="font-mono text-[10px] space-y-1">
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground">{n}</div>
                ))}
              </div>
              <span className="text-muted-foreground/50">...</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[80, 81, 82].map((n) => (
                  <div key={n} className="w-5 h-5 rounded bg-foreground text-background flex items-center justify-center text-[8px]">{n}</div>
                ))}
              </div>
              <span className="text-muted-foreground/50">...</span>
              <div className="flex gap-0.5">
                {[108, 109, 110].map((n) => (
                  <div key={n} className="w-5 h-5 rounded bg-foreground text-background flex items-center justify-center text-[8px]">{n}</div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground/50">...</span>
              <div className="flex gap-0.5">
                {[198, 199, 200].map((n) => (
                  <div key={n} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground text-[8px]">{n}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-[10px]">
            <p><span className="inline-block w-3 h-3 rounded bg-foreground align-middle mr-1" /> 로드됨 (items)</p>
            <p><span className="inline-block w-3 h-3 rounded bg-muted align-middle mr-1" /> 미로드 (서버)</p>
          </div>
        </div>
        <div className="space-y-3 max-w-xs">
          <p className="text-base font-medium">부분 로딩 윈도우</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            채팅은 전체 메시지의 일부만 로드합니다. 라이브러리는 받은 items만 가상화하며,
            &quot;뒤에 더 있는지&quot;는 소비자가 관리합니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            메시지 전송, 검색 이동 등 모든 액션이{" "}
            <Code>isLastMessageLoaded</Code>{" "}
            상태에 따라 분기됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- 메시지 이동 분기 다이어그램 ---

function MessageNavigationDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-medium">로드된 메시지로 이동</p>
          <div className="border rounded-lg p-4 bg-background space-y-2">
            <div className="flex gap-0.5">
              {[80, 81, 82, 83, 84].map((n) => (
                <div key={n} className={`w-7 h-7 rounded flex items-center justify-center text-[9px] font-mono ${
                  n === 82 ? "bg-foreground text-background ring-2 ring-blue-400" : "bg-foreground/80 text-background"
                }`}>{n}</div>
              ))}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
              <p>scrollRef.scrollToItem(idx, &quot;center&quot;)</p>
              <p className="text-foreground">→ 즉시 실행 (측정 불필요)</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium">로드 안된 메시지로 이동</p>
          <div className="border rounded-lg p-4 bg-background space-y-2">
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[10, 11, 12, 13, 14].map((n) => (
                  <div key={n} className={`w-7 h-7 rounded flex items-center justify-center text-[9px] font-mono ${
                    n === 12 ? "bg-foreground text-background ring-2 ring-blue-400" : "bg-muted text-muted-foreground"
                  }`}>{n}</div>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground ml-1">← fetch 필요</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
              <p>setMessages(fetched)</p>
              <p>scrollRef.scrollToItem(idx, &quot;center&quot;)</p>
              <p className="text-foreground">→ 자동 큐잉 (측정 완료 후 실행)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 메시지 전송 분기 다이어그램 ---

function SendMessageDiagram() {
  return (
    <div className="border rounded-xl bg-muted/30 p-8 md:p-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-green-200 rounded-lg p-4 bg-background space-y-2">
          <p className="text-xs font-medium text-green-600">isLastMessageLoaded = true</p>
          <div className="flex items-center gap-1">
            {[197, 198, 199, 200].map((n) => (
              <div key={n} className="w-7 h-7 rounded bg-foreground text-background flex items-center justify-center text-[9px] font-mono">{n}</div>
            ))}
            <div className="w-7 h-7 rounded bg-green-500 text-white flex items-center justify-center text-[9px] font-mono">+</div>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>items에 append</p>
            <p>stick-to-bottom이 처리</p>
          </div>
        </div>
        <div className="border-2 border-amber-200 rounded-lg p-4 bg-background space-y-2">
          <p className="text-xs font-medium text-amber-600">isLastMessageLoaded = false</p>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[80, 81, 82].map((n) => (
                <div key={n} className="w-7 h-7 rounded bg-muted text-muted-foreground flex items-center justify-center text-[9px] font-mono">{n}</div>
              ))}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground mx-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            <div className="flex gap-0.5">
              {[198, 199, 200].map((n) => (
                <div key={n} className="w-7 h-7 rounded bg-foreground text-background flex items-center justify-center text-[9px] font-mono">{n}</div>
              ))}
            </div>
            <div className="w-7 h-7 rounded bg-amber-500 text-white flex items-center justify-center text-[9px] font-mono">+</div>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>최신 범위 re-fetch + append</p>
            <p>scrollToBottom() (큐잉 지원)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 플로팅 TOC ---

const TOC_ITEMS = [
  { id: "demo", label: "Demo", number: "", category: "" },
  { id: "category-scroll", label: "스크롤", number: "", category: "", isCategory: true },
  { id: "virtual-scroll", label: "사전 렌더링 기반 가상 스크롤", number: "01", category: "스크롤" },
  { id: "sticky-group-header", label: "Sticky Group Header", number: "02", category: "스크롤" },
  { id: "category-chat", label: "채팅", number: "", category: "", isCategory: true },
  { id: "bidirectional-scroll", label: "양방향 무한 스크롤", number: "03", category: "채팅" },
  { id: "chat-app-patterns", label: "Chat App Patterns", number: "04", category: "채팅" },
] as const;

function FloatingTOC() {
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const item of TOC_ITEMS) {
      const el = document.getElementById(item.id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(item.id);
          }
        },
        { rootMargin: "-20% 0px -60% 0px" }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className="hidden xl:block fixed right-8 top-20 z-40 border rounded-xl bg-background/80 backdrop-blur-sm shadow-lg p-4">
      <div className="space-y-1 text-xs">
        {TOC_ITEMS.map((item) => {
          if ("isCategory" in item && item.isCategory) {
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`block pt-3 pb-1 text-[11px] font-semibold tracking-wider transition-colors ${
                  activeId === item.id
                    ? "text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                }`}
              >
                {item.label}
              </a>
            );
          }

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block py-1 pl-3 border-l-2 transition-colors ${
                activeId === item.id
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
              }`}
            >
              {item.number && <span className="font-mono mr-1.5">{item.number}</span>}
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

// --- 메인 컴포넌트 ---

export function HowItWorks() {
  return (
    <section id="how-it-works" className="space-y-24 [word-break:keep-all]">
      <FloatingTOC />

      {/* 헤더 */}
      <div className="space-y-3">
        <p className="text-base font-medium text-muted-foreground tracking-wider uppercase">
          How it works
        </p>
        <h2 className="text-3xl font-bold tracking-tight">작동 원리</h2>
        <p className="text-muted-foreground">
          각 핵심 기능의 구현 방식과 해결한 문제를 설명합니다.
        </p>
        <hr className="border-border mt-6" />
      </div>

      {/* 카테고리: 스크롤 */}
      <div id="category-scroll" className="flex items-center gap-4">
        <span className="text-xl font-bold tracking-tight">스크롤</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* 01. 사전 렌더링 기반 가상 스크롤 */}
      <article id="virtual-scroll" className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-mono text-muted-foreground">01</p>
          <h3 className="text-3xl font-bold tracking-tight">사전 렌더링 기반 가상 스크롤</h3>
        </div>

        {/* Problem / Solution */}
        <div className="space-y-4">
          <div className="border-l-2 border-red-400/60 pl-4 py-2 space-y-1">
            <p className="text-xs font-semibold text-red-400 tracking-wider uppercase">Problem</p>
            <p className="text-base text-muted-foreground leading-relaxed">
              메신저의 메시지는 텍스트, 이미지, 파일 등 종류에 따라 높이가 모두 다릅니다.
              기존 가상 스크롤 라이브러리는 아이템의 높이를 추정한 뒤, 실제 렌더링 후 보정하는 방식을 사용합니다.
              이 과정에서 <strong className="text-foreground">스크롤 점프</strong>와{" "}
              <strong className="text-foreground">레이아웃 시프트</strong>가 발생합니다.
            </p>
          </div>
          <div className="border-l-2 border-green-400/60 pl-4 py-2 space-y-1">
            <p className="text-xs font-semibold text-green-400 tracking-wider uppercase">Solution</p>
            <p className="text-base text-muted-foreground leading-relaxed">
              렌더링 전에 숨겨진 영역에서 실제 DOM 높이를 먼저 측정하고,
              정확한 높이를 기반으로 가상 스크롤을 시작합니다.
              높이 추정이 필요 없으므로 스크롤 점프와 레이아웃 시프트가 원천적으로 발생하지 않습니다.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">가상 스크롤이란?</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            1,000개의 메시지가 있다고 해도, 화면에 보이는 건 10~20개 정도입니다.
            가상 스크롤은 이 점을 활용하여 <strong className="text-foreground">보이는 영역의 아이템만 실제 DOM에 렌더링</strong>합니다.
            나머지 아이템은 DOM에 존재하지 않지만, 전체 높이를 유지하여 자연스러운 스크롤바를 제공합니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            각 아이템은 <Code>position: absolute</Code>로 배치되며,
            사전에 측정된 높이를 기반으로 정확한 요소의 위치(top)가 계산됩니다.
            사용자가 스크롤하면 현재 스크롤 위치에 따라 해당하는 아이템 범위를
            탐색하여 렌더링합니다.
          </p>
        </div>

        <VirtualScrollDiagram />

        <div className="space-y-3">
          <p className="text-base font-medium">이진 탐색으로 첫 번째 아이템 찾기</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            스크롤이 발생할 때마다 "지금 화면에 보여야 할 첫 번째 아이템"을 찾아야 합니다.
            모든 아이템의 높이가 동일하다면 단순 나눗셈으로 구할 수 있지만,
            높이가 각각 다른 경우에는 아이템을 하나씩 순회하며 찾아야 합니다.
            메시지가 10,000개라면 매 스크롤 이벤트마다 최대 10,000번의 비교가 필요합니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            각 아이템의 위치는 높이의 누적합이므로 <strong className="text-foreground">항상 정렬된 상태</strong>입니다.
            이 특성을 활용하면 이진 탐색으로 O(log n)만에 시작 아이템을 찾을 수 있습니다.
            10,000개의 메시지도 최대 14번의 비교로 충분합니다.
          </p>
          <BinarySearchDiagram />
          <p className="text-base text-muted-foreground leading-relaxed">
            이 이진 탐색을 활용하면 단순히 화면에 보여줄 아이템을 찾는 것 외에도,
            특정 메시지로 바로 이동하거나 안 읽은 메시지 위치를 즉시 찾아
            스크롤하는 기능도 구현할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tag>사전 렌더링 측정</Tag>
          <Tag>이진 탐색 O(log n)</Tag>
          <Tag>Height Locking</Tag>
          <Tag>ResizeObserver</Tag>
          <Tag>DOM 최소화</Tag>
        </div>

        {/* 사전 높이 측정 */}
        <hr className="border-border" />

        <div id="pre-render-measurement" className="space-y-3">
          <p className="text-base font-medium">사전 높이 측정</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            이 라이브러리의 핵심 차별점입니다. 가상 스크롤이 시작되기 전에
            모든 아이템의 실제 DOM 높이를 측정합니다.
            이미지가 포함된 메시지도 렌더 전에 정확한 높이를 알 수 있습니다.
            정확한 높이를 바탕으로 가상 스크롤을 구현하여, 이진 탐색의 정확도를 높이고
            렌더링 후 보정을 줄여 reflow와 스크롤 버그를 최소화합니다.
          </p>
        </div>

        <MeasurementDiagram />

        <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">InitialMeasure</strong>는 각 아이템을 숨겨진 영역에 렌더링하고
            이미지 로드를 대기합니다 (<Code>img.onload</Code> + 5초 타임아웃 fallback).
            높이는 <Code>useRef&lt;Map&gt;</Code>에 저장되므로
            측정 중에는 React 리렌더가 발생하지 않습니다.
          </p>
          <p>
            <strong className="text-foreground">Measure</strong>는 렌더링된 각 아이템을 ResizeObserver로 감시합니다.
            런타임에 높이가 변경되면(이미지 로드, 동적 컨텐츠 등)
            <Code>requestAnimationFrame</Code>으로 배치하여
            같은 프레임 내 여러 변경을 1번의 위치 재계산으로 처리합니다.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">높이 잠금 (Height Locking)</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            InitialMeasure에서 이미지 로드를 대기하여 정확한 높이(예: 148px)를 측정하지만,
            VirtualScroll에서 실제 렌더 시 브라우저가 이미지를 다시 로드하면
            초기에 이미지 없는 높이(32px)가 되었다가 로드 완료 후 148px로 바뀌는{" "}
            <strong className="text-foreground">깜빡임</strong>이 발생합니다.
          </p>
          <HeightLockingDiagram />
          <p className="text-base text-muted-foreground leading-relaxed">
            <strong className="text-foreground">knownHeight</strong>는 InitialMeasure에서 측정된 값으로,
            heightMap에 이미 저장되어 있습니다.
            Measure가 마운트될 때 이 값을 인라인 height style로 적용하면,
            이미지가 아직 로드되지 않았더라도 사전 측정된 높이가 유지됩니다.
            내부 콘텐츠가 실제로 변경된 경우에만 잠금을 해제하여 리플로우를 허용합니다.
          </p>
        </div>

      </article>

      {/* 02. Sticky Group Header */}
      <article id="sticky-group-header" className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-mono text-muted-foreground">02</p>
          <h3 className="text-3xl font-bold tracking-tight">Sticky Group Header</h3>
        </div>

        {/* Problem / Solution */}
        <div className="space-y-4">
          <div className="border-l-2 border-red-400/60 pl-4 py-2 space-y-1">
            <p className="text-xs font-semibold text-red-400 tracking-wider uppercase">Problem</p>
            <p className="text-base text-muted-foreground leading-relaxed">
              채팅 앱에서 같은 날짜의 메시지를 스크롤할 때, 현재 보고 있는 날짜가
              상단에 떠 있으면 맥락을 잃지 않아 좋습니다.
              이 &quot;떠다니는 날짜 라벨&quot;을 가상 스크롤 위에서 어떻게 구현할 수 있을지가 문제였습니다.
            </p>
          </div>
          <div className="border-l-2 border-green-400/60 pl-4 py-2 space-y-1">
            <p className="text-xs font-semibold text-green-400 tracking-wider uppercase">Solution</p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Slack의 코드를 분석하면서 해결 방법을 찾았습니다.
              스크롤 위치에 영향을 주지 않으면서 그룹 전체 높이를 가지는 요소(GroupWrapper)를 만들고,
              그 자식으로 <Code>position: sticky</Code> 라벨을 넣으면 떠다니는 날짜 블록을 구현할 수 있습니다.
              여기에 그룹 최상단에 스크롤 위치에 영향을 주는 구분선(Separator)을 추가하면,
              구분선과 sticky 라벨이 하나처럼 자연스럽게 동작하는 UI를 만들 수 있습니다.
            </p>
          </div>
        </div>

        <StickyProblemDiagram />

        <StickyHeaderDiagram />

        <div className="space-y-3">
          <p className="text-base font-medium">왜 이중 구조인가?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-5 space-y-2">
              <p className="text-base font-medium">GroupWrapper (오버레이)</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                sticky 날짜 라벨의 활동 범위를 제한합니다.
                absolute 위치로 레이아웃에 영향 없이 배치되며,
                height를 그룹 내 아이템 높이의 합으로 설정합니다.
                CSS sticky가 이 범위 안에서만 동작하므로
                그룹 끝에서 자연스럽게 push-up됩니다.
                <Code>pointer-events: none</Code>으로 클릭은 아래 아이템으로 투과됩니다.
              </p>
            </div>
            <div className="border rounded-lg p-5 space-y-2">
              <p className="text-base font-medium">Separator (구분선)</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                일반 아이템으로 취급되어 Measure로 래핑됩니다.
                heightMap에 높이가 기록되어 childPositions에 반영되므로,
                다른 아이템들의 position에 영향을 줍니다.
                그룹 높이에 separator 높이도 포함되어
                GroupWrapper의 height가 정확하게 설정됩니다.
                아이템이 추가/제거되면 높이가 자동으로 재계산됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">sticky 착지 효과</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            GroupWrapper의 height가 정확해야 착지 타이밍이 맞습니다.
            그룹 A의 끝에 도달하면 &quot;1월 15일&quot; 라벨이 밀려 내려오고,
            separator와 만나면서 &quot;1월 16일&quot; 라벨이 새로 떠오릅니다.
            separator가 없으면 날짜 라벨이 그냥 사라져서 어색합니다.
          </p>
          <StickyLandingDiagram />
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">GroupWrapper의 height 계산</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            GroupWrapper의 높이는 그룹 내 모든 아이템 높이의 <strong className="text-foreground">누적합</strong>으로 계산됩니다.
            separator도 일반 아이템으로 취급되어 heightMap에 높이가 기록되므로,
            그룹 높이에 자연스럽게 포함됩니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            각 그룹의 높이를 매번 순회하며 계산하는 대신,
            <strong className="text-foreground">누적합</strong>을 미리 계산해두어
            특정 그룹의 시작 위치나 높이를 O(1)로 바로 조회할 수 있도록 최적화했습니다.
          </p>
          <GroupHeightDiagram />
        </div>

        <div className="flex flex-wrap gap-2">
          <Tag>Slack 코드 분석</Tag>
          <Tag>GroupWrapper + Separator 이중 구조</Tag>
          <Tag>CSS sticky</Tag>
          <Tag>누적합 높이 계산</Tag>
          <Tag>Push-up 효과</Tag>
        </div>
      </article>

      {/* 카테고리: 채팅 */}
      <div id="category-chat" className="flex items-center gap-4">
        <span className="text-xl font-bold tracking-tight">채팅</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* 03. Bidirectional Scroll */}
      <article id="bidirectional-scroll" className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-mono text-muted-foreground">03</p>
          <h3 className="text-3xl font-bold tracking-tight">양방향 무한 스크롤</h3>
          <p className="text-base text-muted-foreground leading-relaxed">
            채팅 앱처럼 상단(과거)과 하단(미래) 양방향으로 데이터를 로드할 때,
            스크롤 위치를 정확하게 보존하는 것이 핵심 과제입니다.
          </p>
        </div>

        <BidirectionalDiagram />

        <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Backward (prepend)</strong>: 위로 스크롤해서 과거 메시지를 로드하면
            위에 컨텐츠가 추가됩니다. scrollTop은 그대로인데 기존 아이템의 위치가 아래로 밀리므로
            화면이 점프합니다.
          </p>
          <p>
            <strong className="text-foreground">Forward (append)</strong>: 아래로 스크롤해서 새 메시지를 로드하면
            stick-to-bottom이 활성화되어 있을 때 새 아이템 추가 시 자동으로 맨 아래로 끌려갑니다.
            유저가 보고 있던 위치를 잃게 됩니다.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">해결: 방향별 가드 ref + totalHeight effect</p>
          <GuardRefFlowDiagram />
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">가드 ref의 생명주기</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-5 space-y-2">
              <p className="text-base font-medium">Backward (prevScrollHeightRef)</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>설정:</strong> 상단 도달 시 현재 scrollHeight 저장.{" "}
                <strong>유지:</strong> isMeasuring 중에는 아직 정확한 높이를 모르므로 유지.{" "}
                <strong>해제:</strong> !isMeasuring이고 diff 보정 완료 시.{" "}
                prepend된 만큼 scrollTop을 보정하여 유저 시점에서 화면 변화가 없습니다.
              </p>
            </div>
            <div className="border rounded-lg p-5 space-y-2">
              <p className="text-base font-medium">Forward (forwardLoadingRef)</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>설정:</strong> 하단 도달 시 true.{" "}
                <strong>유지:</strong> isMeasuring 중에는 높이가 확정되지 않으므로 유지.{" "}
                <strong>해제:</strong> !isMeasuring 시 false로 변경.{" "}
                stick-to-bottom을 차단하여 유저가 직접 스크롤해서 내려가야 합니다.
              </p>
            </div>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            두 가드 ref 모두 <strong className="text-foreground">도달 감지에서 설정</strong>하고{" "}
            <strong className="text-foreground">totalHeight effect에서 해제</strong>하는
            동일한 패턴을 따릅니다. 이렇게 하면 비동기 데이터 로드 → 측정 → 위치 보정까지의
            전체 사이클이 하나의 가드로 보호됩니다.
            <Code>.finally()</Code>에서 해제하면 React 리렌더 전에 가드가 풀려 중복 호출이 발생할 수 있으므로,
            반드시 측정 완료 후 useLayoutEffect에서 해제해야 합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tag>scrollTop 보정</Tag>
          <Tag>stick-to-bottom 차단</Tag>
          <Tag>가드 Ref 패턴</Tag>
          <Tag>onStartReached / onEndReached</Tag>
          <Tag>useLayoutEffect 해제</Tag>
        </div>
      </article>

      {/* 04. Chat App Patterns */}
      <article id="chat-app-patterns" className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-mono text-muted-foreground">04</p>
          <h3 className="text-3xl font-bold tracking-tight">Chat App Patterns</h3>
          <p className="text-base text-muted-foreground leading-relaxed">
            가상 스크롤 라이브러리는 &quot;받은 데이터를 가상화&quot;하는 엔진입니다.
            채팅 앱 특유의 데이터 로딩/네비게이션 패턴은 소비자가 라이브러리 API를 조합하여 구현합니다.
          </p>
        </div>

        <ChatPatternsDiagram />

        <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
          <p>
            채팅은 전체 메시지의 <strong className="text-foreground">일부분만</strong> 로드합니다.
            라이브러리는 받은 items가 전부인 줄 알고 가상화하며,
            &quot;뒤에 더 있는지&quot;는 소비자가 관리합니다.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">패턴 1: 마지막 읽은 메시지에서 열기</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            서버에서 lastRead 기준 위 20개 + 아래 10개를 fetch하고,{" "}
            <Code>initialScrollPosition</Code>으로 lastRead 위치에서 채팅을 엽니다.
            위로 스크롤하면 <Code>onStartReached</Code>로 과거 메시지를,
            아래로 스크롤하면 <Code>onEndReached</Code>로 최신 메시지를 로드합니다.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">패턴 2: 메시지 전송 시 분기</p>
          <SendMessageDiagram />
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">패턴 3: 메시지 이동 (로드된 vs 로드 안된)</p>
          <MessageNavigationDiagram />
          <p className="text-base text-muted-foreground leading-relaxed">
            핵심 차이: 로드 안된 메시지는 items 교체 → 높이 재측정이 필요합니다.
            ref의 imperative API(<Code>scrollToItem</Code>,{" "}
            <Code>scrollToBottom</Code>)는 내부에{" "}
            <strong className="text-foreground">큐잉 로직</strong>이 있어서,
            측정 중에 호출해도 측정 완료 후 자동 실행됩니다.
            소비자가 타이밍을 신경 쓸 필요가 없습니다.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">큐잉 로직이란?</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            로드되지 않은 메시지로 이동하려면, 새로운 데이터를 fetch한 뒤 사전 렌더링으로 높이를 측정해야 합니다.
            그런데 측정이 끝나기 전에 <Code>scrollToItem</Code>을 호출하면,
            아직 높이를 모르는 상태에서 스크롤이 실행되어 엉뚱한 위치로 이동합니다.
            큐잉 로직은 이 문제를 해결하기 위해, 측정 중에 호출된 스크롤 요청을 저장해두었다가
            측정이 완료된 후 자동으로 실행합니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            단일 슬롯 방식으로 마지막에 요청된 스크롤 동작만 유지하므로,
            측정 중에 여러 번 호출되더라도 가장 마지막 요청만 실행되어 불필요한 스크롤이 발생하지 않습니다.
          </p>
          <div className="border rounded-lg bg-muted/30 p-4 text-sm font-mono leading-relaxed space-y-1 overflow-x-auto">
            <p className="text-muted-foreground">{"// 스크롤 액션을 저장할 단일 슬롯"}</p>
            <p><span className="text-blue-500">const</span> pendingScrollRef = useRef&lt;(() =&gt; void) | null&gt;(null);</p>
            <p></p>
            <p className="text-muted-foreground">{"// scrollToItem 호출 시"}</p>
            <p><span className="text-blue-500">const</span> action = () =&gt; innerRef.current?.scrollToItem(index, align);</p>
            <p>isMeasuring ? (pendingScrollRef.current = action) : action();</p>
            <p></p>
            <p className="text-muted-foreground">{"// 측정 완료 시 자동 실행"}</p>
            <p><span className="text-blue-500">if</span> (!isMeasuring &amp;&amp; pendingScrollRef.current) {"{"}</p>
            <p>{"  "}pendingScrollRef.current();</p>
            <p>{"  "}pendingScrollRef.current = null;</p>
            <p>{"}"}</p>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            측정 중이면 액션을 <strong className="text-foreground">저장</strong>하고,
            측정이 아니면 <strong className="text-foreground">즉시 실행</strong>합니다.
            측정이 완료되면 저장된 액션이 자동으로 실행되어,
            소비자는 측정 타이밍을 전혀 신경 쓸 필요가 없습니다.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-base font-medium">라이브러리 vs 소비자 책임</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-5 space-y-2">
              <p className="text-base font-medium">라이브러리가 제공하는 것</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><Code>scrollToItem(index, align)</Code> — 큐잉 지원</li>
                <li><Code>scrollToBottom(behavior)</Code> — 큐잉 지원</li>
                <li><Code>onStartReached / onEndReached</Code></li>
                <li><Code>initialScrollPosition</Code></li>
                <li><Code>onAtBottomChange</Code></li>
              </ul>
            </div>
            <div className="border rounded-lg p-5 space-y-2">
              <p className="text-base font-medium">소비자가 구현하는 것</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>isLastMessageLoaded 상태 관리</li>
                <li>isFirstMessageLoaded 상태 관리</li>
                <li>데이터 fetch 로직</li>
                <li>메시지 전송 시 분기 처리</li>
                <li>검색 시 범위 판단 + fetch</li>
                <li>로드 범위 (start/end) 추적</li>
              </ul>
            </div>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            라이브러리에 채팅 도메인 로직을 넣으면 범용성이 떨어집니다.
            라이브러리는 <strong className="text-foreground">가상화 엔진 + 스크롤 제어 API</strong>만 제공하고,
            소비자가 이를 조합하여 채팅 UX를 구현하는 것이 헤드리스 설계 원칙에 맞습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tag>부분 로딩 윈도우</Tag>
          <Tag>isLastMessageLoaded 분기</Tag>
          <Tag>scrollToItem 큐잉</Tag>
          <Tag>헤드리스 설계</Tag>
          <Tag>initialScrollPosition</Tag>
        </div>
      </article>
    </section>
  );
}
