import Link from 'next/link'
import { Suspense } from 'react'
import { getRepos, type RepoEntry } from '@/lib/github'
import RepoList from '@/components/projects/RepoList'
import ProjectsSkeleton from '@/components/projects/ProjectsSkeleton'

export const metadata = {
  title: 'Projects — Chetan Dasauni',
  description:
    'Every public repository — explorations, experiments, and shipped work.',
}

export const revalidate = 3600

export default function ProjectsPage() {
  return (
    <main className="relative min-h-[100dvh] w-full px-6 pb-28 pt-28 sm:px-10 sm:pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Suspense fallback={<LoadingShell />}>
          <ResolvedShell />
        </Suspense>
      </div>
    </main>
  )
}

function LoadingShell() {
  return (
    <>
      <Header count={null} />
      <ProjectsSkeleton />
    </>
  )
}

async function ResolvedShell() {
  let repos: RepoEntry[] | null = null
  try {
    repos = await getRepos()
  } catch {
    // Swallow — render the error notice below.
  }

  if (!repos) {
    return (
      <>
        <Header count={null} />
        <ErrorNotice />
      </>
    )
  }

  return (
    <>
      <Header count={repos.length} />
      <RepoList repos={repos} />
      <Footer />
    </>
  )
}

function Header({ count }: { count: number | null }) {
  const countLabel =
    count === null
      ? 'All public repositories'
      : `${count} public repositories`
  return (
    <header className="max-w-2xl">
      <p
        className="animate-reveal-up font-mono text-[12px] uppercase tracking-[0.32em] text-zinc-500 sm:text-[11px]"
        style={{ animationDelay: '60ms' }}
      >
        Projects
      </p>
      <h1
        className="animate-reveal-up mt-5 text-[2.75rem] font-semibold leading-[0.95] tracking-tighter text-zinc-50 sm:mt-4 sm:text-5xl lg:text-6xl"
        style={{ animationDelay: '140ms' }}
      >
        Selected work
      </h1>
      <p
        className="animate-reveal-up mt-6 max-w-xl text-[17px] leading-[1.55] text-zinc-400 sm:mt-5 sm:text-base lg:text-lg"
        style={{ animationDelay: '220ms' }}
      >
        {countLabel} — explorations, experiments, and shipped work, sorted by
        most recent push.
      </p>

      <div
        className="animate-reveal-up mt-9 flex flex-wrap items-center gap-3 sm:mt-8"
        style={{ animationDelay: '300ms' }}
      >
        <Link
          href="https://github.com/chetan25"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-[14px] font-medium tracking-wide text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-[background-color,transform] duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.08] active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-[13px]"
        >
          GitHub profile
          <span aria-hidden className="text-[14px] sm:text-[13px]">
            &rarr;
          </span>
        </Link>
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500 sm:text-[10px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          Live · refreshed hourly
        </span>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <p className="mt-16 max-w-md text-[14px] leading-relaxed text-zinc-500 sm:mt-20 sm:text-[13px]">
      Want a particular case study?{' '}
      <Link
        href="/contact"
        className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition-colors duration-300 ease-[var(--ease-premium)] hover:text-zinc-50 hover:decoration-white/60"
      >
        Get in touch
      </Link>
      .
    </p>
  )
}

function ErrorNotice() {
  return (
    <section className="mt-16 sm:mt-20">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-300/80">
          GitHub unreachable
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-300">
          Couldn&apos;t fetch the live repository data right now. Try again in
          a few minutes, or browse the source directly:
        </p>
        <div className="mt-5">
          <Link
            href="https://github.com/chetan25"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium tracking-wide text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-[background-color] duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.08]"
          >
            github.com/chetan25
            <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
