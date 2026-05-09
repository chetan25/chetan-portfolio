import { type RepoEntry, deriveMonthYear } from '@/lib/repoTypes'
import TechTags from './TechTags'

/**
 * One editorial list row for a public GitHub repo. The whole row is a
 * single anchor opening the repo in a new tab.
 *
 * Desktop (>= 640px): grid `[80px year] [1fr name+description] [auto language] [28px arrow]`
 * Mobile (< 640px): stacked — year + language (mono dim), name, description
 */

export interface RepoRowProps {
  entry: RepoEntry
}

export default function RepoRow({ entry }: RepoRowProps) {
  const { htmlUrl, name, description, language, pushedAt } = entry
  const monthYear = deriveMonthYear(pushedAt)
  const tech = language ? [language] : []

  const techSentence = language ? ` — ${language}` : ''
  const ariaLabel = description
    ? `${name} — ${description}${techSentence}`
    : `${name}${techSentence}`

  return (
    <li>
      <a
        href={htmlUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel}
        className="group block py-6 transition-colors duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.02] active:scale-[0.998] sm:grid sm:grid-cols-[96px_1fr_auto_28px] sm:items-baseline sm:gap-6 sm:py-6"
      >
        {/* Mobile-only top meta line: month year · language */}
        <div className="flex items-center gap-3 sm:hidden">
          {monthYear && (
            <span className="font-mono text-[12px] text-zinc-500">{monthYear}</span>
          )}
          {language && monthYear && (
            <span aria-hidden className="text-zinc-700">
              ·
            </span>
          )}
          {language && (
            <span aria-hidden className="min-w-0 truncate font-mono text-[10px] uppercase tracking-wide text-zinc-500">
              {language}
            </span>
          )}
        </div>

        {/* Desktop-only month/year column */}
        <span className="hidden whitespace-nowrap font-mono text-[12px] text-zinc-500 transition-colors duration-300 ease-[var(--ease-premium)] group-hover:text-zinc-300 sm:inline">
          {monthYear}
        </span>

        {/* Name + description — both viewports */}
        <div className="mt-2 min-w-0 sm:mt-0">
          <h3 className="text-[16px] font-medium leading-snug tracking-tight text-zinc-100 transition-colors duration-300 ease-[var(--ease-premium)] group-hover:text-white">
            {name}
          </h3>
          {description && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              {description}
            </p>
          )}
        </div>

        {/* Desktop-only language pill */}
        <div className="hidden sm:block">
          <TechTags tech={tech} maxVisible={1} />
        </div>

        {/* Desktop-only arrow */}
        <span
          aria-hidden
          className="hidden self-center font-mono text-[14px] text-zinc-600 transition-all duration-300 ease-[var(--ease-premium)] group-hover:translate-x-0.5 group-hover:text-zinc-200 sm:inline"
        >
          &rarr;
        </span>
      </a>
    </li>
  )
}
