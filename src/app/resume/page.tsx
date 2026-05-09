import Link from 'next/link'
import resumeData from '@/data/resume.json'
import type { Resume } from '@/types/resume'

const resume = resumeData as Resume

export const metadata = {
  title: `Resume — ${resume.meta.name}`,
  description: resume.summary,
}

const META_LINKS: { label: string; href: string; external: boolean }[] = [
  {
    label: resume.meta.email,
    href: `mailto:${resume.meta.email}`,
    external: false,
  },
  { label: 'GitHub', href: resume.meta.githubUrl, external: true },
  { label: 'LinkedIn', href: resume.meta.linkedinUrl, external: true },
]

function formatRange(start: string, end: string): string {
  if (end === 'Present') return `${start} — Present`
  if (start === end) return start
  return `${start} — ${end}`
}

export default function ResumePage() {
  return (
    <main className="relative min-h-[100dvh] w-full px-6 pb-28 pt-28 sm:px-10 sm:pt-32 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <header>
          <p
            className="animate-reveal-up font-mono text-[12px] uppercase tracking-[0.32em] text-zinc-500 sm:text-[11px]"
            style={{ animationDelay: '60ms' }}
          >
            Resume
          </p>
          <h1
            className="animate-reveal-up mt-5 text-[2.75rem] font-semibold leading-[0.95] tracking-tighter text-zinc-50 sm:mt-4 sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '140ms' }}
          >
            {resume.meta.name}
          </h1>
          <p
            className="animate-reveal-up mt-4 text-[15px] text-zinc-400 sm:text-base"
            style={{ animationDelay: '200ms' }}
          >
            {resume.meta.title} · {resume.meta.location}
          </p>

          <ul
            className="animate-reveal-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]"
            style={{ animationDelay: '260ms' }}
          >
            {META_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noreferrer' : undefined}
                  className="text-zinc-400 underline decoration-white/15 underline-offset-4 transition-colors duration-300 ease-[var(--ease-premium)] hover:text-zinc-50 hover:decoration-white/50"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={resume.meta.docxHref}
                download
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition-colors duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.08] hover:text-zinc-50"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                .docx
              </a>
            </li>
          </ul>
        </header>

        <p
          className="animate-reveal-up mt-12 max-w-2xl text-[17px] leading-[1.6] text-zinc-300 sm:text-lg"
          style={{ animationDelay: '320ms' }}
        >
          {resume.summary}
        </p>

        <SectionHeader label="Experience" delayMs={420} />
        <ol className="mt-8 divide-y divide-white/5 border-y border-white/5">
          {resume.experience.map((entry, i) => (
            <li key={entry.id} id={entry.id}>
              <article
                className="animate-reveal-up grid grid-cols-1 gap-3 py-8 sm:grid-cols-[140px_1fr] sm:gap-8 sm:py-10"
                style={{ animationDelay: `${500 + i * 70}ms` }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-[10px]">
                  {formatRange(entry.start, entry.end)}
                </p>
                <div className="min-w-0">
                  <h3 className="text-[18px] font-semibold leading-snug tracking-tight text-zinc-50 sm:text-xl">
                    {entry.role}
                  </h3>
                  <p className="mt-1 text-[14px] text-zinc-400">
                    {entry.company} · {entry.location}
                  </p>
                  {entry.summary && (
                    <p className="mt-3 text-[14px] leading-relaxed text-zinc-300">
                      {entry.summary}
                    </p>
                  )}
                  <ul className="mt-4 space-y-2">
                    {entry.bullets.map((bullet, bi) => (
                      <li
                        key={bi}
                        className="relative pl-5 text-[14px] leading-relaxed text-zinc-400 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-3 before:bg-white/20"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  {entry.tech && entry.tech.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-1.5">
                      {entry.tech.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-400"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>

        <SectionHeader label="Education" delayMs={120} />
        <ol className="mt-8 divide-y divide-white/5 border-y border-white/5">
          {resume.education.map((entry) => (
            <li key={entry.id} id={entry.id}>
              <article className="grid grid-cols-1 gap-3 py-8 sm:grid-cols-[140px_1fr] sm:gap-8 sm:py-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-[10px]">
                  {formatRange(entry.start, entry.end)}
                </p>
                <div className="min-w-0">
                  <h3 className="text-[18px] font-semibold leading-snug tracking-tight text-zinc-50 sm:text-xl">
                    {entry.credential}
                  </h3>
                  <p className="mt-1 text-[14px] text-zinc-400">
                    {entry.school}
                    {entry.location ? ` · ${entry.location}` : ''}
                  </p>
                  {entry.notes && (
                    <p className="mt-3 text-[14px] leading-relaxed text-zinc-300">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>

        <SectionHeader label="Skills" delayMs={120} />
        <div className="mt-8 grid grid-cols-1 gap-y-8 sm:grid-cols-[140px_1fr] sm:gap-x-8">
          {resume.skills.map((group) => (
            <div
              key={group.id}
              id={group.id}
              className="contents"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-[10px]">
                {group.label}
              </p>
              <ul className="flex flex-wrap gap-1.5 sm:mb-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] tracking-wide text-zinc-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-16 max-w-md text-[14px] leading-relaxed text-zinc-500 sm:text-[13px]">
          Or read the rest of the site —{' '}
          <Link
            href="/projects"
            className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition-colors duration-300 ease-[var(--ease-premium)] hover:text-zinc-50 hover:decoration-white/60"
          >
            projects
          </Link>{' '}
          and{' '}
          <Link
            href="/journey"
            className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition-colors duration-300 ease-[var(--ease-premium)] hover:text-zinc-50 hover:decoration-white/60"
          >
            the journey
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

function SectionHeader({
  label,
  delayMs,
}: {
  label: string
  delayMs: number
}) {
  return (
    <div
      className="animate-reveal-up mt-16 flex items-center gap-3 sm:mt-20"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <h2 className="font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-500 sm:text-[10px]">
        {label}
      </h2>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/[0.04] to-transparent"
      />
    </div>
  )
}
