import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/chat/systemPrompt'
import { getCorpus, toCitationSource } from '@/lib/chat/loadCorpus'
import { retrieveDocuments } from '@/lib/chat/retrieve'
import type {
  ChatCitation,
  ChatStreamEvent,
  CorpusDocument,
} from '@/lib/chat/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// ---------- Rate limiter ----------
// In-memory token bucket per IP. Resets on cold start, which is fine for
// portfolio scale — Vercel's serverless runtime keeps instances warm just
// long enough to deter casual abuse without persisting state.
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (b.count >= RATE_LIMIT) return false
  b.count += 1
  return true
}

function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

// ---------- Request validation ----------
type ClientMessage = { role: 'user' | 'assistant'; content: string }

const MAX_TURNS = 20
const MAX_MESSAGE_CHARS = 4000

type ValidateResult =
  | { ok: true; value: ClientMessage[] }
  | { ok: false; reason: string }

function validateMessages(raw: unknown): ValidateResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, reason: 'Send a question for Atlas to answer.' }
  }
  if (raw.length > MAX_TURNS) {
    return {
      ok: false,
      reason: `This chat has gone on for a while (${MAX_TURNS}-turn limit). Start a fresh chat to keep going.`,
    }
  }
  const out: ClientMessage[] = []
  for (const m of raw) {
    if (typeof m !== 'object' || m === null) {
      return { ok: false, reason: "Atlas couldn't read the chat history." }
    }
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (role !== 'user' && role !== 'assistant') {
      return { ok: false, reason: "Atlas couldn't read the chat history." }
    }
    if (typeof content !== 'string') {
      return { ok: false, reason: "Atlas couldn't read the chat history." }
    }
    if (content.length === 0) {
      return { ok: false, reason: 'Type a question for Atlas before sending.' }
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        reason: `That message is too long (${MAX_MESSAGE_CHARS}-character limit). Try a shorter question.`,
      }
    }
    out.push({ role, content })
  }
  // Conversation must start and end with a user message — model expects
  // user→assistant alternation with a trailing user turn driving the response.
  if (out[0]!.role !== 'user' || out[out.length - 1]!.role !== 'user') {
    return { ok: false, reason: "Atlas couldn't read the chat history." }
  }
  return { ok: true, value: out }
}

// ---------- Friendly error mapping ----------
// Translates any thrown error into something safe to show a visitor. The raw
// error is logged server-side for debugging.
function friendlyErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 401 || err.status === 403) {
      return 'Atlas is temporarily unavailable. Please try again later.'
    }
    if (err.status === 429) {
      return 'Atlas is in high demand right now — try again in a few seconds.'
    }
    if (err.status && err.status >= 500) {
      return 'Atlas is having trouble reaching its source. Please try again shortly.'
    }
    return 'Atlas ran into a problem answering that. Please try again.'
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return 'Cancelled.'
  }
  return "Something went wrong on Atlas's end. Please try again."
}

// ---------- Document blocks for the Anthropic Citations API ----------
// Documents are passed on the FIRST user turn only. The model retains them
// in context across the conversation; subsequent user turns are text-only.
// We send a per-turn-retrieved subset (always-on resume + top-K repos by
// lexical relevance to the latest user message) so the cold-cache cost on
// the first response stays low. `cache_control: ephemeral` on the last
// document still marks the prefix cacheable for the rare case where two
// follow-up queries select the same document set.
function buildDocumentBlocks(
  docs: CorpusDocument[],
): Anthropic.DocumentBlockParam[] {
  const blocks: Anthropic.DocumentBlockParam[] = docs.map((doc) => ({
    type: 'document',
    source: {
      type: 'text',
      media_type: 'text/plain',
      data: doc.text,
    },
    title: doc.title,
    citations: { enabled: true },
  }))
  if (blocks.length > 0) {
    blocks[blocks.length - 1] = {
      ...blocks[blocks.length - 1]!,
      cache_control: { type: 'ephemeral' },
    }
  }
  return blocks
}

function buildAnthropicMessages(
  client: ClientMessage[],
  documentBlocks: Anthropic.DocumentBlockParam[],
): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = []
  let firstUserSeen = false
  for (const m of client) {
    if (m.role === 'user') {
      if (!firstUserSeen) {
        out.push({
          role: 'user',
          content: [
            ...documentBlocks,
            { type: 'text', text: m.content },
          ],
        })
        firstUserSeen = true
      } else {
        out.push({ role: 'user', content: m.content })
      }
    } else {
      out.push({ role: 'assistant', content: m.content })
    }
  }
  return out
}

// ---------- Route handler ----------
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[chat] ANTHROPIC_API_KEY is not set')
    return new Response(
      'Atlas is temporarily unavailable. Please try again later.',
      { status: 503 },
    )
  }

  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return new Response(
      'Atlas is taking a quick break — try again in a minute.',
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response("Atlas couldn't read that request. Try again.", {
      status: 400,
    })
  }
  const validation = validateMessages(
    (body as { messages?: unknown }).messages,
  )
  if (!validation.ok) {
    return new Response(validation.reason, { status: 400 })
  }
  const messages = validation.value

  const corpus = getCorpus()
  // Retrieve against the user's latest message — the freshest signal for
  // which repos to include. Resume documents are always returned by
  // `retrieveDocuments` regardless of the query.
  const latestUser = messages[messages.length - 1]!.content
  const retrievedDocs = retrieveDocuments(latestUser, corpus.documents)
  const documentBlocks = buildDocumentBlocks(retrievedDocs)
  const anthropicMessages = buildAnthropicMessages(messages, documentBlocks)

  const client = new Anthropic({ apiKey })
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        )
      }

      try {
        const response = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: anthropicMessages,
        })

        // Citation indexing: same source = same `[N]` across the message.
        const sourceToIndex = new Map<string, number>()
        let nextIndex = 1

        for await (const event of response) {
          if (event.type !== 'content_block_delta') continue

          const delta = event.delta
          if (delta.type === 'text_delta') {
            send({ type: 'text', value: delta.text })
            continue
          }

          if (delta.type === 'citations_delta') {
            const citation = delta.citation
            // The union also covers web_search and search_result citations
            // (other tools); we only want document citations from our corpus.
            if (
              citation.type !== 'char_location' &&
              citation.type !== 'page_location' &&
              citation.type !== 'content_block_location'
            ) {
              continue
            }
            const docIdx = citation.document_index
            const doc = retrievedDocs[docIdx]
            if (!doc) continue

            let index = sourceToIndex.get(doc.sourceId)
            if (index === undefined) {
              index = nextIndex++
              sourceToIndex.set(doc.sourceId, index)
            }

            const chatCitation: ChatCitation = {
              index,
              sourceId: doc.sourceId,
              citedText: citation.cited_text,
              source: toCitationSource(doc),
            }
            send({ type: 'citation', citation: chatCitation })
          }
        }

        send({ type: 'done' })
      } catch (err) {
        console.error('[chat] upstream error:', err)
        send({ type: 'error', message: friendlyErrorMessage(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
