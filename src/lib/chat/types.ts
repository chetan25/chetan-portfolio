/**
 * Shared types for the chatbot — the citation corpus, message envelope, the
 * SSE wire protocol, and the citation cards. Used by:
 *   - `scripts/build-chat-context.ts` (writes corpus.json)
 *   - `src/app/api/chat/route.ts` (loads corpus, talks to Anthropic, emits SSE)
 *   - `src/components/chat/*` (consumes SSE, renders messages + citation cards)
 */

// ---------- Corpus (server only — full text bundled at build time) ----------

export type CorpusDocument = ResumeDocument | RepoReadmeDocument

export type ResumeDocument = {
  sourceId: string
  kind: 'resume-section'
  title: string
  text: string
  /** Section anchor on /resume — pairs with the `id` attribute on the page. */
  resumeAnchor: string
  section: 'summary' | 'experience' | 'education' | 'skills'
}

export type RepoReadmeDocument = {
  sourceId: string
  kind: 'repo-readme'
  title: string
  text: string
  repo: {
    fullName: string
    htmlUrl: string
    description: string
    language: string
    /** ISO timestamp of last push. */
    pushedAt: string
  }
}

export type Corpus = {
  generatedAt: string
  documents: CorpusDocument[]
}

// ---------- Citation source (client-safe — no `text` field) ----------

/**
 * Subset of a CorpusDocument's metadata that's safe to send to the client
 * for rendering citation cards. The full document `text` stays server-side.
 */
export type CitationSource = ResumeCitationSource | RepoCitationSource

export type ResumeCitationSource = {
  kind: 'resume-section'
  title: string
  resumeAnchor: string
  section: 'summary' | 'experience' | 'education' | 'skills'
}

export type RepoCitationSource = {
  kind: 'repo-readme'
  title: string
  repo: {
    fullName: string
    htmlUrl: string
    description: string
    language: string
    pushedAt: string
  }
}

// ---------- Messages ----------

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  /** Citations attached to this message — only populated on assistant turns. */
  citations?: ChatCitation[]
}

/**
 * One citation reference emitted by the assistant. Carries everything the
 * client needs to render either a resume or repo card without hitting the
 * server again.
 */
export type ChatCitation = {
  /** Stable id (1, 2, 3 …) used to render the inline marker `[1]`. */
  index: number
  /** Stable source identifier — same for repeated citations of one document. */
  sourceId: string
  /** The substring of the source document the model is quoting. */
  citedText: string
  source: CitationSource
}

// ---------- SSE wire protocol (server -> client) ----------

/**
 * Each event is JSON-encoded on a `data:` SSE line. The client hook parses
 * these in arrival order: `text` events append to the message body, and
 * `citation` events render a `[N]` marker at the current cursor position
 * (citations arrive immediately after the text run they reference).
 */
export type ChatStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'citation'; citation: ChatCitation }
  | { type: 'done' }
  | { type: 'error'; message: string }
