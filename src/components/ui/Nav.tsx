'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
] as const

const SCROLL_THRESHOLD_PX = 40

export default function Nav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hide the chrome inside the immersive journey route — that page owns
  // its entire viewport for the 3D narrative.
  if (pathname === '/journey') return null

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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

      <nav className="flex items-center gap-0.5 rounded-full border border-white/10 bg-zinc-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_-22px_rgba(0,0,0,0.6)] backdrop-blur-md sm:gap-1 sm:p-1.5">
        {LINKS.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative rounded-full px-3 py-1.5 text-[12px] font-medium tracking-wide text-zinc-300 transition-colors hover:text-zinc-50 sm:px-3.5 sm:text-[13px]"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full bg-white/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </motion.header>
  )
}
