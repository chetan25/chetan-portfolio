'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ChatCitation,
  ChatMessage,
  ChatStreamEvent,
} from '@/lib/chat/types'

/**
 * Drives the chat panel: maintains the message list, sends turns to the
 * server-side route handler, and folds streaming SSE events back into
 * message state.
 *
 * No Anthropic SDK or API key on the client — every turn is a single
 * `fetch('/api/chat')` POST. The route handler proxies to Anthropic and
 * returns an SSE stream of `ChatStreamEvent` JSON envelopes.
 */
function makeId(): string {
  // Random enough for a single page session — collisions are not load-bearing.
  return Math.random().toString(36).slice(2, 11)
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Abort the in-flight request when the panel unmounts (e.g. user closes
  // the chat) so the SSE reader doesn't try to setState on a dead component.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  const applyEvent = useCallback(
    (event: ChatStreamEvent, assistantId: string) => {
      if (event.type === 'error') {
        setError(event.message)
        return
      }
      if (event.type === 'done') return

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m
          if (event.type === 'text') {
            return { ...m, content: m.content + event.value }
          }
          // citation
          const existing = m.citations ?? []
          const isNewIndex = !existing.some(
            (c) => c.index === event.citation.index,
          )
          // Always append the inline `[N]` marker so repeated citations of
          // the same source still mark the spot in the text. Only add to
          // the citations list once.
          const nextContent = `${m.content} [${event.citation.index}]`
          const nextCitations: ChatCitation[] = isNewIndex
            ? [...existing, event.citation]
            : existing
          return { ...m, content: nextContent, citations: nextCitations }
        }),
      )
    },
    [],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      setError(null)
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: trimmed,
      }
      const assistantId = makeId()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        citations: [],
      }

      // Build the history we'll send: prior messages + this new user turn.
      // The route handler validates: starts and ends with user, max 20 turns.
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)

      const ac = new AbortController()
      abortRef.current = ac

      try {
        let res: Response
        try {
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
            signal: ac.signal,
          })
        } catch (networkErr) {
          if (ac.signal.aborted) return
          throw new Error(
            "Couldn't reach Atlas. Check your connection and try again.",
            { cause: networkErr },
          )
        }

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          // The route handler returns user-friendly prose for every status;
          // fall back to a generic line only if the body is empty (proxy
          // strips body, etc.).
          throw new Error(
            body.trim() ||
              "Atlas is having trouble right now. Please try again shortly.",
          )
        }
        if (!res.body) {
          throw new Error("Atlas didn't return a response. Please try again.")
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // SSE events are delimited by a blank line (`\n\n`).
          let idx: number
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            const dataLine = raw
              .split('\n')
              .find((l) => l.startsWith('data:'))
            if (!dataLine) continue
            const json = dataLine.slice(5).trim()
            if (!json) continue
            try {
              const event = JSON.parse(json) as ChatStreamEvent
              applyEvent(event, assistantId)
            } catch {
              // ignore malformed events
            }
          }
        }
      } catch (err) {
        if (ac.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [applyEvent, isStreaming, messages],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setError(null)
    setIsStreaming(false)
  }, [])

  return { messages, isStreaming, error, sendMessage, stop, clear }
}
