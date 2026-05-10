# Immersive Portfolio

A personal portfolio for a Senior Software Engineer, built as an interactive 3D experience rather than a static page. The portfolio _is_ the demo — every route is a different surface area for showing the work.

---

## Stack

| Layer           | Choice                                         |
| --------------- | ---------------------------------------------- |
| Framework       | Next.js 15 (App Router, RSC by default)        |
| Language        | TypeScript 5                                   |
| Runtime         | React 19                                       |
| 3D engine       | React Three Fiber 9 + Three.js 0.177 + drei 10 |
| Post-processing | `@react-three/postprocessing` 3                |
| Styling         | Tailwind CSS v4                                |
| Animation (DOM) | Framer Motion 12                               |
| State           | Zustand 5                                      |
| Fonts           | Geist Sans + Geist Mono (`next/font/google`)   |
| Package manager | pnpm                                           |

---

## Routes

| Path        | Render mode                         | What it is                                                                                                                                                                          |
| ----------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`         | Server shell + client island        | Kinetic-name hero. The name "Chetan Dasauni" is rendered as a Three.js point-cloud echo, scrambled in then resolved. DOM headline is layout-only — the 3D cloud carries the visual. |
| `/journey`  | Client                              | An immersive 3D corridor walk through the chapters of a career. Character animation, milestone signs alternating left/right, typewriter description cards, end-of-journey CTA.      |
| `/projects` | Server (data fetch) + client island | Live GitHub archive. Server Component fetches public repos, Client Component renders a searchable, filterable list. Shows month + year.                                             |
| `/resume`   | Server (`revalidate=0`)             | Editorial render of `src/data/resume.json` — header, summary, experience, education, skills. Each entry has a stable anchor ID (e.g. `#experience-scribd`) used as a citation deep-link target by the chatbot. `.docx` download still available. Header meta-row also shows a live "X reads" chip (Upstash Redis counter, deduped per browser by 1-year cookie). |
| `/contact`  | Server (`revalidate=0`)             | Editorial channel list (email, GitHub, LinkedIn, resume). The Resume row now links to `/resume` (the .docx download is one click further in) and shows the same read-count chip — surfaces the resume route without exposing it in the nav.    |

---

## Architecture

### Directory layout

```
src/
├── app/                       # App Router pages and root layout
│   ├── layout.tsx             # Root: fonts, <Nav />, metadata
│   ├── page.tsx               # /          (Server shell -> HeroRouter)
│   ├── journey/page.tsx       # /journey   (Server shell -> JourneyClient)
│   ├── projects/page.tsx      # /projects  (Server fetch + Client RepoList)
│   └── contact/page.tsx       # /contact
│
├── components/
│   ├── 3d/                    # R3F primitives for the home hero
│   │   ├── HeroClient.tsx
│   │   ├── HeroScene.tsx
│   │   ├── NameEchoKinetic.tsx
│   │   └── ...
│   │
│   ├── hero/                  # Home page composition
│   │   ├── HeroRouter.tsx
│   │   ├── Hero.tsx
│   │   └── KineticName.tsx
│   │
│   ├── journey/            # /journey: corridor scene + HUD
│   │   ├── JourneyClient.tsx     # Top-level client wrapper
│   │   ├── JourneyScene.tsx      # <Canvas> + lighting + world
│   │   ├── CorridorWorld.tsx       # Corridor geometry + signs
│   │   ├── CorridorCamera.tsx      # Over-the-shoulder follow camera
│   │   ├── CorridorCharacter.tsx   # FBX character with idle/walk/wave clips
│   │   ├── MilestoneSign.tsx       # Per-stage milestone billboard
│   │   ├── JourneyHUD.tsx        # DOM overlay: intro bubble, card, dots, CTA
│   │   └── sharedRefs.ts           # Cross-component refs (e.g. character pos)
│   │
│   ├── projects/              # /projects list components
│   │   ├── RepoList.tsx       # Search + filter (Client)
│   │   ├── RepoRow.tsx        # Editorial row (Server)
│   │   └── TechTags.tsx
│   │
│   └── ui/                    # Cross-route UI primitives
│       ├── Nav.tsx
│       ├── LoadingScreen.tsx  # drei useProgress -> motion fade
│       └── YearsMarquee.tsx
│
├── hooks/
│   ├── useTypewriter.ts       # Char-at-a-time reveal w/ enabled gate
│   └── useJourneyControls.ts # Keyboard + click navigation
│
├── lib/
│   ├── milestones.ts          # Career timeline data + Milestone type
│   ├── corridorPositions.ts   # Stage/sign world positions, walk speed
│   ├── github.ts              # server-only GitHub fetch
│   ├── repoTypes.ts           # Shared repo types + date helpers
│   ├── projectsConfig.ts      # GITHUB_USERNAME constant
│   ├── pretextMetrics.ts
│   └── scrambleTiming.ts
│
└── stores/
    └── journeyStore.ts      # Zustand: activeIndex, transitions, greeting
```

### Patterns

- **RSC by default, Client islands by exception.** Pages are Server Components that render a static shell and delegate interactive surfaces to dynamically imported `'use client'` components.
- **3D is client-only.** Every `<Canvas>` is loaded via `dynamic(() => import(...), { ssr: false })`. Three.js touches `window` and cannot run in the Node runtime.
- **Suspense + drei `useProgress` for loading.** `LoadingScreen` subscribes to drei's global progress signal and fades out when all assets are decoded — not just downloaded. The character's greeting wave fires on a timer scheduled off the same signal so the UX never reveals an unfinished scene.
- **Server fetches data, client owns interaction.** `/projects` is the canonical example: `src/lib/github.ts` is `server-only` and fetches the repo list at request time; `RepoList` is a Client Component that handles search, debounced filtering, and the `/`-key shortcut.
- **Zustand as the journey state machine.** `journeyStore.ts` owns `activeIndex`, `direction`, `isTransitioning`, and `greetingActive` with a 280ms debounced `next` / `prev` and an atomic transition lock. Cross-component coordination (camera, character, HUD, intro bubble) happens through this single source.
- **Refs, not state, for per-frame values.** Anything driven by `useFrame` (positions, rotations, look-at targets) lives in `useRef`. Re-rendering on every frame would defeat R3F's whole model.
- **Single source of truth for the typewriter.** The journey's milestone description and the end-CTA reveal are both gated on one shared `isTyping` signal, lifted to `JourneyHUD` so the CTA waits exactly as long as the typewriter takes — not on a fixed timer.

### Mobile-first

- Every layout starts at 320px and scales up via `sm:` / `md:` / `lg:` breakpoints.
- `min-h-[100dvh]` everywhere — never `h-screen` (browser chrome resize bug).
- 3D scenes adapt: lower DPR, reduced segment counts, no heavy post-processing on small viewports.
- Touch and pointer events are both wired into R3F interactions.

### Visual identity

- No Inter font, no pure black, no centered hero, no generic 3-column card grid, no neon glow.
- Type stack: Geist Sans + Geist Mono.
- Background: zinc-950 (off-black), with one accent color, saturation < 80%.
- Layout: asymmetric / split / editorial — bento, zigzag, masonry — never default.
- Animation budget: only `transform` and `opacity`. Never layout properties.

---

## Public assets

```
public/
├── Chetan_Dasauni_Resume_2026.docx   # Linked from /contact and /journey end-CTA
├── fonts/                             # Self-hosted display fonts
├── hdri/                              # Polyhaven HDR environment maps
└── models/
    ├── character-idle.fbx             # Mixamo, root-motion stripped at load
    ├── character-walk.fbx
    ├── waving.fbx
    └── workspace.glb
```

Mixamo clips have their `Hips.position` track stripped on import — otherwise the baked root motion would compound with our `useFrame` walk lerp and double-displace the character each step.

---

## Scripts

```bash
pnpm dev            # Next dev server with Turbopack
pnpm build          # Production build (runs `prebuild` → build:chat-context first)
pnpm start          # Serve the production build
pnpm lint           # ESLint via next lint
pnpm type-check     # tsc --noEmit
pnpm sync:resume    # Regenerate src/data/resume.json from public/<resume>.docx (see below)
pnpm prepare        # Installs husky git hooks (auto-runs after pnpm install)
```

---

## Resume content workflow

`src/data/resume.json` is the canonical source for everything resume-related: the `/resume` page render, the `/contact` Resume row, and the chatbot's citation corpus (`pnpm build:chat-context` reads it on every Vercel build). The `.docx` in `public/` is the downloadable artifact.

To keep them in sync without rewriting JSON by hand, this repo ships a one-command sync plus a pre-commit gate that blocks drift.

### The sync command

```bash
pnpm sync:resume
```

Pipeline (`scripts/sync-resume-json.ts`):

1. Reads `public/Chetan_Dasauni_Resume_2026.docx` and extracts raw text via `mammoth`.
2. Reads the current `src/data/resume.json` so Claude can preserve stable IDs (`experience-scribd`, etc.) — those IDs double as DOM anchors and chat-citation keys, breaking them would invalidate every chat answer that deep-links into the resume.
3. Sends both to Claude (Sonnet 4.6, matching `src/app/api/chat/route.ts`) with the `Resume` schema and instructions.
4. Validates the response shape (top-level fields present, arrays are arrays) before writing.
5. Pretty-prints back to `src/data/resume.json` for review via `git diff`.

Requires `ANTHROPIC_API_KEY` in `.env.local` — same env var the chat already uses. Runs in ~5 seconds; cost is roughly a tenth of a cent per invocation.

### The pre-commit gate

`.husky/pre-commit` runs `scripts/check-resume-sync.mjs`, which inspects `git diff --cached`. If a `resume*.docx` is staged but `src/data/resume.json` is **not**, the commit is blocked with:

```
Resume .docx is staged but src/data/resume.json is not.
These need to stay in sync — the JSON drives /resume rendering
and the chat citation corpus.

Run:
    pnpm sync:resume

Then `git add src/data/resume.json` and commit again.
```

The gate is intentionally one-directional — JSON-only changes (typo fixes, minor wording) commit freely without forcing a `.docx` re-upload.

### Typical flow

```bash
# 1. Replace the .docx in public/
git add public/Chetan_Dasauni_Resume_2026.docx
git commit -m "chore: refresh resume to 2026-Q2"
#   ↳ blocked: pnpm sync:resume

pnpm sync:resume
git diff src/data/resume.json   # review what Claude changed
git add src/data/resume.json
git commit -m "chore: refresh resume to 2026-Q2"
#   ↳ passes; next Vercel build regenerates the chat corpus too
```

To bypass the hook for a legitimate reason (e.g. you intentionally want only the .docx and JSON-as-truth flips temporarily): `git commit --no-verify`. Avoid otherwise — the JSON drift is silent until somebody asks the chatbot a question and gets a stale answer.

---

## Performance budget

- LCP < 2.5s on mobile (3G throttled)
- Desktop 3D canvas: 60fps; mobile: 30fps acceptable
- No barrel imports; heavy Three.js components are dynamically imported
- Animations restricted to `transform` and `opacity`

---
