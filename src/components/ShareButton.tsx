"use client";

import { useState } from "react";

interface ShareButtonProps {
  code: string | null;
}

export default function ShareButton({ code }: ShareButtonProps) {
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

      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(function () { setCopied(false); }, 2000);
    } catch (error) {
      console.error("Share failed:", error);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={!code || isSharing}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-20 disabled:cursor-not-allowed"
      style={{
        borderColor: copied ? "var(--color-success)" : "var(--color-accent)",
        color: copied ? "var(--color-success)" : "var(--color-accent)",
        backgroundColor: copied ? "rgba(0,212,138,0.1)" : "var(--color-accent-soft)",
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied ✓
        </>
      ) : isSharing ? "Copying..." : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Copy Link
        </>
      )}
    </button>
  );
}
