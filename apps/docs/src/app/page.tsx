import { ChatPlayground } from "@/components/playground/ChatPlayground";
import { HowItWorks } from "@/components/sections/HowItWorks";

const FEATURE_TAGS = [
  { label: "사전 렌더링 기반 가상 스크롤", href: "#virtual-scroll" },
  { label: "Sticky Group Header", href: "#sticky-group-header" },
  { label: "양방향 무한 스크롤", href: "#bidirectional-scroll" },
  { label: "Chat App Patterns", href: "#chat-app-patterns" },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Dynamic Scroll
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            메신저 서비스를 개발하면서, 각 요소의 높이를 알 수 없는
            상황에서도 사용할 수 있는 가상 스크롤 라이브러리입니다.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            기존 가상 스크롤 라이브러리는 요소의 높이를 추정한 뒤
            렌더링 후 보정하는 방식으로, 스크롤 점프와 레이아웃 시프트가
            불가피했습니다.{" "}
            <strong className="text-foreground">사전 렌더링</strong>을 통해
            요소의 높이를 먼저 측정하여 이 문제를 해결하고, 이를 바탕으로
            무한 스크롤과 채팅 기능을 구현했습니다.
          </p>
        </div>

        {/* Playground */}
        <ChatPlayground />

        {/* Feature tags */}
        <div className="flex flex-wrap gap-2">
          {FEATURE_TAGS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />
    </div>
  );
}
