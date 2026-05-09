'use client'

/**
 * NameEchoKinetic — 3D point-cloud headline with a per-character mount
 * scramble. Used by Hero, where the cloud IS the visible headline (the DOM
 * `KineticName` is rendered invisibly only to provide bbox anchors).
 *
 * How the scramble works:
 *
 *   1. On mount, sample every glyph in the alphabet pool once into a fixed-size
 *      point buffer (`POINTS_PER_CHAR`). Glyphs naturally yield different point
 *      counts; we resample to a uniform N so we can hot-swap glyphs at a char
 *      slot without rebuilding geometry.
 *
 *   2. Compute target layout for each char in `TEXT_LINES` — its world (cx, cy)
 *      center in a pixel→world projection.
 *
 *   3. Each char gets a stagger offset. While `elapsed ∈ [start, start + DURATION]`
 *      we tick its "currently displayed glyph" every ~33ms with a random pick
 *      from the alphabet pool. After the window closes, the slot snaps to the
 *      real char.
 *
 *   4. Every frame, copy each slot's chosen glyph buffer (offset by its center)
 *      into one master positions array, then mark the geometry dirty.
 *
 * Once all slots have settled, we stop touching the buffer — no per-frame work
 * beyond the slow rotation/bob.
 */

import { Points, PointMaterial } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
// The echo intentionally scrambles for longer than the DOM kinetic name —
// the cloud IS the headline now, so the user should clearly see each char
// cycle through several random glyphs before settling on its real letter.
const SCRAMBLE_DURATION_MS = 950
const PER_CHAR_STAGGER_MS = 95

type Props = {
  isMobile?: boolean
  position?: [number, number, number]
  /**
   * Lines of text to render as the kinetic point cloud. Each instance of
   * this component handles its own independent fade-in + scramble timeline,
   * which is why Hero renders one instance per name (Chetan,
   * Dasauni) — that gives each echo a discrete "and then this one
   * appears" beat instead of all lines sharing one material that would
   * blink when any line's phase starts.
   */
  lines?: string[]
  /**
   * If set, the cloud anchors itself to the bounding rect of the first DOM
   * element matching this CSS selector. The cloud is unprojected onto the
   * camera ray through the rect's center at the configured Z plane, so the
   * cloud reads as a depth-extruded shadow of that DOM element regardless of
   * viewport size or font scaling.
   */
  alignToSelector?: string
  /** Z-plane the cloud sits on (only used when alignToSelector is set). */
  alignZ?: number
  /**
   * CSS-pixel offset applied to the DOM target's center before unprojection.
   * Positive X shifts the cloud right; positive Y shifts it down. Use this to
   * push the echo out from directly behind the text so it reads as an
   * extruded shadow rather than a perfect overlay.
   */
  alignOffsetCss?: { x: number; y: number }
  /**
   * Uniform XY scale applied to the cloud. Use < 1 to render the echo
   * smaller than the DOM headline. Z is left at 1 so depth jitter remains
   * physically meaningful for the parallax animation.
   */
  scaleXY?: number
  /**
   * Static Y-axis tilt in radians. The animated yaw is added on top of this,
   * so the cloud reads as a tilted plane of dots rather than facing the
   * camera straight on — this is what gives the depth-shadow its "at an
   * angle" character.
   */
  tiltY?: number
  /**
   * Wall-clock milliseconds to wait after fonts.ready before kicking off
   * the cloud's mount scramble. Use this to make the echo animate in *after*
   * the DOM headline has already settled (sequential storytelling) rather
   * than scrambling alongside it.
   */
  startDelayMs?: number
}

const DEFAULT_TEXT_LINES = ['Chetan', 'Dasauni']
const FONT_FAMILY = 'Geist'
const FONT_WEIGHT = 800
const CANVAS_FONT_PX = 96
const LINE_HEIGHT = CANVAS_FONT_PX * 0.92

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')

// Per-char point budget. Same N for every glyph so we can swap glyphs at a slot
// without resizing the geometry buffer.
const POINTS_PER_CHAR_DESKTOP = 420
const POINTS_PER_CHAR_MOBILE = 220

// Tighter sample grid → more candidate pixels per glyph → better letter
// edge fidelity once the per-char buffer is downsampled to N points.
const SAMPLE_STRIDE = 2
const ALPHA_THRESHOLD = 110

const WORLD_SCALE = 0.012
// Echo is the visible headline — keep the points effectively flat so each
// letter reads as a crisp 2D dot-traced glyph rather than a depth-blurred
// cloud. Tiny jitter remains so points don't all share an exact z plane
// (which would z-fight subtly under sizeAttenuation).
const DEPTH_JITTER = 0.08

// Each random glyph is held for ~60ms ≈ 4 frames at 60Hz — slow enough that
// the user clearly *sees* each random letter, fast enough to read as a
// scramble rather than a stutter.
const SCRAMBLE_TICK_MS = 60

// Hover hit-test radius in world units (cloud-local space, before scaleXY).
// CANVAS_FONT_PX / 2 * WORLD_SCALE ≈ 0.576 covers roughly half a cap-height
// of slack around each slot center, so the user can hover slightly off the
// stroke and still trigger the slot's scramble.
const HOVER_HIT_RADIUS = (CANVAS_FONT_PX / 2) * WORLD_SCALE

// How long the shared material fades in when a line's phase begins. The
// fade is what makes the user *see* "the echo appearing" as a discrete
// event rather than a static cloud that suddenly starts moving.
const PER_LINE_FADE_MS = 280

type GlyphPool = Map<string, Float32Array>

type CharSlot = {
  /** Original character at this slot. */
  char: string
  /** World-space center the glyph cluster is offset to. */
  cx: number
  cy: number
  /** Which line this slot belongs to (0-based). Used by the per-line delay
   *  pass so the scramble sequencing matches the DOM kinetic name. */
  lineIdx: number
  /** Position within its line (0-based). */
  localIndex: number
  /** Mount-scramble start time (ms, relative to anim start). */
  start: number
  /** Last frame's chosen glyph — lets us no-op writes after settle. */
  current: string
  /** Last time we picked a new random glyph. */
  lastPick: number
  /** True once the slot has snapped to its real char. */
  settled: boolean
  /** Wall-clock time the cursor was last over this slot (ms). 0 means
   *  never. While the cursor is over the slot, useFrame cycles random
   *  glyphs every SCRAMBLE_TICK_MS regardless of `settled`. */
  hoverUntil: number
}

/**
 * Render a glyph to an offscreen canvas, then sample N points biased
 * toward the glyph's *outline* so each letter reads as a crisp dot-traced
 * silhouette instead of a blob of fill. Edge pixels (filled pixel with at
 * least one unfilled 4-connected neighbor) carry the letterform; interior
 * fill points are added only as a tiny supplement so very thin glyphs
 * (i, l, .) still hit the fixed N budget.
 *
 * Returns a length-3N positions buffer in world units, centered on the
 * glyph's own bounding box. Fixed N per glyph is required so the master
 * geometry buffer can hot-swap any glyph at any slot without resizing.
 */
function sampleGlyph(char: string, n: number): Float32Array {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = `${FONT_WEIGHT} ${CANVAS_FONT_PX}px ${FONT_FAMILY}`
  ctx.font = font
  const metrics = ctx.measureText(char)
  const width = Math.max(1, Math.ceil(metrics.width))
  const height = Math.ceil(CANVAS_FONT_PX * 1.1)
  canvas.width = width
  canvas.height = height
  ctx.font = font
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'top'
  ctx.fillText(char, 0, CANVAS_FONT_PX * 0.05)

  const data = ctx.getImageData(0, 0, width, height).data

  // First pass: a flat 1-byte mask of "inside the glyph" so the edge pass
  // can ask any neighbor cheaply.
  const inside = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= ALPHA_THRESHOLD) {
        inside[y * width + x] = 1
      }
    }
  }

  // Edge candidates: every filled pixel that has at least one unfilled
  // 4-connected neighbor. Sampled on the SAMPLE_STRIDE grid so the budget
  // doesn't explode on tall glyphs.
  const edgeCandidates: Array<[number, number]> = []
  const interiorCandidates: Array<[number, number]> = []
  for (let y = 0; y < height; y += SAMPLE_STRIDE) {
    for (let x = 0; x < width; x += SAMPLE_STRIDE) {
      if (!inside[y * width + x]) continue
      const left = x === 0 ? 0 : inside[y * width + (x - 1)]
      const right = x === width - 1 ? 0 : inside[y * width + (x + 1)]
      const up = y === 0 ? 0 : inside[(y - 1) * width + x]
      const down = y === height - 1 ? 0 : inside[(y + 1) * width + x]
      if (!(left && right && up && down)) {
        edgeCandidates.push([x, y])
      } else {
        interiorCandidates.push([x, y])
      }
    }
  }

  const halfW = width / 2
  const halfH = height / 2
  const out = new Float32Array(n * 3)
  if (edgeCandidates.length === 0 && interiorCandidates.length === 0) {
    return out
  }

  // Build the picking pool: outline first, then a small dose of interior
  // (~20% budget) so wide strokes don't read as hollow rings, then more
  // outline duplicates with jitter to fill any remaining budget.
  const interiorBudget = Math.min(
    Math.floor(n * 0.2),
    interiorCandidates.length
  )
  shuffle(edgeCandidates)
  shuffle(interiorCandidates)
  const pool: Array<[number, number]> = []
  for (let i = 0; i < edgeCandidates.length && pool.length < n - interiorBudget; i++) {
    pool.push(edgeCandidates[i])
  }
  for (let i = 0; i < interiorBudget; i++) {
    pool.push(interiorCandidates[i])
  }
  // If we still don't have enough samples (very thin glyph), recycle edge
  // candidates with tiny jitter to fill the buffer.
  while (pool.length < n) {
    const src = edgeCandidates.length ? edgeCandidates : interiorCandidates
    pool.push(src[pool.length % src.length])
  }

  for (let i = 0; i < n; i++) {
    const [px, py] = pool[i]
    // Tiny jitter on every point so duplicate edge candidates don't all
    // share the exact same x/y after recycling.
    const jx = (Math.random() - 0.5) * (SAMPLE_STRIDE * 0.6)
    const jy = (Math.random() - 0.5) * (SAMPLE_STRIDE * 0.6)
    out[i * 3 + 0] = (px + jx - halfW) * WORLD_SCALE
    out[i * 3 + 1] = -(py + jy - halfH) * WORLD_SCALE
    out[i * 3 + 2] = (Math.random() - 0.5) * DEPTH_JITTER
  }
  return out
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
}

/**
 * Build the alphabet pool + the per-char target layout for the given lines.
 * Returns null on the server (no document) and on contexts without a 2D ctx.
 *
 * Glyph sampling is yielded to the event loop in small batches — sampling
 * 52 glyphs synchronously on mount was the largest single source of initial
 * load jank (each canvas allocation + getImageData stall blocks the main
 * thread for a few ms; cumulative ~250ms blocks the first scramble frames).
 */
async function buildLayout(
  pointsPerChar: number,
  textLines: string[]
): Promise<{
  pool: GlyphPool
  slots: CharSlot[]
} | null> {
  if (typeof document === 'undefined') return null

  const pool: GlyphPool = new Map()
  const BATCH = 8
  for (let i = 0; i < ALPHABET.length; i += BATCH) {
    for (let j = i; j < Math.min(i + BATCH, ALPHABET.length); j++) {
      pool.set(ALPHABET[j], sampleGlyph(ALPHABET[j], pointsPerChar))
    }
    // Yield to the event loop so other work (font load, layout, R3F first
    // frame) can happen between batches. setTimeout(0) is sufficient — we
    // don't need rAF precision here.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }

  // Layout: walk each line measuring char advance widths, build slot centers.
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const font = `${FONT_WEIGHT} ${CANVAS_FONT_PX}px ${FONT_FAMILY}`
  ctx.font = font

  // Pixel-space layout, then convert centers to world to match the per-glyph
  // sampling math above.
  const lineWidthsPx = textLines.map((line) => {
    let w = 0
    for (const ch of line) w += ctx.measureText(ch).width
    return w
  })
  const maxLineWidthPx = Math.max(...lineWidthsPx)
  const totalHeightPx = LINE_HEIGHT * textLines.length

  const slots: CharSlot[] = []
  let runningIndex = 0

  // Shared left edge so both lines align flush-left.
  const leftEdgePx = -maxLineWidthPx / 2

  textLines.forEach((line, lineIdx) => {
    let cursorPx = 0
    let localIndex = 0
    const lineTopPx = lineIdx * LINE_HEIGHT - totalHeightPx / 2

    for (const ch of line) {
      const advance = ctx.measureText(ch).width
      const cxPx = leftEdgePx + cursorPx + advance / 2
      const cyPx = lineTopPx + LINE_HEIGHT / 2 + CANVAS_FONT_PX * 0.05

      // World-space center. Y flip because canvas-down is world-up.
      const cx = cxPx * WORLD_SCALE
      const cy = -cyPx * WORLD_SCALE

      slots.push({
        char: ch,
        cx,
        cy,
        lineIdx,
        localIndex,
        // Default start uses the global running stagger. Caller patches
        // these post-build when `lineDelays` is provided so per-line
        // sequencing works without rebuilding the glyph pool.
        start: runningIndex * PER_CHAR_STAGGER_MS,
        current: pickRandomGlyph(),
        lastPick: 0,
        settled: false,
        hoverUntil: 0,
      })

      cursorPx += advance
      runningIndex++
      localIndex++
    }
  })

  return { pool, slots }
}

function pickRandomGlyph(): string {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
}

export default function NameEchoKinetic({
  isMobile = false,
  // Default static anchor — used when alignToSelector isn't provided. Kept at
  // the previously-tuned position so the standalone variant still works.
  position = [-0.7, 0.7, -0.6],
  lines = DEFAULT_TEXT_LINES,
  alignToSelector,
  alignZ = -0.6,
  alignOffsetCss = { x: 0, y: 0 },
  scaleXY = 1,
  tiltY = 0,
  startDelayMs = 0,
}: Props) {
  const ref = useRef<THREE.Points>(null)
  const [layout, setLayout] = useState<{
    pool: GlyphPool
    slots: CharSlot[]
    masterPositions: Float32Array
  } | null>(null)
  const animStartRef = useRef<number>(0)
  // Cursor in CSS pixels relative to the canvas. `active` flips off when
  // the pointer leaves the canvas so we don't keep scrambling phantom
  // hovers forever.
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  })
  // Anchor lives in a ref, not state. Updating it doesn't trigger a React
  // re-render of the Points element — the useFrame loop reads it directly
  // and writes to the mesh's position. This avoids re-render churn during
  // initial load when fonts.ready + ResizeObserver fire in quick succession.
  const anchorRef = useRef<[number, number, number]>(position)
  // Stable identity for the default position — avoids retriggering the align
  // effect on every render due to a new array literal from the parent.
  const fallbackPosition = useMemo(
    () => [position[0], position[1], position[2]] as [number, number, number],
    // Intentionally only recompute when the *values* change, not the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position[0], position[1], position[2]]
  )

  const { camera, gl, size } = useThree()

  // Track cursor against the canvas so useFrame can do per-slot hit-tests
  // in cloud-local space and trigger a hover scramble on the slot under
  // the pointer (mirrors KineticName's cursor scramble for the DOM).
  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      cursorRef.current.x = e.clientX - rect.left
      cursorRef.current.y = e.clientY - rect.top
      cursorRef.current.active = true
    }
    const onLeave = () => {
      cursorRef.current.active = false
    }
    // Listen on window so the hover keeps tracking while the user moves
    // off the (transparent) canvas onto the DOM headline area above it.
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [gl])

  // Bind anchor to the DOM target's projected screen position. Re-runs on
  // resize and on layout shift via ResizeObserver.
  useEffect(() => {
    if (!alignToSelector) {
      anchorRef.current = fallbackPosition
      return
    }
    let cancelled = false
    let ro: ResizeObserver | null = null
    let target: Element | null = null

    const project = () => {
      target = document.querySelector(alignToSelector)
      if (!target || cancelled) return
      const rect = (target as HTMLElement).getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const canvasRect = gl.domElement.getBoundingClientRect()
      // Center of the DOM target in canvas-CSS pixels, with the configured
      // offset applied so the cloud reads as offset-shadow of the headline.
      const cxCss = rect.left + rect.width / 2 - canvasRect.left + alignOffsetCss.x
      const cyCss = rect.top + rect.height / 2 - canvasRect.top + alignOffsetCss.y
      // Skip if the target is off-canvas (avoids garbage anchors during HMR
      // or before layout settles).
      if (
        cxCss < 0 ||
        cyCss < 0 ||
        cxCss > canvasRect.width ||
        cyCss > canvasRect.height
      ) {
        return
      }
      const ndcX = (cxCss / canvasRect.width) * 2 - 1
      const ndcY = -((cyCss / canvasRect.height) * 2 - 1)
      // Cast a ray from the camera through (ndcX, ndcY) and intersect the
      // plane at world Z = alignZ. The intersection is where the cloud
      // anchor needs to be so its projected center lands on the DOM target.
      const ray = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera)
      const dir = ray.sub(camera.position).normalize()
      const t = (alignZ - camera.position.z) / dir.z
      const world = camera.position.clone().add(dir.multiplyScalar(t))
      // The cloud's local origin is at its visual center horizontally but
      // slightly above its vertical center (line 0 is at +0.47 world, line 1
      // at -0.59 world; mean ≈ -0.06). Compensate so the visual center —
      // not the local origin — lands on the target.
      anchorRef.current = [world.x, world.y + 0.058, alignZ]
    }

    project()
    const onResize = () => project()
    window.addEventListener('resize', onResize)
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => project())
      const t = document.querySelector(alignToSelector)
      if (t) ro.observe(t)
    }
    // Re-project once after fonts settle (KineticName re-measures on font
    // ready, so its rect changes slightly).
    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) project()
      })
    }
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [
    alignToSelector,
    alignZ,
    alignOffsetCss.x,
    alignOffsetCss.y,
    camera,
    gl,
    fallbackPosition,
    size.width,
    size.height,
  ])

  const pointsPerChar = isMobile
    ? POINTS_PER_CHAR_MOBILE
    : POINTS_PER_CHAR_DESKTOP

  useEffect(() => {
    let cancelled = false
    let pendingTimer: number | null = null

    const run = async (_animStartAt: number) => {
      const built = await buildLayout(pointsPerChar, lines)
      if (cancelled || !built) return
      const masterPositions = new Float32Array(
        built.slots.length * pointsPerChar * 3
      )
      // Seed each slot with its initial random glyph at proper positions.
      // Per-line delays / hidden-slot logic is no longer needed — each
      // NameEchoKinetic instance now handles a single line, and the whole
      // material is faded in via material.opacity so the cloud only
      // becomes visible at this instance's phase boundary.
      for (let s = 0; s < built.slots.length; s++) {
        const slot = built.slots[s]
        const offset = s * pointsPerChar * 3
        const glyph =
          built.pool.get(slot.current) ?? built.pool.get(slot.char)!
        for (let i = 0; i < pointsPerChar; i++) {
          masterPositions[offset + i * 3 + 0] = glyph[i * 3 + 0] + slot.cx
          masterPositions[offset + i * 3 + 1] = glyph[i * 3 + 1] + slot.cy
          masterPositions[offset + i * 3 + 2] = glyph[i * 3 + 2]
        }
      }
      // Reset the anim clock to *now* — i.e. the moment the cloud first
      // becomes visible. The async glyph-pool build burns ~250ms before
      // setLayout fires, and if we left animStartRef pointing into the
      // past, the user would see the scramble already partway through
      // (or fully over) at first paint. Starting the clock here means the
      // full SCRAMBLE_DURATION_MS plays out where the user can see it.
      animStartRef.current = performance.now()
      setLayout({ ...built, masterPositions })
    }

    const startAfterFonts = () => {
      const animStart = performance.now() + startDelayMs
      // If a delay is requested, defer build (and therefore visibility) by
      // that long so the echo doesn't appear and sit still during the
      // delay window. setLayout fires inside run(), gating the <Points>
      // render — no cloud is shown until run() resolves.
      if (startDelayMs > 0) {
        pendingTimer = window.setTimeout(() => {
          pendingTimer = null
          if (!cancelled) run(animStart)
        }, startDelayMs)
      } else {
        run(animStart)
      }
    }

    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) startAfterFonts()
      })
    } else {
      startAfterFonts()
    }

    return () => {
      cancelled = true
      if (pendingTimer !== null) window.clearTimeout(pendingTimer)
    }
    // `lines` is read inside the closure; relying on parent passing a stable
    // reference (module-level constant or memoised array) so a new literal
    // each render doesn't restart the build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsPerChar, startDelayMs])

  useFrame(() => {
    if (!ref.current) return
    const a = anchorRef.current
    // Echo is the readable headline — pin it flat (only the static tilt
    // applies). The previous ambient yaw / bob smeared letter edges
    // because point depth jitter parallaxed during rotation, hurting
    // legibility. Apply just the static tilt configured by the parent.
    ref.current.rotation.y = tiltY
    ref.current.position.x = a[0]
    ref.current.position.y = a[1]
    ref.current.position.z = a[2]

    // Monotonic fade-in once at this instance's anim start. Each
    // NameEchoKinetic owns one line, so its material opacity goes 0 → 1
    // over PER_LINE_FADE_MS at startDelayMs and then stays at 1 — no
    // mid-animation drops to cause blinks.
    if (layout) {
      const elapsed = performance.now() - animStartRef.current
      const fade = Math.min(1, Math.max(0, elapsed) / PER_LINE_FADE_MS)
      const mat = ref.current.material as THREE.Material & { opacity: number }
      if (mat && 'opacity' in mat) {
        mat.opacity = fade
      }
    }

    if (!layout) return
    const { pool, slots, masterPositions } = layout
    const now = performance.now()
    const elapsed = now - animStartRef.current

    // Compute cursor's cloud-local position once per frame for per-slot
    // hit-tests below. Reuses the unprojected ray-plane intersection at
    // the cloud's anchor Z, then maps into local space (un-translates +
    // un-scales) so hit-test radii are in glyph-canvas units.
    const cursor = cursorRef.current
    let cursorLocalX = Number.POSITIVE_INFINITY
    let cursorLocalY = Number.POSITIVE_INFINITY
    if (cursor.active) {
      const canvasRect = gl.domElement.getBoundingClientRect()
      const ndcX = (cursor.x / canvasRect.width) * 2 - 1
      const ndcY = -((cursor.y / canvasRect.height) * 2 - 1)
      const ray = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera)
      const dir = ray.sub(camera.position).normalize()
      const anchorZ = anchorRef.current[2]
      if (Math.abs(dir.z) > 1e-4) {
        const t = (anchorZ - camera.position.z) / dir.z
        const worldHit = camera.position.clone().add(dir.multiplyScalar(t))
        cursorLocalX = (worldHit.x - anchorRef.current[0]) / scaleXY
        cursorLocalY = (worldHit.y - anchorRef.current[1]) / scaleXY
      }
    }

    let dirty = false
    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s]

      // Per-slot hover test. While the cursor is within HOVER_HIT_RADIUS
      // of this slot's center, mark `hoverUntil` to a small grace window
      // in the future so the slot keeps scrambling for ~120ms after the
      // cursor leaves (avoids stutter when crossing kerning gaps).
      if (cursor.active) {
        const dx = slot.cx - cursorLocalX
        const dy = slot.cy - cursorLocalY
        if (dx * dx + dy * dy < HOVER_HIT_RADIUS * HOVER_HIT_RADIUS) {
          slot.hoverUntil = now + 120
        }
      }
      const isHovered = now < slot.hoverUntil

      const localElapsed = elapsed - slot.start
      const inMountWindow = localElapsed >= 0 && localElapsed < SCRAMBLE_DURATION_MS

      if (!isHovered && slot.settled && !inMountWindow) continue
      if (!isHovered && localElapsed < 0) continue

      let nextGlyph = slot.current
      let writeNeeded = false

      if (isHovered) {
        // Hover overrides the settled state — keep cycling random glyphs.
        if (now - slot.lastPick >= SCRAMBLE_TICK_MS) {
          nextGlyph = pickRandomGlyph()
          slot.lastPick = now
          slot.settled = false
          writeNeeded = true
        }
      } else if (localElapsed >= SCRAMBLE_DURATION_MS) {
        // Mount scramble window ended (or hover just released). Snap to
        // the real letter.
        if (slot.current !== slot.char) {
          nextGlyph = slot.char
          writeNeeded = true
        }
        slot.settled = true
      } else if (now - slot.lastPick >= SCRAMBLE_TICK_MS) {
        nextGlyph = pickRandomGlyph()
        slot.lastPick = now
        writeNeeded = true
      }

      if (!writeNeeded) continue
      slot.current = nextGlyph

      const glyph = pool.get(nextGlyph) ?? pool.get(slot.char)!
      const offset = s * pointsPerChar * 3
      for (let i = 0; i < pointsPerChar; i++) {
        masterPositions[offset + i * 3 + 0] = glyph[i * 3 + 0] + slot.cx
        masterPositions[offset + i * 3 + 1] = glyph[i * 3 + 1] + slot.cy
        masterPositions[offset + i * 3 + 2] = glyph[i * 3 + 2]
      }
      dirty = true
    }

    if (dirty && ref.current.geometry.attributes.position) {
      ;(ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
  })

  const ready = useMemo(
    () => !!layout && layout.masterPositions.length > 0,
    [layout]
  )
  if (!ready || !layout) return null

  return (
    <Points
      ref={ref}
      positions={layout.masterPositions}
      stride={3}
      // position is driven imperatively in useFrame from anchorRef so anchor
      // updates don't trigger React re-renders. Initial position seeds the
      // mesh; useFrame overwrites every tick.
      position={anchorRef.current}
      scale={[scaleXY, scaleXY, 1]}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        // Small base size — the cloud is the headline now and gets scaled
        // up via `scaleXY`, which also scales these points. Dense + small
        // gives crisp letter outlines instead of fat blobs that smear.
        size={isMobile ? 0.022 : 0.018}
        color="#e6edff"
        sizeAttenuation
        depthWrite={false}
        // Initial 0; useFrame ramps to 1 once the active line's phase
        // begins so the echo's appearance reads as a deliberate beat.
        opacity={0}
      />
    </Points>
  )
}
