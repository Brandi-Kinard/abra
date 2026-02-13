"use client";

interface PreviewPanelProps {
  code: string | null;
  isGenerating?: boolean;
}

export default function PreviewPanel({ code, isGenerating }: PreviewPanelProps) {
  if (!code) {
    return (
      <div className="mesh-bg flex h-full flex-col items-center justify-center gap-4">
        <div className="text-center">
          {isGenerating ? (
            <>
              <div className="mb-3 animate-gentle-pulse text-4xl">⬡</div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Building your experience...
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                The 3D preview will appear here
              </p>
            </>
          ) : (
            <>
              <div className="mb-3 text-4xl opacity-20">⬡</div>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Your 3D scene will render here
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
        srcDoc={code}
        sandbox="allow-scripts allow-same-origin"
        className="h-full w-full border-0"
        title="A-Frame Preview"
      />
      {/* Subtle overlay badge */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
           style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "var(--color-text-muted)" }}>
        Live Preview
      </div>
    </div>
  );
}
