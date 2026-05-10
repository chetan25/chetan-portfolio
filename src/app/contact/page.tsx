import Link from 'next/link'
import type { Metadata } from 'next'
import { getResumeVisits } from '@/lib/visitCounter'

const PAGE_DESCRIPTION = 'Reach out via email, GitHub, or LinkedIn.'

// Force per-request rendering so the resume read-count chip stays fresh.
// Cost is negligible — the page is otherwise just a static channel list.
export const revalidate = 0

const VISIT_FORMATTER = new Intl.NumberFormat('en-US')

export const metadata: Metadata = {
  title: 'Contact',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact — Chetan Dasauni',
    description: PAGE_DESCRIPTION,
    url: '/contact',
  },
  twitter: {
    title: 'Contact — Chetan Dasauni',
    description: PAGE_DESCRIPTION,
  },
}

const CHANNELS = [
  {
    label: 'Email',
    value: 'chetandasauni25@gmail.com',
    href: 'mailto:chetandasauni25@gmail.com',
    note: 'Best for serious work conversations',
    download: false,
  },
  {
    label: 'GitHub',
    value: '@chetan25',
    href: 'https://github.com/chetan25',
    note: 'Open source, experiments, dotfiles',
    download: false,
  },
  {
    label: 'LinkedIn',
    value: 'in/chetan-dasauni',
    href: 'https://www.linkedin.com/in/chetan-dasauni/',
    note: 'Roles, recommendations, the formal channel',
    download: false,
  },
  {
    label: 'Resume',
    value: 'Read the latest CV',
    href: '/resume',
    note: 'Web view with .docx download on the page',
    download: false,
  },
] as const

export default async function Contact() {
  const visits = await getResumeVisits()

  return (
    <main id="main" className="relative min-h-[100dvh] w-full px-6 pb-28 pt-28 sm:px-10 sm:pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p
            className="animate-reveal-up font-mono text-[12px] uppercase tracking-[0.32em] text-zinc-500 sm:text-[11px]"
            style={{ animationDelay: '60ms' }}
          >
            Contact
          </p>
          <h1
            className="animate-reveal-up mt-5 text-[2.75rem] font-semibold leading-[0.95] tracking-tighter text-zinc-50 sm:mt-4 sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '140ms' }}
          >
            Get in touch
          </h1>
          <p
            className="animate-reveal-up mt-6 max-w-xl text-[17px] leading-[1.55] text-zinc-400 sm:mt-5 sm:text-base lg:text-lg"
            style={{ animationDelay: '220ms' }}
          >
            Always happy to talk about hard frontend problems, R3F, design
            systems, or interesting engineering hires. The fastest path is
            email.
          </p>
        </header>

        <section
          aria-labelledby="contact-channels-heading"
          className="mt-16 sm:mt-16 lg:mt-20"
        >
          <div
            className="animate-reveal-up flex items-center gap-3"
            style={{ animationDelay: '300ms' }}
          >
            <h2
              id="contact-channels-heading"
              className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-zinc-500 sm:text-[10px] sm:text-zinc-600"
            >
              Channels
            </h2>
            <span className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/[0.04] to-transparent" />
          </div>

          <ul className="mt-8 divide-y divide-white/5 border-y border-white/5">
            {CHANNELS.map((c, i) => (
              <li
                key={c.label}
                className="animate-reveal-up"
                style={{ animationDelay: `${380 + i * 110}ms` }}
              >
                <a
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
                  download={c.download ? '' : undefined}
                  className="group grid grid-cols-1 gap-2 py-7 transition-colors duration-300 ease-[var(--ease-premium)] active:scale-[0.995] sm:grid-cols-[120px_1fr_auto] sm:items-baseline sm:gap-6 sm:py-6"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500 transition-colors duration-300 ease-[var(--ease-premium)] group-hover:text-zinc-300 sm:text-[10px]">
                    {c.label}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-[20px] font-medium leading-snug tracking-tight text-zinc-50 transition-colors duration-300 ease-[var(--ease-premium)] group-hover:text-white sm:text-xl sm:font-normal sm:tracking-normal">
                      {c.value}
                    </span>
                    <span className="mt-2 block text-[13px] leading-relaxed text-zinc-500 sm:mt-1 sm:text-[13px]">
                      {c.note}
                    </span>
                  </div>
                  {c.label === 'Resume' && visits !== null ? (
                    <span
                      aria-label={`${VISIT_FORMATTER.format(visits)} reads`}
                      className="inline-flex items-center gap-1.5 self-center justify-self-start rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400 transition-colors duration-300 ease-[var(--ease-premium)] group-hover:border-white/20 group-hover:text-zinc-200 sm:justify-self-end"
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-emerald-400/80"
                      />
                      {VISIT_FORMATTER.format(visits)} reads
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="hidden font-mono text-[12px] text-zinc-600 transition-all duration-300 ease-[var(--ease-premium)] group-hover:translate-x-1 group-hover:text-zinc-300 sm:inline"
                    >
                      &rarr;
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>

          <p
            className="animate-reveal-up mt-12 max-w-md text-[14px] leading-relaxed text-zinc-500 sm:mt-12 sm:text-[13px]"
            style={{ animationDelay: '780ms' }}
          >
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
        </section>
      </div>
    </main>
  )
}
