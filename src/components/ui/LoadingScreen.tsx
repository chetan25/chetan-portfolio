'use client'

import { useProgress } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

export default function LoadingScreen() {
  const { progress, total, active } = useProgress()
  const [done, setDone] = useState(false)
  const seenLoadRef = useRef(false)

  useEffect(() => {
    if (total > 0) seenLoadRef.current = true
  }, [total])

  useEffect(() => {
    if (!seenLoadRef.current) return
    if (active) return
    if (progress < 100) return
    const t = setTimeout(() => setDone(true), 450)
    return () => clearTimeout(t)
  }, [active, progress])

  // Indeterminate min width so the bar never looks frozen at 0% during the
  // initial JS-chunk fetch before any THREE assets register with the loader.
  const displayedProgress = seenLoadRef.current
    ? progress
    : Math.max(progress, 4)

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="pointer-events-auto absolute inset-0 z-50 flex items-end bg-zinc-950 px-8 pb-12 sm:px-16 sm:pb-20"
        >
          {/* Subtle vertical accent line — anchors the asymmetric layout */}
          <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          <div className="relative w-full max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500"
            >
              Loading the journey
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.7, ease: EASE }}
              className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tight text-zinc-50 sm:text-6xl"
            >
              Chetan Dasauni
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.7, ease: EASE }}
              className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base"
            >
              Senior Software Developer. An interactive walk from India to
              Canada — every chapter that shaped a career.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.6, ease: EASE }}
              className="mt-10 flex items-center gap-5"
            >
              <div className="relative h-px w-48 overflow-hidden bg-white/10 sm:w-72">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-zinc-100"
                  animate={{ width: `${displayedProgress}%` }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
              <span className="font-mono text-[11px] tracking-[0.18em] text-zinc-500">
                {String(Math.round(progress)).padStart(2, '0')}%
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
