import { ChatPlayground } from "@/components/playground/ChatPlayground";

export default function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">dynamic-scroll</h1>
        <p className="text-muted-foreground">
          사전 렌더링 측정 기반의 가상 스크롤 라이브러리. 채팅 UI로 모든 기능을 시연합니다.
        </p>
      </section>

      <ChatPlayground />
    </div>
  );
}
