import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DynamicScroll — 사전 렌더링 기반 채팅앱 최적화 가상 스크롤",
  description:
    "메신저 서비스에서 각 요소의 높이를 알 수 없는 상황에서도 reflow 없이 정확한 레이아웃을 보장하는 가상 스크롤 라이브러리. 사전 렌더링, 이진 탐색, Sticky Group Header, 양방향 무한 스크롤을 지원합니다.",
  keywords: [
    "virtual scroll",
    "가상 스크롤",
    "채팅",
    "사전 렌더링",
    "dynamic height",
    "React",
    "무한 스크롤",
    "sticky header",
  ],
  openGraph: {
    title: "DynamicScroll — 사전 렌더링 기반 채팅앱 최적화 가상 스크롤",
    description:
      "사전 렌더링으로 높이를 먼저 측정하여 스크롤 점프와 레이아웃 시프트를 해결한 가상 스크롤 라이브러리",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {/* Top Navigation */}
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">
                dynamic scroll
              </span>
              <nav className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#how-it-works" className="hover:text-foreground transition-colors">
                  Docs
                </a>
                <a
                  href="https://github.com/heogeon0/dynamic-scroll"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Github
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1">
            <div className="max-w-6xl mx-auto px-6 py-16">{children}</div>
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
