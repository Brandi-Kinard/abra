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
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      Download HTML
    </button>
  );
}