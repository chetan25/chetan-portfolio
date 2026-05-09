/**
 * Atlas avatar — abstract scattered-dot constellation echoing the kinetic
 * point-cloud headline on the home page. Pure SVG, no external assets.
 */

const DOTS: { x: number; y: number; r: number; opacity?: number }[] = [
  { x: 11, y: 9, r: 2 },
  { x: 21, y: 14, r: 2 },
  { x: 14, y: 22, r: 1.6 },
  { x: 16, y: 5, r: 1, opacity: 0.7 },
  { x: 7, y: 16, r: 1, opacity: 0.7 },
  { x: 24, y: 7, r: 1, opacity: 0.7 },
  { x: 26, y: 23, r: 1, opacity: 0.7 },
  { x: 19, y: 25, r: 0.8, opacity: 0.5 },
]

export default function BotAvatar({
  size = 32,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-zinc-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="text-zinc-100"
      >
        {DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill="currentColor"
            opacity={d.opacity ?? 1}
          />
        ))}
      </svg>
    </span>
  )
}
