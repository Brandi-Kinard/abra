import Anthropic from "@anthropic-ai/sdk";
import { Message } from "@/types";
import { readFileSync } from "fs";
import { join } from "path";

const client = new Anthropic();

const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), "SYSTEM_PROMPT.md"),
  "utf-8"
);

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(text));
      });
      stream.on("end", () => {
        controller.close();
      });
      stream.on("error", (error) => {
        controller.error(error);
      });
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}