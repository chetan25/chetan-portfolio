# Immersive Portfolio — Project Ground Rules

## What We Are Building

A **personal portfolio for a Senior Software Developer** — designed to feel like an experience, not a webpage. The goal is a 3D immersive environment that showcases technical depth through the medium itself: the portfolio *is* the demo.

**Core pillars:**
- **3D Immersive** — React Three Fiber + Three.js as the primary visual layer
- **Mobile First** — every decision starts at 320px and scales up
- **Premium Feel** — no generic AI-generated aesthetics, no template vibes
- **Performance** — 60fps on desktop, smooth on mid-range mobile
- **Best Practices** — Next.js App Router, RSC by default, clean architecture

---

## Mandatory: Invoke Orchestrator First

**Before responding to ANY task** — including questions, feature requests, bug fixes, refactors, and design decisions — you MUST invoke the `orchestrator` skill.

```
Skill: orchestrator
```

The orchestrator will:
1. Classify the task domain
2. Load the correct skills
3. Ask clarifying questions
4. Confirm the plan before building

**No exceptions.** Do not write code, propose architecture, or make design decisions before the orchestrator has run.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15+ (App Router) |
| 3D Engine | React Three Fiber + Three.js + Drei |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion (UI) · R3F `useFrame` (3D) |
| Physics | `@react-three/rapier` (if needed) |
| Post-Processing | `@react-three/postprocessing` |
| State | Zustand (global) · `useState` (local UI) |
| Language | TypeScript |

---

## Design Principles

### Mobile First — Always
- Start every component at 320px, then add `md:` / `lg:` breakpoints
- Use `min-h-[100dvh]` — never `h-screen`
- 3D scenes on mobile: reduced geometry, no heavy post-processing, `dpr={[1, 1.5]}`
- Touch events must work alongside pointer events in R3F
- Test interactions with both mouse and touch

### 3D Scene Rules
- Dynamic import `<Canvas>` with `ssr: false` — Three.js is client-only
- Wrap in `<Suspense>` with a meaningful fallback
- Isolate every animated mesh in its own component
- Mobile: reduce segment counts, disable expensive effects, use `frameloop="demand"` where possible
- Always check installed versions in `package.json` before writing R3F/Three.js code
- Always fetch current docs via context7 before using any Three.js / Drei API

### Visual Identity
- **No Inter font** — use Geist, Outfit, Cabinet Grotesk, or Satoshi
- **No pure black `#000000`** — use Zinc-950 or off-black
- **No centered hero** — asymmetric or split-screen layouts
- **No 3-column equal card grid** — use Bento, zig-zag, or masonry
- **No neon glows or AI-purple** — one accent color, saturation < 80%
- **No emoji** anywhere in code, markup, or content

### Performance Budget
- LCP < 2.5s on mobile (3G throttled)
- 3D canvas: max 60fps desktop, 30fps mobile acceptable
- No barrel file imports
- Dynamic import heavy Three.js components
- Animate only `transform` and `opacity` — never layout properties

---

## Architecture Conventions

### Component Rules
```
src/
├── app/              # Next.js App Router pages and layouts
├── components/
│   ├── 3d/          # R3F components — always Client, never SSR
│   ├── ui/          # Pure UI components — Server by default
│   └── sections/    # Page sections — Server shell, Client islands
├── hooks/           # Custom hooks
├── lib/             # Utilities, constants, types
└── stores/          # Zustand stores
```

- 3D components: always `'use client'`, never in Server Components directly
- Wrap `<Canvas>` usage in `dynamic(() => import(...), { ssr: false })`
- Animated UI components: isolated Client Components, never inside Server layout
- Server Components: fetch data, render static shell, pass data as props to Client islands

### Data Flow
- Server Components fetch data → pass to Client 3D/UI components as props
- Zustand for cross-component 3D state (camera position, active section, scroll progress)
- `useFrame` + refs for per-frame 3D state — never React state for animation values

---

## Skills Reference

| Skill | When It Activates |
|---|---|
| `orchestrator` | **Every task — always first** |
| `r3f-threejs` | Any Three.js / R3F / shader / 3D work |
| `taste-skill` | Any UI design, layout, visual, animation work |
| `nextjs` | Next.js conventions, file structure, directives |
| `nextjs-app-router-patterns` | Pages, Server Actions, streaming, routes |
| `vercel-react-best-practices` | Performance, bundle, re-renders, data fetching |

---

## What "Done" Looks Like

A task is complete when:
- Works on mobile (320px) without horizontal scroll or broken layout
- 3D scenes load without crashing on mobile (test with reduced DPR)
- TypeScript has no errors
- No `h-screen`, no Inter font, no pure black, no emoji
- Async `params`/`cookies` awaited (Next.js 15+)
- Suspense boundaries present around all async data
- Animated components are isolated Client Components
