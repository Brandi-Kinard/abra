"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";

interface ChatPanelProps {
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  isGenerating: boolean;
  onGeneratingChange: (generating: boolean) => void;
  onClearPreview?: () => void;
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
}: ChatPanelProps) {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(function () {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  function handleWaitlist() {
    if (!waitlistEmail.trim()) return;
    console.log("Waitlist signup:", waitlistEmail);
    setWaitlistSubmitted(true);
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
    // Strip COMPLETE code blocks
    cleaned = cleaned.replace(/```html[\s\S]*?```/g, "");
    // Strip INCOMPLETE code blocks (during streaming)
    cleaned = cleaned.replace(/```html[\s\S]*$/g, "");
    // Strip any other code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
    cleaned = cleaned.replace(/```[\s\S]*$/g, "");
    cleaned = cleaned.trim();
    // Strip markdown formatting
    cleaned = stripMarkdown(cleaned);

    // During generation with no visible text yet — show building message
    if (!cleaned && isGenerating && isLastMsg) {
      return (
        <span className="animate-gentle-pulse" style={{ color: "var(--color-text-muted)" }}>
          ✦ Building your experience...
        </span>
      );
    }

    // Generation done but no text came through (only code) — show ready
    if (!cleaned && !isGenerating) {
      return (
        <span style={{ color: "var(--color-text-secondary)" }}>
          ✦ Scene ready — check the preview.
        </span>
      );
    }

    // Still generating but we have some text — show it (it's the "Setting up..." opener)
    // Generation done and we have text — show it (it's the full description)
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
              className={"rounded-" + (compact ? "lg" : "xl") + " border px-" + (compact ? "3" : "4") + " py-" + (compact ? "2" : "3") + " text-left text-" + (compact ? "xs" : "sm") + " transition-all duration-200 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"}
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

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-6 px-4 pt-8">
            <div className="text-center">
              <div className="mb-2 text-3xl">✦</div>
              <h2 className="text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                What will you create?
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
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
                    <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                         style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}>
                      <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>✦</span>
                    </div>
                  )}
                  <div className={"max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed " + (msg.role === "user" ? "rounded-br-md" : "rounded-bl-md")}
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
              <div className="flex items-center gap-1 pl-8" style={{ color: "var(--color-text-muted)" }}>
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
              </div>
            )}

            {!isGenerating && messages.length > 0 && (
              <div className="pt-3 pl-8">
                <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Try another scene</p>
                {renderSuggestionChips(true)}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Persistent footer — always visible */}
      <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: "var(--color-border)" }}>
        {/* Waitlist */}
        <div>
          <p className="text-center text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
            Custom scene descriptions and more scenes coming soon
          </p>
          {waitlistSubmitted ? (
            <p className="text-center text-xs" style={{ color: "var(--color-success)" }}>
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
                className="rounded-lg px-4 py-2 text-xs font-medium text-white transition-all duration-200 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, var(--color-accent), #a855f7)" }}
              >
                Join waitlist
              </button>
            </div>
          )}
        </div>

        {/* Attribution + LinkedIn */}
        <div className="flex items-center justify-center gap-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
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
