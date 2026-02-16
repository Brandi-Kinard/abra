"use client";

interface DownloadButtonProps {
  code: string | null;
}

export default function DownloadButton({ code }: DownloadButtonProps) {
  function handleDownload() {
    if (!code) return;
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summon-scene.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={!code}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-20 disabled:cursor-not-allowed"
      style={{
        borderColor: "var(--color-border-active)",
        color: "var(--color-text-secondary)",
        backgroundColor: "var(--color-surface-raised)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Save HTML
    </button>
  );
}
