"use client";

import { useState, useEffect } from "react";

interface PreviewPanelProps {
  code: string | null;
  isGenerating?: boolean;
}

export default function PreviewPanel({ code, isGenerating }: PreviewPanelProps) {
  const [showScene, setShowScene] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);

  useEffect(function () {
    if (code && code !== displayCode) {
      setShowScene(false);
      var timeout = setTimeout(function () {
        setDisplayCode(code);
        setShowScene(true);
      }, 300);
      return function () { clearTimeout(timeout); };
    }
    // If code was cleared (null), clear display too
    if (!code && displayCode) {
      setShowScene(false);
      setDisplayCode(null);
    }
  }, [code, displayCode]);

  // Show loading state: either no code at all, or code was cleared while generating
  if (!displayCode || (isGenerating && !code)) {
    return (
      <div className="mesh-bg flex h-full flex-col items-center justify-center gap-4">
        <div className="text-center">
          {isGenerating ? (
            <>
              <div className="mb-3 animate-gentle-pulse text-4xl">✦</div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Building your experience...
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Your 3D scene will appear here
              </p>
            </>
          ) : (
            <>
              <div className="mb-3 text-5xl opacity-15 animate-slow-spin">✦</div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                Your scene will appear here
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
                Describe any scene and watch it come to life
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <iframe
        srcDoc={displayCode}
        sandbox="allow-scripts allow-same-origin"
        className="h-full w-full border-0 transition-opacity duration-300"
        style={{ opacity: showScene ? 1 : 0 }}
        title="A-Frame Preview"
      />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
           style={{
             backgroundColor: "rgba(0,0,0,0.5)",
             borderColor: "rgba(255,255,255,0.15)",
             color: "rgba(255,255,255,0.7)",
             backdropFilter: "blur(4px)",
           }}>
        Live Preview
      </div>
    </div>
  );
}
