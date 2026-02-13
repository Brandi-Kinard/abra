"use client";

import { useState } from "react";

interface ShareButtonProps {
  code: string | null;
}

export default function ShareButton({ code }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (!code || isSharing) return;
    setIsSharing(true);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: code }),
      });

      if (!res.ok) throw new Error("Share failed");

      const data = await res.json();
      const fullUrl = window.location.origin + data.url;
      setShareUrl(fullUrl);

      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 3000);
    } catch (error) {
      console.error("Share failed:", error);
    } finally {
      setIsSharing(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 3000);
  }

  if (shareUrl) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-80"
          style={{
            borderColor: copied ? "var(--color-success)" : "var(--color-border-active)",
            color: copied ? "var(--color-success)" : "var(--color-text-secondary)",
            backgroundColor: "var(--color-surface-raised)",
          }}
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={!code || isSharing}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-20 disabled:cursor-not-allowed"
      style={{
        borderColor: "var(--color-accent)",
        color: "var(--color-accent)",
        backgroundColor: "var(--color-accent-soft)",
      }}
    >
      {isSharing ? "Sharing..." : "Share"}
    </button>
  );
}
