"use client";

interface PreviewPanelProps {
  code: string | null;
}

export default function PreviewPanel({ code }: PreviewPanelProps) {
  if (!code) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 text-zinc-400">
        <p>Preview will appear here</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={code}
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0"
      title="A-Frame Preview"
    />
  );
}