/**
 * Pretext metrics helper.
 *
 * Pretext (chenglou/pretext) gives us no-reflow text measurement: line wrapping,
 * natural width, line stats. We pair it with canvas `measureText` to get
 * per-character x-positions for split-text animations (pretext only exposes
 * segment-level, not glyph-level).
 *
 * All measurement runs against the browser's font engine. Always call from a
 * client component, after fonts have loaded. Use `document.fonts.ready` if you
 * need to be sure web fonts are in place.
 */

import {
  prepareWithSegments,
  layoutWithLines,
  measureNaturalWidth,
  measureLineStats,
  type PreparedTextWithSegments,
  type LayoutLine,
} from '@chenglou/pretext'

export type CssFontShorthand = string // e.g. "700 96px Geist"

export type WrappedTextMetrics = {
  lines: LayoutLine[]
  height: number
  lineCount: number
  maxLineWidth: number
  naturalWidth: number
}

/**
 * Wraps a string at `maxWidth` using pretext. Returns line array + total
 * height. No DOM mutation — pure measurement.
 */
export function wrapText(
  text: string,
  font: CssFontShorthand,
  maxWidth: number,
  lineHeight: number,
  options?: { letterSpacing?: number }
): WrappedTextMetrics {
  const prepared: PreparedTextWithSegments = prepareWithSegments(text, font, {
    letterSpacing: options?.letterSpacing,
  })
  const { lines, height, lineCount } = layoutWithLines(
    prepared,
    maxWidth,
    lineHeight
  )
  const stats = measureLineStats(prepared, maxWidth)
  const naturalWidth = measureNaturalWidth(prepared)
  return {
    lines,
    height,
    lineCount,
    maxLineWidth: stats.maxLineWidth,
    naturalWidth,
  }
}

/**
 * Returns the natural (unwrapped) width of a string at the given font.
 * Useful for sizing huge display type to fill a target column exactly.
 */
export function naturalWidth(text: string, font: CssFontShorthand): number {
  const prepared = prepareWithSegments(text, font)
  return measureNaturalWidth(prepared)
}

/**
 * Picks the font-size (in px) that makes `text` exactly `targetWidth` wide
 * at the given font weight + family. Uses pretext's natural-width measurement
 * at a probe size, then scales linearly (text width is linear in font size
 * for a fixed font).
 */
export function fitFontSize(
  text: string,
  fontWeight: number | string,
  fontFamily: string,
  targetWidth: number,
  options?: { letterSpacing?: number; minPx?: number; maxPx?: number }
): number {
  const probeSize = 100
  const probeFont = `${fontWeight} ${probeSize}px ${fontFamily}`
  const prepared = prepareWithSegments(text, probeFont, {
    letterSpacing: options?.letterSpacing,
  })
  const probeWidth = measureNaturalWidth(prepared)
  if (probeWidth <= 0) return options?.minPx ?? 16
  const ideal = (probeSize * targetWidth) / probeWidth
  return Math.max(
    options?.minPx ?? 8,
    Math.min(options?.maxPx ?? 600, ideal)
  )
}

export type CharMetric = {
  char: string
  /** Left edge of the char, in CSS px, relative to the start of its line. */
  x: number
  /** Width of the char in CSS px. */
  width: number
  /** 0-indexed line this char belongs to. */
  line: number
  /** Top of the line in CSS px (line * lineHeight). */
  y: number
}

/**
 * Per-character positions across wrapped lines. Pretext gives us line breaks;
 * canvas `measureText` gives us glyph advances within a line. Combined here.
 */
export function measureCharacters(
  text: string,
  font: CssFontShorthand,
  maxWidth: number,
  lineHeight: number,
  options?: { letterSpacing?: number }
): { chars: CharMetric[]; height: number; lineCount: number } {
  const wrapped = wrapText(text, font, maxWidth, lineHeight, options)
  const ctx = getCanvasContext()
  ctx.font = font
  const letterSpacing = options?.letterSpacing ?? 0
  const chars: CharMetric[] = []
  wrapped.lines.forEach((line, lineIndex) => {
    let x = 0
    for (const char of line.text) {
      const w = ctx.measureText(char).width + letterSpacing
      chars.push({
        char,
        x,
        width: w,
        line: lineIndex,
        y: lineIndex * lineHeight,
      })
      x += w
    }
  })
  return {
    chars,
    height: wrapped.height,
    lineCount: wrapped.lineCount,
  }
}

let cachedCtx: CanvasRenderingContext2D | null = null

function getCanvasContext(): CanvasRenderingContext2D {
  if (cachedCtx) return cachedCtx
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('pretextMetrics: 2D canvas context unavailable')
  }
  cachedCtx = ctx
  return ctx
}

/**
 * Resolves once browser fonts are ready. Pretext relies on the font engine,
 * so calling measurement before fonts load yields fallback-font widths.
 */
export function fontsReady(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (!document.fonts) return Promise.resolve()
  return document.fonts.ready.then(() => undefined)
}
