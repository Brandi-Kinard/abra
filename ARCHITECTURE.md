# Summon — Architecture

> Technical architecture for the MVP. Optimized for shipping fast with one builder, zero backend infrastructure, and maximum demo impact.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Chat   │  │  Live Preview │  │   Download    │  │
│  │  Panel   │──│  (iframe)     │  │   Button      │  │
│  └────┬─────┘  └──────▲───────┘  └───────▲───────┘  │
│       │               │                  │           │
│       │         ┌─────┴──────┐           │           │
│       │         │  Code State │───────────┘           │
│       │         │  (React)    │                       │
│       │         └─────▲──────┘                       │
└───────┼───────────────┼──────────────────────────────┘
        │               │
        ▼               │
┌───────────────┐       │
│  Next.js API  │       │
│  Route        │───────┘
│  /api/generate│
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Claude API   │
│  (streaming)  │
└───────────────┘
```

**Data flow:**
1. User types a prompt in the Chat Panel
2. Client sends the prompt to `/api/generate` (Next.js Route Handler)
3. Route Handler streams the Claude API response back to the client
4. Client parses the streamed response, extracts the A-Frame HTML code block
5. Code state updates → iframe re-renders the live preview
6. User can download the generated HTML as a standalone file

---

## Project Structure

```
summon/
├── ARCHITECTURE.md          # This file
├── REQUIREMENTS.md          # Product requirements
├── SYSTEM_PROMPT.md         # The core product artifact — Claude's system prompt
├── next.config.ts           # Next.js configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── layout.tsx       # Root layout (fonts, metadata, global providers)
    │   ├── globals.css      # Tailwind imports + custom tokens
    │   ├── page.tsx         # Main app page — assembles the three panels
    │   └── api/
    │       └── generate/
    │           └── route.ts # POST endpoint — proxies to Claude API with streaming
    ├── components/
    │   ├── ChatPanel.tsx       # Chat UI: input, message list, send handler
    │   ├── PreviewPanel.tsx    # Sandboxed iframe for A-Frame rendering
    │   ├── DownloadButton.tsx  # Export current scene as .html file
    │   └── MessageBubble.tsx   # Individual chat message (user or assistant)
    ├── lib/
    │   ├── claude.ts           # Claude API client config + streaming helpers
    │   ├── parseCode.ts        # Extract A-Frame HTML from Claude's markdown response
    │   └── systemPrompt.ts     # Loads and exports SYSTEM_PROMPT.md at runtime
    └── types/
        └── index.ts            # Shared TypeScript types (Message, Scene, etc.)
```

---

## Key Technical Decisions

### 1. Next.js App Router + Route Handlers (not Server Actions)

The Claude API requires a secret key. We use a Next.js Route Handler (`/api/generate/route.ts`) as a thin proxy so the API key stays server-side. The route streams the response using the Web Streams API — no WebSocket server needed.

**Why not Server Actions?** Server Actions are optimized for mutations and form submissions. Streaming a long-running LLM response is a better fit for a Route Handler that returns a `ReadableStream`.

### 2. Client-Side State (React useState/useReducer)

MVP has no database. All state lives in React:
- `messages[]` — chat history
- `currentCode` — the latest generated A-Frame HTML string
- `isGenerating` — loading state

This keeps the architecture dead simple. Scene history (fast-follow) will use `localStorage`.

### 3. Sandboxed iframe for Preview

The generated A-Frame HTML runs in an iframe with the `sandbox` attribute. This prevents generated code from accessing the parent app's DOM, cookies, or JavaScript context. The iframe source is set via `srcdoc` (inline HTML string), so no server round-trip is needed to render the preview.

**Sandbox permissions needed:** `allow-scripts allow-same-origin` (A-Frame requires both to initialize WebGL and register components).

### 4. SYSTEM_PROMPT.md as a First-Class Artifact

The system prompt lives at the repo root as `SYSTEM_PROMPT.md`. It is:
- Version-controlled alongside the code
- Loaded at runtime by `src/lib/systemPrompt.ts` (reads the file server-side in the Route Handler)
- The single most important file in the repo — this is where domain expertise becomes product differentiation

The prompt will contain: A-Frame component reference, WebXR boilerplate patterns, interaction templates (hand tracking, raycasting, gaze), spatial design heuristics, and output format instructions.

### 5. Streaming with the Anthropic SDK

We use the official `@anthropic-ai/sdk` package. The Route Handler creates a streaming message request and pipes the response chunks back to the client as a `ReadableStream`. The client reads the stream with a `fetch` call and processes chunks as they arrive, enabling real-time token display in the chat.

### 6. A-Frame via CDN (not bundled)

Generated HTML files reference A-Frame from a CDN (`https://aframe.io/releases/1.6.0/aframe.min.js`). This means:
- Generated scenes are fully self-contained — no build step needed
- Downloaded HTML files work offline (after first load caches the CDN asset)
- We don't bloat Summon's own bundle with A-Frame
- The preview iframe also loads A-Frame from CDN

---

## API Route: `/api/generate`

```
POST /api/generate
Content-Type: application/json

Request body:
{
  "messages": [
    { "role": "user", "content": "Create an AR scene with a floating blue cube" }
  ]
}

Response:
- Content-Type: text/event-stream
- Streamed Claude response chunks
- Client parses markdown, extracts ```html code blocks
```

The route handler:
1. Reads `SYSTEM_PROMPT.md` (cached after first read)
2. Prepends it as the system message
3. Forwards the user's message array to Claude
4. Streams the response back

---

## Component Responsibilities

| Component | Role | State it owns |
|---|---|---|
| `page.tsx` | Layout shell — positions chat and preview side by side | `messages[]`, `currentCode`, `isGenerating` |
| `ChatPanel` | Renders messages, handles input, calls `/api/generate` | Input text, scroll position |
| `PreviewPanel` | Renders iframe with `srcdoc={currentCode}` | None (receives `currentCode` as prop) |
| `DownloadButton` | Triggers download of `currentCode` as `.html` file | None (receives `currentCode` as prop) |
| `MessageBubble` | Renders a single message with appropriate styling | None (presentational) |

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Required. Claude API key. Server-side only.
```

Stored in `.env.local` (gitignored). On Vercel, set via the dashboard.

---

## Deployment

MVP deploys to **Vercel free tier** via `git push`:
- Next.js is auto-detected
- Route Handlers run as serverless functions
- Environment variables set in Vercel dashboard
- No database, no Redis, no external services beyond Claude API

---

## Future Architecture (Post-MVP)

These are noted for awareness but explicitly out of scope for MVP:

- **Persistence layer** — Supabase or Vercel KV for scene history and user sessions
- **One-click publish** — Vercel Blob or Cloudflare R2 to host generated HTML at unique URLs
- **Code editor** — Monaco or CodeMirror integrated as a third panel
- **Auth** — Clerk or NextAuth for user accounts
- **Rate limiting** — middleware to prevent API abuse
- **Analytics** — PostHog or Vercel Analytics for usage tracking
