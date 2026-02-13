# Summon — Requirements

> "Cursor for Spatial Computing" — an AI-native tool that generates deployable AR/VR/MR experiences from natural language.

---

## Vision

Users describe what they want in plain English. Summon generates working WebXR/A-Frame code, renders a live 3D preview, and gives them a shareable URL. No app store, no downloads, no Unity project files — just a link that works on Quest 3, Vision Pro, mobile AR, and desktop.

---

## Target Users (MVP)

1. **Designers & prototypers** who want to sketch spatial ideas without writing WebXR code
2. **Developers** who want a fast starting point for A-Frame/WebXR projects
3. **Creators & marketers** who want to publish AR experiences without a dev team

---

## MVP Scope

### Must Have (Launch)

- **Chat interface** — single-turn and multi-turn conversation with Claude to describe and refine an XR experience
- **A-Frame code generation** — Claude generates valid, self-contained A-Frame HTML from natural language prompts
- **Live 3D preview** — inline iframe rendering of the generated A-Frame scene, visible in the browser alongside the chat
- **Download HTML** — export the generated scene as a self-contained HTML file the user can host anywhere
- **Cross-device output** — generated scenes must work on Meta Quest 3, Apple Vision Pro (visionOS Safari), mobile AR (WebXR/AR Quick Look), and desktop browsers
- **Responsive layout** — the Summon app itself works well on desktop (primary) and tablet

### Should Have (Fast Follow)

- **Code editor panel** — view and manually edit the generated A-Frame/HTML source with syntax highlighting
- **One-click publish** — publish the experience to a unique, shareable hosted URL (Vercel or static CDN)
- **Scene history** — save and revisit previously generated experiences
- **Template library** — pre-built starting points (product viewer, portal, interactive object, spatial gallery)
- **Asset integration** — reference 3D models from URLs or drag-and-drop upload (glTF/GLB)
- **Iterative refinement** — multi-turn editing ("make the dragon bigger", "change the sky to sunset")
- **Shareable gallery** — public profile page showing a user's published experiences

### Won't Have (MVP)

- User accounts / authentication (use local storage or anonymous sessions)
- Multiplayer / shared experiences
- Native app wrappers
- Monetization or billing
- Custom domain mapping for published experiences
- Backend database (MVP is stateless or local-storage only)

---

## Functional Requirements

### FR-1: Chat Interface
- Text input with send button and Enter-to-submit
- Message history displayed as a scrollable conversation
- Streaming responses from Claude API (tokens appear in real time)
- System prompt is hidden from the user but loaded with A-Frame docs, WebXR best practices, and spatial design primitives
- Clear/reset conversation action

### FR-2: Code Generation
- Claude outputs a single, self-contained HTML file with embedded A-Frame
- Output includes `<a-scene>`, components, interactions, and inline JavaScript as needed
- Code is extracted from the Claude response and piped to the preview
- Generated code must be valid and runnable without external dependencies beyond A-Frame CDN
- **The system prompt is the product.** It is maintained as a separate versioned file (`SYSTEM_PROMPT.md`) in the repo root, loaded at runtime, and treated as a core product artifact — not an afterthought. It contains A-Frame component docs, WebXR best practices, tested interaction pattern templates, and spatial design primitives.

### FR-3: Live Preview
- Renders the generated A-Frame HTML in a sandboxed iframe
- Updates automatically when new code is generated or the user edits code manually
- Supports toggling between preview and full-screen view
- Shows a placeholder state when no scene has been generated yet

### FR-4: Download HTML (MVP Deploy)
- "Download HTML" button exports the current scene as a single `.html` file
- File is self-contained: A-Frame loaded from CDN, all code inline
- Downloaded file works when opened locally or hosted on any static server
- Copy-to-clipboard for the raw HTML source

### FR-5: Cross-Device Compatibility
- Generated scenes include WebXR session request for immersive-ar and immersive-vr
- A-Frame version pinned to latest stable with WebXR support
- Output HTML includes proper meta tags for mobile AR and VR headset browsers
- Tested interaction patterns: gaze, hand tracking, controller raycasting, touch

---

## Build Priority Order

FR-1 (Chat) → FR-2 (Code Generation) → FR-3 (Live Preview) → FR-4 (Download HTML) → FR-5 (Cross-Device)

The magic moment is "I described it and it appeared." Everything else serves that.

---

## Non-Functional Requirements

- **Performance**: Live preview renders within 2 seconds of code generation completing
- **Latency**: First token from Claude streams within 1 second of prompt submission
- **Reliability**: Graceful error handling if Claude returns invalid code (show error + raw output, don't crash)
- **Cost**: MVP runs entirely on free tiers (Vercel free, Claude API pay-as-you-go)
- **Security**: Sandboxed iframe for preview; no user-generated code executes in the main app context
- **Accessibility**: Summon's own UI meets WCAG 2.1 AA; generated XR scenes include basic a11y attributes where applicable

---

## Success Criteria (MVP Launch)

1. A user can describe an AR experience in plain English and get a working A-Frame scene in under 30 seconds
2. The generated scene loads and renders correctly on at least 3 target platforms (desktop, Quest 3, mobile)
3. The user can download the experience as a standalone HTML file and open it on any device
4. Demo video is compelling enough for LinkedIn/X/Product Hunt launch
5. End-to-end flow works without user accounts or backend infrastructure
