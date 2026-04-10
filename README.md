# Abra ✦

### Say the word. A world appears.

<!-- ADD A HERO IMAGE: screenshot of Vision Pro solar system or castle desktop scene -->
<!-- Example: ![Abra Demo](assets/hero.png) -->
![Abra Demo](https://github.com/user-attachments/assets/9a3a3c14-a212-458d-a7ed-d934e0fcdf17)

Abra is a text-to-XR engine. Describe a scene in plain language — Abra generates a complete, interactive WebXR experience you can explore on any device. Phone. Headset. Laptop. AR. VR. Web. One URL, no app install.

Built in February 2026 — one month before Google announced [Vibe Coding XR](https://research.google/blog/vibe-coding-xr-accelerating-ai-xr-prototyping-with-xr-blocks-and-gemini/).

🎬 **[Watch the demo →](https://youtu.be/NPQ7hl_IktE?si=nPzsReBRe_EOwgym)**

---

## How It Works

1. **Describe** — Pick a curated scene or type your own prompt
2. **Generate** — AI creates a complete A-Frame WebXR scene with 3D models, lighting, animations, and interaction logic
3. **Explore** — Open the scene in your browser. Walk through it in VR. Drop it on your desk in AR. Share the link with anyone.

Every generated scene is a self-contained HTML file. No build step. No dependencies. Just a URL.

---

## Cross-Platform

| | Phone | Headset | Desktop |
|---|---|---|---|
| **3D Explore** | ✅ Touch + D-pad | ✅ Head tracking | ✅ Mouse + WASD |
| **VR Mode** | — | ✅ Quest, Vision Pro | ✅ (with connected headset) |
| **AR Mode** | ✅ Android Chrome | ✅ Quest 3 | — |
| **Share via URL** | ✅ | ✅ | ✅ |

Tested on Apple Vision Pro, Samsung Galaxy Z Flip 5, iPhone, and desktop Chrome.

---

## Scenes

Abra ships with curated scene prompts that showcase different environments and interactions:

- 🏕️ Forest campsite with tent, campfire, and surrounding trees at dusk
- 🪐 Solar system with planets orbiting the sun you can walk through
- 🏴‍☠️ Pirate island with a ship docked at a wooden pier and treasure chests
- 🚀 Spaceships and asteroids where you can shoot lasers
- 🏰 Medieval castle with towers, walls, and a courtyard
- 🏘️ Suburban neighborhood street at golden hour
- ❄️ Frozen wilderness with snow-covered pines and a frozen lake

Each scene is generated from a single text prompt.

---

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, App Router
- **AI:** Claude by Anthropic (model-agnostic architecture — swap in any LLM)
- **3D Rendering:** [A-Frame](https://aframe.io/) (WebXR framework built on Three.js)
- **3D Assets:** 75 CC0 models from [Kenney.nl](https://kenney.nl/) (nature, pirate, space, castle, suburban, industrial)
- **Deployment:** Vercel
- **AR/VR:** WebXR Device API — no native app, no SDK, just the browser

---

## Architecture

```
User prompt
  → Claude generates complete A-Frame HTML
    → Self-contained scene with 3D models, lighting, animations, interactions
      → Preview in-app
        → Share via URL
          → Open on any device: phone, headset, desktop
            → AR mode (Android) | VR mode (Quest, Vision Pro) | Web (everywhere)
```

The system prompt (`SYSTEM_PROMPT.md`) is the engine. It encodes spatial design principles, A-Frame component patterns, cross-platform compatibility rules, and a curated 3D model library. This is where domain expertise becomes product differentiation. See [`SYSTEM_PROMPT.md`](SYSTEM_PROMPT.md) for the full spatial design system that powers scene generation.

---

## What Makes Abra Different

- **Cross-platform by default** — A-Frame targets every WebXR-capable browser, not a single headset ecosystem
- **Model-agnostic** — Currently powered by Claude, but the architecture works with any LLM
- **No $1,799 headset required** — Works on the phone in your pocket
- **Real 3D, not video** — Generated scenes are actual WebXR with geometry, physics, lighting, and interaction — not AI-rendered frames
- **One URL** — Every scene is a shareable link that works on any device

---

## Built By

**Brandi Kinard** — Design Engineer & AI Developer

- [LinkedIn](https://www.linkedin.com/in/brandi-kinard)
- [GitHub](https://github.com/Brandi-Kinard)

Solo-built. From architecture to prompt engineering to cross-device QA.

---

## Other Projects

- **[Clutch](https://devpost.com/software/clutch-b0uyqz)** — AI agent on Ray-Ban Meta smart glasses for real-time step-by-step task guidance (video)
- **[Living Draft](https://vimeo.com/1169899789)** — Autonomous pipeline: smart glasses capture a space → AI publishes a website, no human at keyboard (video)
- **[Zero Touch Content Engine](https://devpost.com/software/zero-touch-content-engine)** — One git push auto-generates and publishes a complete content kit
- **[Face Game Controller](https://github.com/Brandi-Kinard/opencv-face-game-controller)** — OpenCV face detection as hands-free game input

---

## License

MIT
