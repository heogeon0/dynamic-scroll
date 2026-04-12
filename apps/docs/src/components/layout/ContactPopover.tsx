"use client";

import { useState, useRef, useEffect, useCallback } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      title="복사"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  );
}

export function ContactPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="hover:text-foreground transition-colors cursor-pointer"
      >
        Contact
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border bg-background p-4 shadow-md space-y-2 whitespace-nowrap">
          <p className="text-sm font-semibold">허건녕</p>
          <p className="text-xs text-muted-foreground">Frontend Developer</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground w-10">Github</span>
              <a
                href="https://github.com/heogeon0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                heogeon0
              </a>
              <CopyButton text="https://github.com/heogeon0" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground w-10">Email</span>
              <a
                href="mailto:heo3793@naver.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                heo3793@naver.com
              </a>
              <CopyButton text="heo3793@naver.com" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
