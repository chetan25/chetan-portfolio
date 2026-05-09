'use client'

import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AGENT_NAME } from '@/lib/chat/agent'
import BotAvatar from './BotAvatar'

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false })

const EASE = [0.16, 1, 0.3, 1] as const

export default function ChatLauncher() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // /journey owns the full viewport for its 3D narrative — same exclusion
  // as the Nav. Visitors can still reach Atlas from any other route.
  if (pathname === '/journey') return null

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.4, ease: EASE }}
            aria-label={`Ask ${AGENT_NAME}`}
            className="group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-zinc-950/85 py-1.5 pl-1.5 pr-4 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md transition-colors hover:bg-zinc-900/95 sm:bottom-6 sm:right-6"
          >
            <BotAvatar size={32} />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[12px] font-medium text-zinc-100 transition-colors group-hover:text-white">
                Ask {AGENT_NAME}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
                about Chetan
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && <ChatPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
