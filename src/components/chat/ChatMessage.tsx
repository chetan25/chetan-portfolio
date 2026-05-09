'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage as ChatMessageType } from '@/lib/chat/types'
import BotAvatar from './BotAvatar'
import UserAvatar from './UserAvatar'
import CitationRepoCard from './CitationRepoCard'
import CitationResumeCard from './CitationResumeCard'

type Props = {
  message: ChatMessageType
  /** True while this is the assistant turn currently streaming. */
  streaming?: boolean
}

export default function ChatMessage({ message, streaming = false }: Props) {
  const isUser = message.role === 'user'
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="mt-0.5">
        {isUser ? <UserAvatar size={28} /> : <BotAvatar size={28} />}
      </div>
      <div className="min-w-0 flex-1">
        {isUser ? (
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-200">
            {message.content}
          </p>
        ) : (
          <AssistantBody content={message.content} streaming={streaming} />
        )}

        {message.citations && message.citations.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Sources
            </p>
            <ul className="mt-2 space-y-2">
              {message.citations.map((c) => (
                <li key={c.index} className="flex gap-2.5">
                  <span className="mt-2 shrink-0 font-mono text-[10px] tracking-wide text-zinc-500">
                    [{c.index}]
                  </span>
                  <div className="min-w-0 flex-1">
                    {c.source.kind === 'resume-section' ? (
                      <CitationResumeCard
                        source={c.source}
                        citedText={c.citedText}
                      />
                    ) : (
                      <CitationRepoCard source={c.source} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantBody({
  content,
  streaming,
}: {
  content: string
  streaming: boolean
}) {
  if (!content && streaming) {
    return (
      <p className="flex items-center gap-1.5 text-[13px] text-zinc-500">
        <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
        <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:120ms]" />
        <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:240ms]" />
      </p>
    )
  }
  return (
    <div className="text-[14px] leading-relaxed text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-50">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-zinc-100">
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-100 underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/60"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
