'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RepoEntry } from '@/lib/repoTypes'
import RepoRow from './RepoRow'

interface RepoListProps {
  repos: RepoEntry[]
}

export default function RepoList({ repos }: RepoListProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const trimmed = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!trimmed) return repos
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(trimmed) ||
        r.description.toLowerCase().includes(trimmed) ||
        r.language.toLowerCase().includes(trimmed),
    )
  }, [repos, trimmed])

  const total = repos.length
  const shown = filtered.length
  const isFiltering = trimmed.length > 0

  return (
    <section className="mt-16 sm:mt-20">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-500">
          Archive
        </span>
        <span aria-hidden className="text-zinc-700">
          &#x2726;
        </span>
        <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-500">
          {isFiltering
            ? `${String(shown).padStart(2, '0')} OF ${String(total).padStart(2, '0')}`
            : `${String(total).padStart(2, '0')} REPOS`}
        </span>
        <span
          aria-hidden
          className="ml-2 h-px flex-1 bg-gradient-to-r from-white/10 via-white/[0.04] to-transparent"
        />
      </div>

      <div className="mt-6 sm:mt-8">
        <label className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-300 ease-[var(--ease-premium)] focus-within:border-white/20 focus-within:bg-white/[0.04]">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-zinc-500 transition-colors duration-300 ease-[var(--ease-premium)] group-focus-within:text-zinc-300"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, description, or language"
            aria-label="Search projects"
            className="min-w-0 flex-1 bg-transparent text-[14px] tracking-tight text-zinc-100 placeholder:text-zinc-600 focus:outline-none sm:text-[13px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-ms-clear]:hidden"
          />
          {isFiltering ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[12px] text-zinc-400 transition-colors duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.08] hover:text-zinc-100"
            >
              &times;
            </button>
          ) : (
            <kbd
              aria-hidden
              className="hidden shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-500 sm:inline"
            >
              /
            </kbd>
          )}
        </label>
      </div>

      {shown > 0 ? (
        <ul className="mt-6 divide-y divide-white/5 border-y border-white/5 sm:mt-8">
          {filtered.map((entry) => (
            <RepoRow key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:mt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">
            No matches
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-400">
            Nothing matches &ldquo;{query.trim()}&rdquo;. Try a shorter keyword.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-300 transition-colors duration-300 ease-[var(--ease-premium)] hover:bg-white/[0.08] hover:text-zinc-50"
          >
            Clear search
          </button>
        </div>
      )}
    </section>
  )
}
