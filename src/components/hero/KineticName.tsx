'use client'

/**
 * KineticName — pretext + cursor-driven display name.
 *
 * What pretext does for us:
 *
 *   1. `fitFontSize` picks a font-size that makes the *target column width*
 *      (not viewport width) exactly fit the longer line.
 *
 *   2. `measureCharacters` returns the exact (x, y, width) of every glyph
 *      against the live font engine. We use those positions to place each
 *      char as an absolutely-positioned span — which is what makes the
 *      cursor effects look pixel-accurate (kerning-aware), instead of
 *      being averaged across a flow layout.
 *
 * Two layered animations on top of the layout:
 *
 *   - Mount scramble: each char cycles random glyphs for ~420ms with a
 *     per-char stagger, then snaps to its real letter.
 *
 *   - Cursor field: on pointermove we compute distance from the cursor to
 *     each glyph's pretext-measured center.
 *       * within ~80px → that char re-scrambles
 *       * within ~240px → it's pushed away with a falloff
 *
 * Touch devices skip the cursor field and keep only the mount scramble.
 *
 * The component is fully parameterized so both the Kinetic and Baseline
 * variants can share it — they just pass different `lines`, colors, and
 * font caps.
 */

import { useEffect, useRef, useState } from 'react'
import {
  fitFontSize,
  fontsReady,
  measureCharacters,
  type CharMetric,
} from '@/lib/pretextMetrics'
import {
  SCRAMBLE_DURATION_MS,
  PER_CHAR_STAGGER_MS,
} from '@/lib/scrambleTiming'

const UPPER_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER_POOL = 'abcdefghijklmnopqrstuvwxyz'
const SYMBOL_POOL = '#@$%&*+=<>/'
// Repel still uses radial distance, but is gated by the per-line Y band so
// hovering between names doesn't pull both lines toward the cursor.
const CURSOR_REPEL_RADIUS = 200
const CURSOR_REPEL_STRENGTH = 22
// Approximate cap-height as a fraction of the font-size — used to derive the
// tight per-line Y band that gates all cursor effects, so the dead space
// between two display lines reads as "off the type" instead of "near both".
const CAP_HEIGHT_FRACTION = 0.74
// Tolerance px around each glyph rect when deciding "is the cursor on this
// letter?". Small enough that kerning gaps don't become hover targets, big
// enough that the user can move smoothly between adjacent letters.
const HIT_PAD = 4

type PositionedChar = CharMetric & {
  index: number
  /** Position of this char within its line (0-based). Drives per-line stagger
   * timing when the parent passes `lineDelays` for sequential storytelling. */
  localIndex: number
  cx: number
  cy: number
  /** Top of the line's tight Y band (cap-height aligned within lineHeight). */
  bandTop: number
  /** Bottom of the line's tight Y band. */
  bandBottom: number
}

export type KineticNameProps = {
  /** Each entry is one rendered line. Casing is preserved. */
  lines: string[]
  /** CSS color for line 0 (the "main" line). Defaults to a near-white. */
  colorTop?: string
  /** CSS color for subsequent lines. */
  colorBottom?: string
  /** Font weight (default 800). */
  fontWeight?: number
  /** Font family (default Geist — must already be loaded by the page). */
  fontFamily?: string
  /** Letter-spacing in px (negative tightens). Default -1. */
  letterSpacing?: number
  /**
   * Hard cap on font size for the longest line. The component picks the
   * largest size that fits both `widthTarget` and these caps.
   */
  desktopMaxPx?: number
  mobileMaxPx?: number
  /** Floor on font size. Default 40. */
  minPx?: number
  /**
   * Width to fit the longest line into, in px. If `undefined`, falls back
   * to (containerWidth - 16) capped at 720 desktop / containerWidth mobile.
   */
  widthTarget?: number
  /** Optional className applied to the outer measurement container. */
  className?: string
  /**
   * Per-line wall-clock delay (in ms) added to each char's mount-scramble
   * start time. Use to stage lines sequentially — e.g. `[0, 1600]` makes
   * line 1's chars wait 1600ms before they start scrambling, on top of
   * their natural per-char stagger within the line. When omitted, all
   * chars stagger linearly across the full text as before.
   */
  lineDelays?: number[]
  /**
   * Wall-clock delay (in ms) before the whole component's animation kicks
   * off. Lets Hero render two instances — one per name — and stage
   * them on different timelines without coupling their internal scramble
   * logic. Layout still happens immediately so parent height stays stable.
   */
  startDelayMs?: number
}

function pickPool(forChar: string) {
  if (forChar >= 'a' && forChar <= 'z') return LOWER_POOL + SYMBOL_POOL
  if (forChar >= 'A' && forChar <= 'Z') return UPPER_POOL + SYMBOL_POOL
  return UPPER_POOL + LOWER_POOL + SYMBOL_POOL
}

function randomGlyph(forChar: string) {
  const pool = pickPool(forChar)
  return pool[Math.floor(Math.random() * pool.length)]
}

function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none)').matches
}

export default function KineticName({
  lines,
  colorTop = '#fafafa',
  colorBottom = '#d4d4d8',
  fontWeight = 800,
  fontFamily = 'Geist',
  letterSpacing = -1,
  desktopMaxPx = 132,
  mobileMaxPx = 78,
  minPx = 40,
  widthTarget,
  className,
  lineDelays,
  startDelayMs = 0,
}: KineticNameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  })
  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const [fontPx, setFontPx] = useState(desktopMaxPx)
  const [chars, setChars] = useState<PositionedChar[]>([])
  const [size, setSize] = useState<{ w: number; h: number; lineHeight: number }>(
    { w: 0, h: 0, lineHeight: desktopMaxPx * 0.92 }
  )

  // ---- Pretext-driven layout ----------------------------------------------
  useEffect(() => {
    let cancelled = false

    const recompute = async () => {
      if (!containerRef.current) return
      await fontsReady()
      if (cancelled || !containerRef.current) return

      const containerWidth = containerRef.current.clientWidth
      const isMobile = window.innerWidth < 768

      const fallbackTarget = Math.min(
        containerWidth - 16,
        isMobile ? containerWidth - 16 : 720
      )
      const target = widthTarget ?? fallbackTarget
      const pxCap = isMobile ? mobileMaxPx : desktopMaxPx

      const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b))

      const px = fitFontSize(
        longest,
        fontWeight,
        fontFamily,
        target,
        { letterSpacing, minPx, maxPx: pxCap }
      )

      const lineHeight = px * 0.92
      const capHeight = px * CAP_HEIGHT_FRACTION
      const font = `${fontWeight} ${px}px ${fontFamily}`

      const positioned: PositionedChar[] = []
      let maxLineWidth = 0
      let runningIndex = 0

      lines.forEach((line, lineIndex) => {
        const measured = measureCharacters(line, font, 100_000, lineHeight, {
          letterSpacing,
        })
        // Tight Y band for this line — centered cap-height within the box.
        const lineTop = lineIndex * lineHeight
        const bandTop = lineTop + (lineHeight - capHeight) / 2
        const bandBottom = bandTop + capHeight
        let lineWidth = 0
        let localIndex = 0
        measured.chars.forEach((c) => {
          const cx = c.x + c.width / 2
          const cy = lineTop + lineHeight / 2
          positioned.push({
            ...c,
            y: lineTop,
            line: lineIndex,
            index: runningIndex++,
            localIndex: localIndex++,
            cx,
            cy,
            bandTop,
            bandBottom,
          })
          lineWidth = Math.max(lineWidth, c.x + c.width)
        })
        maxLineWidth = Math.max(maxLineWidth, lineWidth)
      })

      if (cancelled) return
      setFontPx(px)
      setChars(positioned)
      setSize({
        w: Math.ceil(maxLineWidth),
        h: Math.ceil(lines.length * lineHeight),
        lineHeight,
      })
      // Only seed the animation start time on the first recompute. Later
      // recomputes (fonts settling, parent layout shifts, window resize)
      // would otherwise reset t=0 and replay the mount scramble — the
      // visible "headline animates twice" the user noticed.
      if (startTimeRef.current === 0) {
        // Push the start into the future when startDelayMs is set, so the
        // animation loop's `elapsed = now - start` stays negative until
        // the delay window has passed (chars hold at opacity 0).
        startTimeRef.current = performance.now() + startDelayMs
      }
    }

    recompute()

    // ResizeObserver fires once *synchronously* when first attached, and
    // again whenever fonts settle and the per-char measurements change the
    // container's box. Both fires would call recompute() → setChars(...),
    // and since the animation effect depends on [chars], the mount
    // scramble would restart — looking like the headline animates twice.
    //
    // Skip the synchronous initial fire (the explicit recompute() above
    // already covers it), and debounce subsequent fires so a flurry of
    // resize events (font swap, parent layout shift, etc.) settles into a
    // single recompute call instead of restarting the animation per event.
    let ro: ResizeObserver | null = null
    let initialObserverFireSeen = false
    let pending: number | null = null
    const scheduleRecompute = () => {
      if (pending !== null) window.clearTimeout(pending)
      pending = window.setTimeout(() => {
        pending = null
        recompute()
      }, 80)
    }
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (!initialObserverFireSeen) {
          initialObserverFireSeen = true
          return
        }
        scheduleRecompute()
      })
      ro.observe(containerRef.current)
    }
    window.addEventListener('resize', scheduleRecompute)

    return () => {
      cancelled = true
      if (pending !== null) window.clearTimeout(pending)
      window.removeEventListener('resize', scheduleRecompute)
      ro?.disconnect()
    }
  }, [
    lines,
    fontWeight,
    fontFamily,
    letterSpacing,
    desktopMaxPx,
    mobileMaxPx,
    minPx,
    widthTarget,
  ])

  // ---- Cursor tracking ----------------------------------------------------
  useEffect(() => {
    if (isTouchDevice()) return
    const onMove = (e: PointerEvent) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
      mouseRef.current.active = true
    }
    const onLeave = () => {
      mouseRef.current.active = false
      mouseRef.current.x = -9999
      mouseRef.current.y = -9999
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  // ---- Per-frame char updates --------------------------------------------
  useEffect(() => {
    if (!chars.length) return

    const start = startTimeRef.current || performance.now()
    startTimeRef.current = start

    const lastScrambleAt = chars.map(() => 0)

    const loop = (now: number) => {
      const elapsed = now - start
      const mouse = mouseRef.current

      for (let i = 0; i < chars.length; i++) {
        const c = chars[i]
        const el = charRefs.current[i]
        if (!el) continue

        // When `lineDelays` is provided, each char's clock starts at its
        // line's delay + its position within the line. Otherwise fall back
        // to the original linear stagger across the full text.
        const charStart = lineDelays
          ? (lineDelays[c.line] ?? 0) + c.localIndex * PER_CHAR_STAGGER_MS
          : i * PER_CHAR_STAGGER_MS
        const inMountScramble =
          elapsed >= charStart &&
          elapsed < charStart + SCRAMBLE_DURATION_MS

        let repelX = 0
        let repelY = 0
        let cursorScramble = false
        let opacityBoost = 0

        if (mouse.active) {
          // Gate every cursor effect by the line's tight cap-height band.
          // If the cursor is in the gap between two display lines (or above /
          // below the type entirely), neither line reacts. This is the
          // "hover on the letters, not near them" rule.
          const inLineBand =
            mouse.y >= c.bandTop - HIT_PAD &&
            mouse.y <= c.bandBottom + HIT_PAD

          if (inLineBand) {
            // Repel uses radial distance within the line — keeps the magnetic
            // feel along the row of glyphs without bleeding to the other line.
            const dx = c.cx - mouse.x
            const dy = c.cy - mouse.y
            const dist = Math.hypot(dx, dy) || 0.0001
            if (dist < CURSOR_REPEL_RADIUS) {
              const t = 1 - dist / CURSOR_REPEL_RADIUS
              const force = t * t
              repelX = (dx / dist) * force * CURSOR_REPEL_STRENGTH
              repelY = (dy / dist) * force * CURSOR_REPEL_STRENGTH
              opacityBoost = force * 0.25
            }
            // Scramble is now a strict per-glyph rect hit test (not a radius)
            // — only the letter the cursor is actually over will jumble.
            const onGlyph =
              mouse.x >= c.x - HIT_PAD && mouse.x <= c.x + c.width + HIT_PAD
            if (onGlyph) cursorScramble = true
          }
        }

        const slideElapsed = Math.max(0, elapsed - charStart)
        const slideT = Math.min(1, slideElapsed / 380)
        const slideE = 1 - Math.pow(1 - slideT, 3)
        const slideY = (1 - slideE) * c.width * 0.9
        const slideOpacity = slideE

        el.style.transform = `translate3d(${repelX}px, ${slideY + repelY}px, 0)`
        el.style.opacity = String(Math.min(1, slideOpacity + opacityBoost))

        const wantScramble = inMountScramble || cursorScramble
        if (wantScramble) {
          if (now - lastScrambleAt[i] > 33) {
            el.textContent = randomGlyph(c.char)
            lastScrambleAt[i] = now
          }
        } else if (el.textContent !== c.char) {
          el.textContent = c.char
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // lineDelays read inside the loop via closure; including the array
    // identity here would restart the scramble whenever the parent passed
    // a new literal. Callers should pass a stable reference if they want
    // changes to take effect without remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars])

  return (
    <div ref={containerRef} className={`relative w-full ${className ?? ''}`}>
      <div
        className="relative select-none font-sans"
        style={{
          width: size.w || undefined,
          height: size.h || undefined,
          fontFamily,
          fontWeight,
          fontSize: `${fontPx}px`,
          lineHeight: `${size.lineHeight}px`,
          letterSpacing: `${letterSpacing}px`,
        }}
        aria-label={lines.join(' ')}
      >
        {chars.map((c, i) => (
          <span
            key={`${c.line}-${i}`}
            ref={(el) => {
              charRefs.current[i] = el
            }}
            aria-hidden="true"
            className="absolute inline-block will-change-transform"
            style={{
              left: c.x,
              top: c.y,
              width: c.width,
              color: c.line === 0 ? colorTop : colorBottom,
              opacity: 0,
            }}
          >
            {c.char}
          </span>
        ))}
      </div>
    </div>
  )
}
