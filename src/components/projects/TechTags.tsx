/**
 * Renders an array of tech labels as small mono pills. Caps the visible
 * count and shows "+N" overflow. Pure Server Component.
 */

const PILL_BASE =
  'inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-400'

export interface TechTagsProps {
  tech: string[]
  /** Max visible pills before collapsing into "+N". */
  maxVisible?: number
  className?: string
}

export default function TechTags({
  tech,
  maxVisible = 4,
  className = '',
}: TechTagsProps) {
  if (tech.length === 0) return null

  const visible = tech.slice(0, maxVisible)
  const overflow = tech.length - visible.length

  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visible.map((label) => (
        <li key={label} className={PILL_BASE}>
          {label}
        </li>
      ))}
      {overflow > 0 && (
        <li className={`${PILL_BASE} text-zinc-500`}>+{overflow}</li>
      )}
    </ul>
  )
}
