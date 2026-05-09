'use client'

/**
 * Hero — Echo-only.
 *
 * The DOM kinetic headline is no longer rendered visually. Two `KineticName`
 * instances are still mounted (one per name) but wrapped in
 * `visibility: hidden` containers so they:
 *   - reserve correct layout space at the headline position, and
 *   - expose accurate per-line bounding rects that the point-cloud echoes
 *     can anchor to (responsive across mobile + desktop).
 *
 * Visible content for the headline area is just the two `NameEchoKinetic`
 * point clouds, staged sequentially:
 *
 *   Phase 1  0 → PHASE_MS         Echo "Chetan"   fades + scrambles in
 *   Phase 2  PHASE_MS → 2·PHASE   Echo "Dasauni"  fades + scrambles in
 */

import HeroClient from '@/components/3d/HeroClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import YearsMarquee from '@/components/ui/YearsMarquee'
import KineticName from './KineticName'

const PHASE_MS = 1100

const CHETAN_ECHO_DELAY_MS = 250
const DASAUNI_ECHO_DELAY_MS = CHETAN_ECHO_DELAY_MS + PHASE_MS

// Wall-clock time at which both echoes have fully settled. Equals the
// last echo's start delay + its build time (~250ms async glyph pool) +
// its scramble window (~950ms in NameEchoKinetic) + a small visual cushion.
// Used to gate the bio + CTAs fade-in so the content reveals only after
// the headline has finished its show.
const ECHO_FULLY_SETTLED_MS = DASAUNI_ECHO_DELAY_MS + 250 + 950 + 200

const SHARED_KINETIC_PROPS = {
  colorTop: '#fafafa',
  colorBottom: '#d4d4d8',
  desktopMaxPx: 112,
  mobileMaxPx: 64,
  letterSpacing: -2,
  widthTarget: 560,
} as const

// Echo scale per viewport — sized so the cloud reads as a hero headline
// without bleeding into the eyebrow above, the bio paragraph below, or the
// viewport edges. The mobile range is computed continuously from viewport
// width so the cloud keeps roughly constant CSS padding (~12% of viewport
// per side) across 320 → 639px instead of being pinned to a single value.
const ECHO_SCALE_DESKTOP = 0.95
const ECHO_SCALE_TABLET = 0.7

// Cloud intrinsic width ≈ 4.2 world units. Camera fov 38° at z=7.5 sees
// ~5.16 world units vertically; horizontal varies with aspect. Solving for
// "cloud spans ~74% of viewport width" yields these endpoints; linear
// interpolation in between.
function computeMobileEchoScale(viewportWidth: number): number {
  const minW = 320
  const maxW = 639
  const minScale = 0.3
  const maxScale = 0.45
  const t = Math.min(1, Math.max(0, (viewportWidth - minW) / (maxW - minW)))
  return minScale + (maxScale - minScale) * t
}

const SHARED_ECHO_VISUALS = {
  alignOffsetCss: { x: 0, y: 0 },
  // No tilt — legibility wins over depth-shadow vibe now that the echo is
  // the only thing carrying the name.
  tiltY: 0,
} as const

const CHETAN_LINES = ['Chetan']
const DASAUNI_LINES = ['Dasauni']

function useEchoScale(): number {
  const [scale, setScale] = useState(ECHO_SCALE_DESKTOP)
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth
      if (vw >= 1024) setScale(ECHO_SCALE_DESKTOP)
      else if (vw >= 640) setScale(ECHO_SCALE_TABLET)
      else setScale(computeMobileEchoScale(vw))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

export default function Hero() {
  const echoScale = useEchoScale()

  // Bio + CTAs hold at opacity 0 until both echoes have settled, then fade
  // in over ~700ms. Using setTimeout instead of CSS animation-delay so the
  // transition only kicks off once on mount (HMR re-renders don't restart).
  const [contentRevealed, setContentRevealed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setContentRevealed(true), ECHO_FULLY_SETTLED_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-zinc-950">
      <HeroClient
        echoConfigs={[
          {
            ...SHARED_ECHO_VISUALS,
            scaleXY: echoScale,
            lines: CHETAN_LINES,
            alignToSelector: '[data-name-line="chetan"]',
            startDelayMs: CHETAN_ECHO_DELAY_MS,
          },
          {
            ...SHARED_ECHO_VISUALS,
            scaleXY: echoScale,
            lines: DASAUNI_LINES,
            alignToSelector: '[data-name-line="dasauni"]',
            startDelayMs: DASAUNI_ECHO_DELAY_MS,
          },
        ]}
      />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col justify-center gap-y-6 px-8 pb-10 pt-16 sm:justify-between sm:gap-y-0 sm:px-10 sm:pb-32 sm:pt-32 lg:px-16">
        <div className="pointer-events-auto max-w-2xl text-center sm:text-left">
          <p className="font-mono text-[12px] uppercase tracking-[0.32em] text-zinc-500 sm:text-[11px]">
            Senior Software Engineer · Vancouver
          </p>
          <h1 className="mt-5 sr-only">Chetan Dasauni</h1>
          {/* DOM headline kept invisible (layout-only) so the echo clouds
              have responsive bbox anchors but no visible 2D text competes
              with the point-cloud headline. */}
          <div
            className="invisible mt-8 mb-4 space-y-4 sm:mt-12 sm:mb-12 sm:space-y-8 lg:mt-14 lg:mb-14 lg:space-y-14"
            aria-hidden
          >
            <div data-name-line="chetan">
              <KineticName lines={CHETAN_LINES} {...SHARED_KINETIC_PROPS} />
            </div>
            <div data-name-line="dasauni">
              <KineticName lines={DASAUNI_LINES} {...SHARED_KINETIC_PROPS} />
            </div>
          </div>
        </div>

        <div
          className={`pointer-events-auto max-w-xl transition-opacity duration-700 ease-out ${contentRevealed ? 'opacity-100' : 'opacity-0'}`}
        >
          <p className="max-w-md text-[17px] leading-[1.55] text-zinc-300 sm:text-lg">
            A senior software engineer based in Vancouver, BC, with 10+ years
            shipping scalable, accessible web platforms. I work across React,
            TypeScript, Node, Ruby on Rails, and Python, with deep focus on
            frontend architecture, performance, and AI-assisted development
            workflows.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3 sm:mt-8">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-6 py-3.5 text-[14px] font-medium tracking-wide text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_28px_-14px_rgba(9,9,11,0.7)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-premium)] hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_14px_36px_-14px_rgba(9,9,11,0.8)] active:translate-y-0 active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-[13px]"
            >
              View projects
              <span aria-hidden className="text-[15px] sm:text-[14px]">
                &rarr;
              </span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-[14px] font-medium tracking-wide text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-[background-color,transform] duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.08] active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-[13px]"
            >
              Get in touch
            </Link>
            <Link
              href="/journey"
              className="group mt-1 inline-flex items-center gap-1.5 px-1 py-2 text-[13px] tracking-wide text-zinc-500 transition-colors duration-300 ease-[var(--ease-premium)] hover:text-zinc-200 sm:ml-1 sm:mt-0 sm:px-2 sm:text-[12px]"
            >
              Or take the immersive journey
              <span
                aria-hidden
                className="text-[14px] transition-transform duration-300 ease-[var(--ease-premium)] group-hover:translate-x-0.5 sm:text-[13px]"
              >
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>

      <YearsMarquee />
    </div>
  )
}
