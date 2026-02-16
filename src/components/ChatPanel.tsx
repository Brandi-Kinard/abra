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
      if (res.ok) {
        setWaitlistSubmitted(true);
      }
    } catch (error) {
      console.error("Waitlist error:", error);
    }
  }

  function stripMarkdown(text: string): string {
    var result = text.replace(/\*\*(.*?)\*\*/g, "$1");
    result = result.replace(/\*(.*?)\*/g, "$1");
    result = result.replace(/^#{1,6}\s+/gm, "");
    result = result.replace(/^[-*]\s+/gm, "");
    return result;
  }

  function renderAssistantContent(content: string, isLastMsg: boolean) {
    var cleaned = content;
    cleaned = cleaned.replace(/```html[\s\S]*?```/g, "");
    cleaned = cleaned.replace(/```html[\s\S]*$/g, "");
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
    cleaned = cleaned.replace(/```[\s\S]*$/g, "");
    cleaned = cleaned.trim();
    cleaned = stripMarkdown(cleaned);

    if (!cleaned && isGenerating && isLastMsg) {
      return (
        <span className="animate-gentle-pulse" style={{ color: "var(--color-text-muted)" }}>
          ✦ Building your experience...
        </span>
      );
    }

    if (!cleaned && !isGenerating) {
      return (
        <span style={{ color: "var(--color-text-secondary)" }}>
          ✦ Scene ready — tap to view.
        </span>
      );
    }

    if (!isGenerating && isLastMsg) {
      var paragraphs = cleaned.split(/\n\n+/).filter(function (p) { return p.trim().length > 0; });
      if (paragraphs.length > 1) {
        return paragraphs[paragraphs.length - 1].trim();
      }
    }

    if (isGenerating && isLastMsg) {
      var firstParagraphs = cleaned.split(/\n\n+/).filter(function (p) { return p.trim().length > 0; });
      if (firstParagraphs.length > 0) {
        return firstParagraphs[0].trim();
      }
    }

    return cleaned;
  }

  function renderSuggestionChips(compact: boolean) {
    return (
      <div className={"grid gap-" + (compact ? "1.5" : "2") + " w-full"}>
        {SUGGESTIONS.map(function (s, i) {
          return (
            <button
              key={i}
              onClick={function () { sendMessage(s); }}
              disabled={isGenerating}
              className={"rounded-" + (compact ? "lg" : "xl") + " border px-" + (compact ? "3" : "4") + " py-" + (compact ? "2" : "3") + " text-left text-" + (compact ? "xs" : "sm") + " transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"}
              style={{
                borderColor: "var(--color-border)",
                color: compact ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                backgroundColor: compact ? "transparent" : "var(--color-surface-raised)",
              }}
              onMouseEnter={function (e) {
                if (!isGenerating) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
                  (e.currentTarget as HTMLElement).style.color = compact ? "var(--color-text-secondary)" : "var(--color-text-primary)";
                  if (!compact) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-overlay)";
                }
              }}
              onMouseLeave={function (e) {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
                (e.currentTarget as HTMLElement).style.color = compact ? "var(--color-text-muted)" : "var(--color-text-secondary)";
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

  // Inline preview card shown in chat after generation (MOBILE ONLY)
  function renderPreviewCard() {
    if (!currentCode || isGenerating || !isMobile) return null;
    return (
      <div className="pl-7 md:pl-8 animate-fade-in-up">
        <button
          onClick={onOpenPreview}
          className="w-full rounded-xl border overflow-hidden transition-all duration-200 active:scale-[0.98] hover:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-raised)" }}
        >
          <div className="relative h-36 md:h-44 w-full overflow-hidden rounded-t-xl" style={{ backgroundColor: "#1a1a2e" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-1">✦</div>
                <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Tap to explore your scene</p>
              </div>
            </div>
            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-10"
                 style={{ background: "linear-gradient(transparent, var(--color-surface-raised))" }} />
          </div>
          <div className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
                <span style={{ color: "white", fontSize: "9px" }}>✦</span>
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                Scene ready
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-5 px-2 md:px-4 pt-6 md:pt-8">
            <div className="text-center">
              <div className="mb-2 text-2xl md:text-3xl">✦</div>
              <h2 className="text-base md:text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                What will you create?
              </h2>
              <p className="mt-1 text-xs md:text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Pick a scene to generate an immersive 3D experience.
              </p>
            </div>
            {renderSuggestionChips(false)}
          </div>
        ) : (
          <>
            {messages.map(function (msg, i) {
              var isLast = i === messages.length - 1;
              return (
                <div key={i} className={"flex animate-fade-in-up " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="mr-2 mt-1 flex h-5 w-5 md:h-6 md:w-6 flex-shrink-0 items-center justify-center rounded-md"
                         style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
                      <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✦</span>
                    </div>
                  )}
                  <div className={"max-w-[85%] rounded-2xl px-3 py-2.5 md:px-4 md:py-3 text-xs md:text-sm leading-relaxed " + (msg.role === "user" ? "rounded-br-md" : "rounded-bl-md")}
                       style={msg.role === "user"
                         ? { backgroundColor: "var(--color-user-bubble)", color: "#fff" }
                         : { backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)" }}>
                    <span className="whitespace-pre-wrap">
                      {msg.role === "assistant" ? renderAssistantContent(msg.content, isLast) : msg.content}
                    </span>
                  </div>
                </div>
              );
            })}

            {isGenerating && messages[messages.length - 1]?.role === "assistant" && (
              <div className="flex items-center gap-1 pl-7 md:pl-8" style={{ color: "var(--color-text-muted)" }}>
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
              </div>
            )}

            {/* Inline preview card */}
            {renderPreviewCard()}

            {!isGenerating && messages.length > 0 && (
              <div className="pt-3 pl-7 md:pl-8">
                <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Try another scene</p>
                {renderSuggestionChips(true)}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Persistent footer */}
      <div className="shrink-0 border-t px-3 py-2.5 md:px-4 md:py-3 space-y-2.5 md:space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div>
          <p className="text-center text-[10px] md:text-xs mb-1.5 md:mb-2" style={{ color: "var(--color-text-muted)" }}>
            Custom scene descriptions and more scenes coming soon
          </p>
          {waitlistSubmitted ? (
            <p className="text-center text-[10px] md:text-xs" style={{ color: "var(--color-success)" }}>
              ✓ You&apos;re on the list!
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={waitlistEmail}
                onChange={function (e) { setWaitlistEmail(e.target.value); }}
                placeholder="your@email.com"
                className="flex-1 rounded-lg border px-3 py-2 text-xs focus:outline-none"
                style={{
                  borderColor: "var(--color-border-active)",
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-text-primary)",
                }}
                onKeyDown={function (e) { if (e.key === "Enter") handleWaitlist(); }}
              />
              <button
                onClick={handleWaitlist}
                className="rounded-lg px-3 md:px-4 py-2 text-xs font-medium text-white transition-all duration-200 active:scale-95"
                style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}
              >
                Join waitlist
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] md:text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          <span>
            Made by{" "}
            <a href="https://www.linkedin.com/in/brandi-kinard/"
               target="_blank" rel="noopener noreferrer"
               className="transition-colors duration-200 hover:underline"
               style={{ color: "var(--color-accent)" }}>
              Brandi Kinard
            </a>
          </span>
          <span style={{ opacity: 0.3 }}>·</span>
          <a href="https://www.linkedin.com/in/brandi-kinard/"
             target="_blank" rel="noopener noreferrer"
             className="transition-colors duration-200 hover:underline"
             style={{ color: "var(--color-text-muted)" }}>
            Have a scene idea? Tell me
          </a>
        </div>
      </div>
    </div>
  );
}
