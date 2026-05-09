'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AGENT_NAME, AGENT_TAGLINE } from '@/lib/chat/agent'
import BotAvatar from './BotAvatar'
import ChatMessage from './ChatMessage'
import { useChatStream } from './useChatStream'

const EASE = [0.16, 1, 0.3, 1] as const

const SUGGESTED_PROMPTS = [
  'What was Chetan’s impact at Intuit?',
  'Which repos use React Three Fiber?',
  'What does his AI-assisted dev workflow look like?',
  'When did he move from AngularJS to React?',
] as const

type Props = {
  onClose: () => void
}

export default function ChatPanel({ onClose }: Props) {
  const { messages, isStreaming, error, sendMessage, stop } = useChatStream()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new content during streaming.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  // Lock body scroll while panel is open on mobile (where it's a full sheet).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Auto-grow textarea up to a cap.
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [input])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    void sendMessage(text)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <motion.div
      key="chat-panel"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col border border-white/10 bg-zinc-950/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:inset-x-auto sm:inset-y-auto sm:bottom-6 sm:right-6 sm:top-20 sm:w-[440px] sm:rounded-2xl"
      role="dialog"
      aria-label={`${AGENT_NAME} chat`}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
        <BotAvatar size={36} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-zinc-50">
            {AGENT_NAME}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {AGENT_TAGLINE}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="m3 3 8 8M11 3l-8 8" />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {isEmpty ? (
          <EmptyState onPick={(text) => void sendMessage(text)} />
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1
              const streamingThisOne =
                isStreaming && isLast && m.role === 'assistant'
              return (
                <li key={m.id}>
                  <ChatMessage message={m} streaming={streamingThisOne} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-t border-amber-500/20 bg-amber-500/[0.06] px-4 py-2 text-[12px] text-amber-200/90">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="border-t border-white/10 px-3 py-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.05]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask ${AGENT_NAME} about Chetan’s work…`}
            rows={1}
            maxLength={4000}
            className="min-h-[24px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-zinc-200 transition-colors hover:bg-white/[0.1]"
            >
              <span className="h-2.5 w-2.5 rounded-sm bg-zinc-200" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-zinc-950 transition-transform disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:-translate-y-px"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 12V2M3 6l4-4 4 4" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          {AGENT_NAME} only answers questions about Chetan’s work.
        </p>
      </form>
    </motion.div>
  )
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-start gap-5 px-5 py-8 sm:px-6 sm:py-10">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          Ask {AGENT_NAME}
        </p>
        <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-zinc-300">
          Questions about Chetan&apos;s career, tech stack, projects, or
          education. Answers are grounded in his resume and public repos —
          every claim is cited.
        </p>
      </div>
      <ul className="flex flex-col gap-1.5 self-stretch">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="group w-full rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-50"
            >
              <span className="mr-2 font-mono text-[11px] text-zinc-600 transition-colors group-hover:text-zinc-400">
                &rarr;
              </span>
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
