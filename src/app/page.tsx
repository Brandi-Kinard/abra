"use client";

import { useState, useEffect } from "react";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";
import DownloadButton from "@/components/DownloadButton";
import ShareButton from "@/components/ShareButton";
import { parseCode } from "@/lib/parseCode";
import { Message } from "@/types";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(function () {
    setMounted(true);
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return function () { window.removeEventListener("resize", checkMobile); };
  }, []);

  function handleMessagesUpdate(msgs: Message[]) {
    setMessages(msgs);
    const lastAssistant = [...msgs].reverse().find(function (m) { return m.role === "assistant"; });
    if (lastAssistant) {
      const code = parseCode(lastAssistant.content);
      if (code) setCurrentCode(code);
    }
  }

  function handleClearPreview() {
    setCurrentCode(null);
    setShowPreview(false);
  }

  function handleOpenPreview() {
    setShowPreview(true);
  }

  var mobile = mounted && isMobile;

  return (
    <main className="flex h-[100dvh] flex-col" style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b px-4 py-2.5 md:px-5 md:py-3"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg"
               style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
            <span style={{ color: "white", fontSize: "14px", lineHeight: 1 }}>✦</span>
          </div>
          <h1 className="text-base md:text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
            Abra
          </h1>
          <span className="rounded-full px-2 py-0.5 text-[10px] md:text-[11px] font-medium uppercase tracking-widest"
                style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
            Alpha
          </span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {!mobile && <DownloadButton code={currentCode} />}
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {!mobile ? (
          /* Desktop: side-by-side */
          <>
            <div className="flex w-full max-w-lg flex-col border-r xl:max-w-xl"
                 style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <ChatPanel
                messages={messages}
                onMessagesUpdate={handleMessagesUpdate}
                isGenerating={isGenerating}
                onGeneratingChange={setIsGenerating}
                onClearPreview={handleClearPreview}
                currentCode={currentCode}
                onOpenPreview={handleOpenPreview}
                isMobile={false}
              />
            </div>
            <div className="relative flex-1">
              <PreviewPanel code={currentCode} isGenerating={isGenerating} isMobile={false} />
              {/* Share button overlaid on desktop preview */}
              {currentCode && !isGenerating && (
                <div className="absolute top-3 right-3 z-10">
                  <ShareButton code={currentCode} />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Mobile: chat full width, preview as bottom sheet */
          <div className="flex w-full flex-col" style={{ backgroundColor: "var(--color-surface)" }}>
            <ChatPanel
              messages={messages}
              onMessagesUpdate={handleMessagesUpdate}
              isGenerating={isGenerating}
              onGeneratingChange={setIsGenerating}
              onClearPreview={handleClearPreview}
              currentCode={currentCode}
              onOpenPreview={handleOpenPreview}
              isMobile={true}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet overlay for preview */}
      {mobile && showPreview && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          {/* Sheet header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
               style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
                <span style={{ color: "white", fontSize: "9px" }}>✦</span>
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                Preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton code={currentCode} />
              <button
                onClick={function () { setShowPreview(false); }}
                className="flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-200 active:scale-90"
                style={{ borderColor: "var(--color-border-active)", color: "var(--color-text-secondary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          {/* Scene */}
          <div className="flex-1 relative">
            <PreviewPanel code={currentCode} isGenerating={isGenerating} isMobile={true} />
          </div>
          {/* Hint at bottom */}
          <div className="px-4 py-2.5 text-center border-t"
               style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Swipe to look around · Move your phone to explore
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
