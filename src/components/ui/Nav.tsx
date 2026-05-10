'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
] as const

const SCROLL_THRESHOLD_PX = 40
const PILL_EASE = [0.16, 1, 0.3, 1] as const
const PILL_TRANSITION = { duration: 0.32, ease: PILL_EASE }

export default function Nav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileWrapRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-close after navigation so the next scrolled state collapses cleanly.
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // When user scrolls back to the top the menu is full-width again anyway;
  // reset the toggle so the next downward scroll re-collapses by default.
  useEffect(() => {
    if (!scrolled) setMobileMenuOpen(false)
  }, [scrolled])

  // Tap outside the mobile cluster (or press ESC) dismisses the expanded menu.
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!mobileWrapRef.current) return
      if (!mobileWrapRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileMenuOpen])

  // Move focus to the first link when the menu opens so keyboard users can
  // step through immediately. rAF defers until AnimatePresence has mounted.
  useEffect(() => {
    if (!mobileMenuOpen) return
    const id = requestAnimationFrame(() => {
      mobileMenuRef.current
        ?.querySelector<HTMLAnchorElement>('a')
        ?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [mobileMenuOpen])

  // Hide the chrome inside the immersive journey route — that page owns
  // its entire viewport for the 3D narrative.
  if (pathname === '/journey') return null

  // Mobile renders a compact icon trigger when the user has scrolled and
  // hasn't manually expanded the menu.
  const mobileCollapsed = scrolled && !mobileMenuOpen

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: PILL_EASE }}
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 sm:px-10 sm:py-4"
    >
      <Link
        href="/"
        className="group flex items-center"
        aria-label="Chetan Dasauni — Home"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-zinc-950/60 font-mono text-[12px] font-medium text-zinc-100 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors group-hover:border-white/25 sm:h-8 sm:w-8">
          CD
        </span>
        <span
          aria-hidden={scrolled}
          className={`hidden overflow-hidden whitespace-nowrap transition-[max-width,margin-left,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:inline-block ${
            scrolled ? 'ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-[180px] opacity-100'
          }`}
        >
          <span
            className={`block font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition-[transform,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-zinc-300 motion-reduce:transition-none ${
              scrolled ? '-translate-x-2' : 'translate-x-0'
            }`}
          >
            Chetan Dasauni
          </span>
        </span>
      </Link>

      {/* Desktop: full menu pill, always visible. */}
      <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-zinc-950/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_-22px_rgba(0,0,0,0.6)] backdrop-blur-md sm:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="relative rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-wide text-zinc-300 transition-colors hover:text-zinc-50"
          >
            {isActive(link.href) && (
              <motion.span
                layoutId="nav-active-desktop"
                className="absolute inset-0 rounded-full bg-white/10"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile: swap between collapsed icon trigger and the full pill. */}
      <div ref={mobileWrapRef} className="sm:hidden">
        <AnimatePresence initial={false} mode="wait">
          {mobileCollapsed ? (
            <motion.button
              key="trigger"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={false}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={PILL_TRANSITION}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-zinc-950/60 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_-22px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:border-white/20"
            >
              <svg
                width="14"
                height="10"
                viewBox="0 0 14 10"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 1H13M1 9H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          ) : (
            <motion.nav
              key="menu"
              ref={mobileMenuRef}
              initial={{ opacity: 0, width: 36, scale: 0.95 }}
              animate={{ opacity: 1, width: 'auto', scale: 1 }}
              exit={{ opacity: 0, width: 36, scale: 0.95 }}
              transition={PILL_TRANSITION}
              style={{ originX: 1 }}
              className="flex items-center gap-0.5 overflow-hidden rounded-full border border-white/10 bg-zinc-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_-22px_rgba(0,0,0,0.6)] backdrop-blur-md"
            >
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative rounded-full px-3 py-1.5 text-[12px] font-medium tracking-wide text-zinc-300 transition-colors hover:text-zinc-50"
                >
                  {isActive(link.href) && (
                    <motion.span
                      layoutId="nav-active-mobile"
                      className="absolute inset-0 rounded-full bg-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative whitespace-nowrap">
                    {link.label}
                  </span>
                </Link>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
