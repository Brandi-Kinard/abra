"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";

interface ChatPanelProps {
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  isGenerating: boolean;
  onGeneratingChange: (generating: boolean) => void;
  onClearPreview?: () => void;
  currentCode?: string | null;
  onOpenPreview?: () => void;
  isMobile?: boolean;
}

const SUGGESTIONS = [
  "A forest campsite with a tent, campfire, and surrounding trees at dusk",
  "A solar system with planets orbiting the sun that I can walk through",
  "A pirate island with a ship docked at a wooden pier and a treasure chest on the beach",
  "Spaceships and asteroids floating in deep space with stars and distant planets where I can shoot lasers at the asteroids",
  "A medieval castle with towers, walls, and a courtyard",
  "A suburban neighborhood street with houses, trees, and fences at golden hour",
  "A frozen wilderness with snow-covered pine trees, ice formations, and a frozen lake",
];

export default function ChatPanel({
  messages,
  onMessagesUpdate,
  isGenerating,
  onGeneratingChange,
  onClearPreview,
  currentCode,
  onOpenPreview,
  isMobile,
}: ChatPanelProps) {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(function () {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentCode]);

  async function sendMessage(text: string) {
    var trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    if (onClearPreview) onClearPreview();

    var userMessage: Message = { role: "user", content: trimmed };
    var updatedMessages = ([] as Message[]).concat(messages, [userMessage]);
    onMessagesUpdate(updatedMessages);
    onGeneratingChange(true);

    try {
      var res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      if (!res.ok) throw new Error("API error: " + res.status);

      var reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      var decoder = new TextDecoder();
      var assistantContent = "";
      var withAssistant = ([] as Message[]).concat(updatedMessages, [
        { role: "assistant" as const, content: "" },
      ]);
      onMessagesUpdate(withAssistant);

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        assistantContent += decoder.decode(result.value, { stream: true });
        var updated = ([] as Message[]).concat(withAssistant);
        updated[updated.length - 1] = { role: "assistant", content: assistantContent };
        onMessagesUpdate(updated);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      onMessagesUpdate(
        ([] as Message[]).concat(updatedMessages, [
          { role: "assistant", content: "Something went wrong. Please try again." },
        ])
      );
    } finally {
      onGeneratingChange(false);
    }
  }

  async function handleWaitlist() {
    if (!waitlistEmail.trim()) return;
    try {
      var res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail.trim() }),
      });
      if (res.ok) setWaitlistSubmitted(true);
    } catch (error) {
      console.error("Waitlist error:", error);
    }
  }

  function stripMarkdown(text: string): string {
    var r = text.replace(/\*\*(.*?)\*\*/g, "$1");
    r = r.replace(/\*(.*?)\*/g, "$1");
    r = r.replace(/^#{1,6}\s+/gm, "");
    r = r.replace(/^[-*]\s+/gm, "");
    return r;
  }

  function cleanContent(content: string): string {
    var c = content;
    c = c.replace(/```html[\s\S]*?```/g, "");
    c = c.replace(/```html[\s\S]*$/g, "");
    c = c.replace(/```[\s\S]*?```/g, "");
    c = c.replace(/```[\s\S]*$/g, "");
    c = c.trim();
    c = stripMarkdown(c);
    return c;
  }

  function getParagraphs(text: string): string[] {
    return text.split(/\n\n+/).filter(function (p) { return p.trim().length > 0; });
  }

  function renderAssistantContent(content: string, msgIndex: number) {
    var cleaned = cleanContent(content);
    var isLastMsg = msgIndex === messages.length - 1;
    var isCurrentlyGenerating = isGenerating && isLastMsg;

    // Empty content during generation of THIS message
    if (!cleaned && isCurrentlyGenerating) {
      return (
        <span className="animate-gentle-pulse" style={{ color: "var(--color-text-secondary)" }}>
          ✦ Building your experience...
        </span>
      );
    }

    // Empty content, generation done
    if (!cleaned) {
      return (
        <span style={{ color: "var(--color-text-secondary)" }}>
          ✦ Scene ready.
        </span>
      );
    }

    var paras = getParagraphs(cleaned);

    // Currently generating THIS message: show first paragraph only
    if (isCurrentlyGenerating) {
      return paras[0].trim();
    }

    // ANY completed message: always show only the last paragraph
    if (paras.length > 1) {
      return paras[paras.length - 1].trim();
    }

    return cleaned;
  }

  function renderSuggestionChips(compact: boolean) {
    // compact chips use text-secondary (not text-muted) for readability
    return (
      <div className={"grid gap-3 w-full"}>
        {SUGGESTIONS.map(function (s, i) {
          return (
            <button
              key={i}
              onClick={function () { sendMessage(s); }}
              disabled={isGenerating}
              className={"rounded-xl border px-4 py-3 text-left text-sm leading-snug transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"}
              style={{
                borderColor: "var(--color-border)",
                color: compact ? "var(--color-text-secondary)" : "var(--color-text-secondary)",
                backgroundColor: compact ? "transparent" : "var(--color-surface-raised)",
              }}
              onMouseEnter={function (e) {
                if (!isGenerating) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
                  if (!compact) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-overlay)";
                }
              }}
              onMouseLeave={function (e) {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                if (!compact) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
    );
  }

  // Mobile-only preview card
  function renderPreviewCard() {
    if (!currentCode || isGenerating || !isMobile) return null;
    return (
      <div className="pl-7 md:pl-8 animate-fade-in-up">
        <button
          onClick={onOpenPreview}
          className="w-full rounded-xl border overflow-hidden transition-all duration-200 active:scale-[0.98] hover:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-raised)" }}
        >
          <div className="relative h-36 w-full overflow-hidden rounded-t-xl" style={{ backgroundColor: "#1a1a2e" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-1">✦</div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Tap to explore your scene</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-10"
                 style={{ background: "linear-gradient(transparent, var(--color-surface-raised))" }} />
          </div>
          <div className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
                <span style={{ color: "white", fontSize: "9px" }}>✦</span>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Scene ready
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              Tap to view
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-5 px-2 md:px-4 pt-6 md:pt-8">
            <div className="text-center">
              <div className="mb-2 text-2xl md:text-3xl">✦</div>
              <h2 className="text-lg md:text-xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                What will you create?
              </h2>
              <p className="mt-1 text-sm md:text-base" style={{ color: "var(--color-text-secondary)" }}>
                Pick a scene to generate an immersive 3D experience.
              </p>
            </div>
            {renderSuggestionChips(false)}
          </div>
        ) : (
          <>
            {messages.map(function (msg, i) {
              return (
                <div key={i} className={"flex animate-fade-in-up " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                         style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
                      <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>✦</span>
                    </div>
                  )}
                  <div className={"max-w-[85%] rounded-2xl px-4 py-3 text-sm md:text-base leading-relaxed " + (msg.role === "user" ? "rounded-br-md" : "rounded-bl-md")}
                       style={msg.role === "user"
                         ? { backgroundColor: "var(--color-user-bubble)", color: "#fff" }
                         : { backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)" }}>
                    <span className="whitespace-pre-wrap">
                      {msg.role === "assistant" ? renderAssistantContent(msg.content, i) : msg.content}
                    </span>
                  </div>
                </div>
              );
            })}

            {isGenerating && messages[messages.length - 1]?.role === "assistant" && (
              <div className="flex items-center gap-1 pl-8" style={{ color: "var(--color-text-muted)" }}>
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
              </div>
            )}

            {renderPreviewCard()}

            {!isGenerating && messages.length > 0 && (
              <div className="pt-3 pl-8">
                <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>Try another scene</p>
                {renderSuggestionChips(true)}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 py-3 md:px-5 md:py-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div>
          <p className="text-center text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Custom scene descriptions and more scenes coming soon
          </p>
          {waitlistSubmitted ? (
            <p className="text-center text-sm" style={{ color: "var(--color-success)" }}>
              ✓ You&apos;re on the list!
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={waitlistEmail}
                onChange={function (e) { setWaitlistEmail(e.target.value); }}
                placeholder="your@email.com"
                className="flex-1 rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  borderColor: "var(--color-border-active)",
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-text-primary)",
                }}
                onKeyDown={function (e) { if (e.key === "Enter") handleWaitlist(); }}
              />
              <button
                onClick={handleWaitlist}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 active:scale-95"
                style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}
              >
                Join waitlist
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          <span>
            Made by{" "}
            <a href="https://www.linkedin.com/in/brandi-kinard/"
               target="_blank" rel="noopener noreferrer"
               className="transition-colors duration-200 hover:underline"
               style={{ color: "var(--color-accent)" }}>
              Brandi Kinard
            </a>
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="https://www.linkedin.com/in/brandi-kinard/"
             target="_blank" rel="noopener noreferrer"
             className="transition-colors duration-200 hover:underline"
             style={{ color: "var(--color-text-secondary)" }}>
            Have a scene idea? Tell me
          </a>
        </div>
      </div>
    </div>
  );
}
