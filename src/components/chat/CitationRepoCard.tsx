import type { RepoCitationSource } from '@/lib/chat/types'
import { deriveMonthYear } from '@/lib/repoTypes'

export default function CitationRepoCard({
  source,
}: {
  source: RepoCitationSource
}) {
  const monthYear = deriveMonthYear(source.repo.pushedAt)
  return (
    <a
      href={source.repo.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.05]"
    >
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <span>GitHub</span>
        {monthYear && (
          <>
            <span aria-hidden className="text-zinc-700">
              ·
            </span>
            <span>{monthYear}</span>
          </>
        )}
        {source.repo.language && (
          <>
            <span aria-hidden className="text-zinc-700">
              ·
            </span>
            <span>{source.repo.language}</span>
          </>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <h4 className="min-w-0 truncate text-[13px] font-medium leading-snug tracking-tight text-zinc-100 transition-colors duration-300 ease-[var(--ease-premium)] group-hover:text-white">
          {source.repo.fullName}
        </h4>
        <span
          aria-hidden
          className="ml-auto shrink-0 font-mono text-[12px] text-zinc-600 transition-all duration-300 ease-[var(--ease-premium)] group-hover:translate-x-0.5 group-hover:text-zinc-300"
        >
          &rarr;
        </span>
      </div>
      {source.repo.description && (
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-zinc-500">
          {source.repo.description}
        </p>
      )}
    </a>
  )
}
