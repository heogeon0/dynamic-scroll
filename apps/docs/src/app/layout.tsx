import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "dynamic-scroll",
  description: "Pre-render measurement based virtual scroll library",
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
