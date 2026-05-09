'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { TOTAL_STAGES, type Milestone } from '@/lib/milestones'
import {
  useCurrentMilestone,
  useJourneyStore,
} from '@/stores/journeyStore'
import { useTypewriter } from '@/hooks/useTypewriter'

const EASE = [0.16, 1, 0.3, 1] as const

const INTRO_BODY =
  'Senior software engineer in Vancouver, BC. 10+ years across React, TypeScript, Node, Ruby on Rails, and Python. Currently building the future of AI-assisted engineering workflows.'

function IntroBubble() {
  const activeIndex = useJourneyStore((s) => s.activeIndex)
  const greetingActive = useJourneyStore((s) => s.greetingActive)
  const visible = activeIndex === 0 && greetingActive
  const { displayed, isTyping } = useTypewriter(INTRO_BODY, 24, visible)
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="pointer-events-none absolute right-4 top-24 z-10 w-[280px] rounded-2xl border border-white/15 bg-zinc-950/70 px-5 py-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.65)] backdrop-blur-md sm:right-10 sm:top-1/2 sm:w-[320px] sm:-translate-y-1/2"
        >
          <p className="text-sm font-medium leading-snug text-zinc-50">
            Hi — welcome to my journey.
          </p>
          <p className="mt-1.5 min-h-[5em] text-xs leading-relaxed text-zinc-300">
            {displayed}
            {isTyping && (
              <span className="ml-0.5 inline-block h-3 w-px translate-y-[2px] animate-pulse bg-zinc-300" />
            )}
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] tracking-wide text-zinc-400">
            <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-100">
              &rarr;
            </kbd>
            <span>or click anywhere to begin</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MilestoneCard({
  milestone,
  visible,
  displayed,
  isTyping,
}: {
  milestone: Milestone
  visible: boolean
  displayed: string
  isTyping: boolean
}) {
  const activeIndex = useJourneyStore((s) => s.activeIndex)

  // Signs alternate right (odd indices) / left (even indices). Position the
  // card on the *opposite* side so the description never covers the active
  // sign. Mobile stays bottom-anchored — no horizontal alternation.
  const signOnRight = activeIndex % 2 === 1
  const desktopSidePos = signOnRight
    ? 'sm:left-10 sm:right-auto'
    : 'sm:right-10 sm:left-auto'
  const slideFromX = signOnRight ? -30 : 30

  return (
    <div
      className={`pointer-events-none absolute inset-x-4 bottom-20 z-10 mx-auto w-auto max-w-[calc(100vw-2rem)] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:w-[340px] sm:-translate-y-1/2 ${desktopSidePos}`}
    >
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, y: 18, scale: 0.97, x: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 18, scale: 0.97, x: slideFromX }}
            transition={{ duration: 0.55, ease: EASE }}
            className="rounded-2xl border border-white/15 bg-zinc-950/70 p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-6"
          >
            <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-400">
              {milestone.year}
            </p>
            <h3 className="mt-1.5 text-lg font-semibold leading-tight text-zinc-50">
              {milestone.title}
            </h3>
            <p className="mt-2.5 min-h-[4.5em] text-sm leading-relaxed text-zinc-300">
              {displayed}
              {isTyping && (
                <span className="ml-0.5 inline-block h-3.5 w-px translate-y-[2px] animate-pulse bg-zinc-300" />
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProgressDots() {
  const activeIndex = useJourneyStore((s) => s.activeIndex)
  return (
    <motion.div
      className="pointer-events-none absolute right-6 top-6 z-10"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.6, ease: EASE }}
    >
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STAGES }).map((_, i) => {
            const isActive = i === activeIndex
            const isPast = i < activeIndex
            return (
              <motion.span
                key={i}
                className="block rounded-full"
                animate={{
                  width: isActive ? 18 : 6,
                  height: 6,
                  backgroundColor: isActive
                    ? 'rgba(244, 244, 245, 0.95)'
                    : isPast
                      ? 'rgba(244, 244, 245, 0.45)'
                      : 'rgba(244, 244, 245, 0.18)',
                }}
                transition={{ duration: 0.45, ease: EASE }}
              />
            )
          })}
        </div>
        <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-500">
          {String(activeIndex + 1).padStart(2, '0')}
          <span className="mx-1 text-zinc-600">/</span>
          {String(TOTAL_STAGES).padStart(2, '0')}
        </span>
      </div>
    </motion.div>
  )
}

function ControlsHint() {
  const activeIndex = useJourneyStore((s) => s.activeIndex)
  if (activeIndex === TOTAL_STAGES - 1) return null
  return (
    <motion.div
      className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:bottom-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.6, ease: EASE }}
    >
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-2.5 backdrop-blur-md">
        {/* Desktop: arrow-key glyphs. Mobile: tap-to-continue. */}
        <span className="hidden items-center gap-3 sm:flex">
          <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] tracking-wide text-zinc-200">
            &larr;
          </kbd>
          <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] tracking-wide text-zinc-200">
            &rarr;
          </kbd>
          <span className="text-xs tracking-wide text-zinc-400">
            navigate the journey
          </span>
        </span>
        <span className="text-xs tracking-wide text-zinc-300 sm:hidden">
          Tap to continue
          <span aria-hidden className="ml-2 text-zinc-400">
            &rarr;
          </span>
        </span>
      </div>
    </motion.div>
  )
}

function HomeButton() {
  return (
    <motion.div
      className="pointer-events-auto absolute left-6 top-6 z-10"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.0, duration: 0.5, ease: EASE }}
      onClick={(e) => e.stopPropagation()}
    >
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-zinc-100"
      >
        <span aria-hidden>&larr;</span>
        Home
      </Link>
    </motion.div>
  )
}

function EndCTA({ isTyping }: { isTyping: boolean }) {
  const activeIndex = useJourneyStore((s) => s.activeIndex)
  const isTransitioning = useJourneyStore((s) => s.isTransitioning)
  const visible =
    activeIndex === TOTAL_STAGES - 1 && !isTransitioning && !isTyping
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="end-cta"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.45, duration: 0.7, ease: EASE }}
          className="pointer-events-auto absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/12 bg-zinc-950/75 px-3 py-2 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md">
            <span className="ml-2 mr-1 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 sm:inline">
              You&apos;re up to date
            </span>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-4 py-1.5 text-[12px] font-medium text-zinc-950 transition-transform hover:-translate-y-px"
            >
              View projects
              <span aria-hidden>&rarr;</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[12px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.08]"
            >
              Get in touch
            </Link>
            <a
              href="/Chetan_Dasauni_Resume_2026.docx"
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[12px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.08]"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Resume
            </a>
            <Link
              href="/"
              className="ml-1 mr-1 inline-flex items-center gap-1 px-2 py-1 text-[11px] tracking-wide text-zinc-500 transition-colors hover:text-zinc-300"
            >
              &larr; Home
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function JourneyHUD() {
  const milestone = useCurrentMilestone()
  const isTransitioning = useJourneyStore((s) => s.isTransitioning)
  const activeIndex = useJourneyStore((s) => s.activeIndex)

  // Lifted so MilestoneCard and EndCTA share one source of truth — the CTA
  // waits on `isTyping` instead of guessing with a fixed delay.
  const cardVisible = !isTransitioning && activeIndex > 0
  const { displayed, isTyping } = useTypewriter(
    milestone.description,
    26,
    cardVisible
  )

  return (
    <>
      <IntroBubble />
      <MilestoneCard
        milestone={milestone}
        visible={cardVisible}
        displayed={displayed}
        isTyping={isTyping}
      />
      <ProgressDots />
      <HomeButton />
      <ControlsHint />
      <EndCTA isTyping={isTyping} />
    </>
  )
}
