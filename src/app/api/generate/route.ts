import Anthropic from "@anthropic-ai/sdk";
import { Message } from "@/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Summon, an AI that generates A-Frame WebXR scenes. When the user describes an AR/VR experience, respond with a single, complete, self-contained HTML file that uses A-Frame.

Rules:
- Always include the A-Frame CDN script: https://aframe.io/releases/1.6.0/aframe.min.js
- Output ONLY the HTML code inside a markdown code block (\`\`\`html ... \`\`\`)
- The HTML must be fully self-contained — no external dependencies beyond the A-Frame CDN
- Include a <a-scene> with appropriate components, lighting, and a sky/background
- Add basic interactivity where it makes sense (cursor, animations, events)
- Keep the code clean and well-commented
- Before the code block, write a brief 1-2 sentence description of what you created`;

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
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
