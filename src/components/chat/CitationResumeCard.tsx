import Link from 'next/link'
import type { ResumeCitationSource } from '@/lib/chat/types'

const SECTION_LABEL: Record<ResumeCitationSource['section'], string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
}

function truncate(text: string, max = 220): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

export default function CitationResumeCard({
  source,
  citedText,
}: {
  source: ResumeCitationSource
  citedText: string
}) {
  return (
    <Link
      href={`/resume#${source.resumeAnchor}`}
      className="group block rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.05]"
    >
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <span>Resume</span>
        <span aria-hidden className="text-zinc-700">
          ·
        </span>
        <span>{SECTION_LABEL[source.section]}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <h4 className="min-w-0 truncate text-[13px] font-medium leading-snug tracking-tight text-zinc-100 transition-colors duration-300 ease-[var(--ease-premium)] group-hover:text-white">
          {source.title}
        </h4>
        <span
          aria-hidden
          className="ml-auto shrink-0 font-mono text-[12px] text-zinc-600 transition-all duration-300 ease-[var(--ease-premium)] group-hover:translate-x-0.5 group-hover:text-zinc-300"
        >
          &rarr;
        </span>
      </div>
      <blockquote className="mt-2 border-l-2 border-white/15 pl-3 text-[12px] leading-relaxed text-zinc-400">
        &ldquo;{truncate(citedText)}&rdquo;
      </blockquote>
    </Link>
  )
}
