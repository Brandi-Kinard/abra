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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(function() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function startListening() {
    var SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    var recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = function() {
      setIsListening(true);
    };

    recognition.onresult = function(event: any) {
      var transcript = "";
      for (var i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = function(event: any) {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = function() {
      setIsListening(false);
    };

    recognition.start();
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  async function sendMessage(text: string) {
    var trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    var userMessage: Message = { role: "user", content: trimmed };
    var updatedMessages = [].concat(messages as any, [userMessage] as any) as Message[];
    onMessagesUpdate(updatedMessages);
    setInput("");
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
      var withAssistant = [].concat(updatedMessages as any, [{ role: "assistant" as const, content: "" }] as any) as Message[];
      onMessagesUpdate(withAssistant);

      while (true) {
        var result = await reader.read();
        if (result.done) break;

        assistantContent += decoder.decode(result.value, { stream: true });
        var updated = [].concat(withAssistant as any) as Message[];
        updated[updated.length - 1] = {
          role: "assistant",
          content: assistantContent,
        };
        onMessagesUpdate(updated);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      onMessagesUpdate([].concat(
        updatedMessages as any,
        [{ role: "assistant", content: "Something went wrong. Please try again." }] as any
      ) as Message[]);
    } finally {
      onGeneratingChange(false);
    }
  }

  function renderAssistantContent(content: string) {
    var withoutCode = content.replace(/```html\s*\n[\s\S]*?```/g, "").trim();
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
            <div className="text-center">
              <div className="mb-2 text-3xl">{"\u2726"}</div>
              <h2 className="text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                What will you create?
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Describe any AR, VR, or spatial experience.
              </p>
            </div>
            <div className="grid w-full max-w-sm gap-2">
              {SUGGESTIONS.map(function(s, i) {
                return (
                  <button
                    key={i}
                    onClick={function() { sendMessage(s); }}
                    className="rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                      backgroundColor: "var(--color-surface-raised)",
                    }}
                    onMouseEnter={function(e) {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-overlay)";
                    }}
                    onMouseLeave={function(e) {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {messages.map(function(msg, i) {
              return (
                <div
                  key={i}
                  className={"flex animate-fade-in-up " + (msg.role === "user" ? "justify-end" : "justify-start")}
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
                    className={"max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed " + (msg.role === "user" ? "rounded-br-md" : "rounded-bl-md")}
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
              );
            })}
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

      <div className="border-t p-4" style={{ borderColor: "var(--color-border)" }}>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={function(e) { setInput(e.target.value); }}
                placeholder={isListening ? "Listening..." : "Describe an XR experience..."}
                disabled={isGenerating}
                className="input-glow w-full rounded-xl border px-4 py-3 pr-12 text-sm transition-all duration-200 focus:outline-none disabled:opacity-40"
                style={{
                  borderColor: isListening ? "var(--color-accent)" : "var(--color-border-active)",
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-text-primary)",
                }}
              />
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isGenerating}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-all duration-200 hover:opacity-80 disabled:opacity-30"
                style={{
                  color: isListening ? "#ff4444" : "var(--color-text-muted)",
                }}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            </div>
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
