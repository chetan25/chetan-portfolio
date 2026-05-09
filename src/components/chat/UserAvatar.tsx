/**
 * Visitor placeholder avatar — minimal silhouette glyph on a muted plate.
 * No identity is collected; this is purely a visual marker for "you" turns
 * in the message list.
 */
export default function UserAvatar({
  size = 32,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] ${className}`}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="text-zinc-400"
      >
        <circle cx="16" cy="12" r="4" fill="currentColor" />
        <path
          d="M7 26c0-4.5 4-8 9-8s9 3.5 9 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
