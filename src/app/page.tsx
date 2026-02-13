"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";
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
    <main className="flex h-screen">
      <div className="w-full max-w-2xl border-r border-zinc-200">
        <ChatPanel
          messages={messages}
          onMessagesUpdate={handleMessagesUpdate}
          isGenerating={isGenerating}
          onGeneratingChange={setIsGenerating}
        />
      </div>
      <div className="flex-1">
        <PreviewPanel code={currentCode} />
      </div>
    </main>
  );
}