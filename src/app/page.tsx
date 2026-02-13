"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";
import DownloadButton from "@/components/DownloadButton";
import { parseCode } from "@/lib/parseCode";
import { Message } from "@/types";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function handleMessagesUpdate(msgs: Message[]) {
    setMessages(msgs);
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      const code = parseCode(lastAssistant.content);
      if (code) setCurrentCode(code);
    }
  }

  return (
    <main className="flex h-screen flex-col" style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
               style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="text-base font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
            Summon
          </h1>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest"
                style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
            Beta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton code={currentCode} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div className="flex w-full max-w-lg flex-col border-r xl:max-w-xl"
             style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          <ChatPanel
            messages={messages}
            onMessagesUpdate={handleMessagesUpdate}
            isGenerating={isGenerating}
            onGeneratingChange={setIsGenerating}
          />
        </div>

        {/* Preview panel */}
        <div className="relative flex-1">
          <PreviewPanel code={currentCode} isGenerating={isGenerating} />
        </div>
      </div>
    </main>
  );
}
