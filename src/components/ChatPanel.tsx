"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";

interface ChatPanelProps {
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  isGenerating: boolean;
  onGeneratingChange: (generating: boolean) => void;
}

const SUGGESTIONS = [
  "A floating island with glowing crystals and a waterfall",
  "A solar system I can walk through",
  "An underwater coral reef with swimming fish",
  "A neon cyberpunk cityscape at night",
];

export default function ChatPanel({
  messages,
  onMessagesUpdate,
  isGenerating,
  onGeneratingChange,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);
    setInput("");
    onGeneratingChange(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";
      const withAssistant = [...updatedMessages, { role: "assistant" as const, content: "" }];
      onMessagesUpdate(withAssistant);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value, { stream: true });
        const updated = [...withAssistant];
        updated[updated.length - 1] = {
          role: "assistant",
          content: assistantContent,
        };
        onMessagesUpdate(updated);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      onMessagesUpdate([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      onGeneratingChange(false);
    }
  }

  // Render assistant message: hide raw code blocks, show description
  function renderAssistantContent(content: string) {
    // Strip the HTML code block for display
    const withoutCode = content.replace(/```html\s*\n[\s\S]*?```/g, "").trim();
    if (!withoutCode) {
      return (
        <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
          Generating scene...
        </span>
      );
    }
    return withoutCode;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
            <div className="text-center">
              <div className="mb-2 text-3xl">✦</div>
              <h2 className="text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                What will you create?
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Describe any AR, VR, or spatial experience.
              </p>
            </div>
            <div className="grid w-full max-w-sm gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-surface-raised)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.color = "var(--color-text-primary)";
                    e.currentTarget.style.backgroundColor = "var(--color-surface-overlay)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                    e.currentTarget.style.backgroundColor = "var(--color-surface-raised)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex animate-fade-in-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs"
                       style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
                  }`}
                  style={
                    msg.role === "user"
                      ? { backgroundColor: "var(--color-user-bubble)", color: "#fff" }
                      : { backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)" }
                  }
                >
                  <span className="whitespace-pre-wrap">
                    {msg.role === "assistant" ? renderAssistantContent(msg.content) : msg.content}
                  </span>
                </div>
              </div>
            ))}
            {isGenerating && messages[messages.length - 1]?.role === "assistant" && (
              <div className="flex items-center gap-1 pl-8" style={{ color: "var(--color-text-muted)" }}>
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4" style={{ borderColor: "var(--color-border)" }}>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe an XR experience..."
              disabled={isGenerating}
              className="input-glow flex-1 rounded-xl border px-4 py-3 text-sm transition-all duration-200 focus:outline-none disabled:opacity-40"
              style={{
                borderColor: "var(--color-border-active)",
                backgroundColor: "var(--color-surface-raised)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="rounded-xl px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--color-accent), #a855f7)",
              }}
            >
              {isGenerating ? (
                <span className="animate-gentle-pulse">Creating...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Send
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
