import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  return (
    <main className="flex h-screen">
      <div className="w-full max-w-2xl border-r border-zinc-200">
        <ChatPanel />
      </div>
      <div className="flex flex-1 items-center justify-center bg-zinc-50 text-zinc-400">
        <p>Preview will appear here</p>
      </div>
    </main>
  );
}