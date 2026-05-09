import 'server-only'

import type {
  CorpusDocument,
  RepoReadmeDocument,
  ResumeDocument,
} from './types'

/**
 * Lightweight, dependency-free retrieval for the chat corpus.
 *
 * The full corpus is ~85k input tokens. Sending all of it on every turn means
 * a 5-10s cold-cache penalty on the first request of a session. Instead we
 * always send the (small, high-signal) resume documents and keyword-score
 * the repo READMEs against the user's latest message, sending only top-K.
 *
 * No embeddings, no vector store, no extra deps — this is a focused tool
 * for a personal-portfolio Q&A surface, not a general RAG pipeline. If
 * questions ever need semantic similarity (synonyms, paraphrase), swap this
 * for an embedding-based retriever later.
 */

const REPO_TOP_K = 15

// Stopwords + low-signal question shapes for portfolio Q&A. Anything that's
// repeated across most chats and doesn't actually narrow the document space.
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'do', 'does',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'him', 'his', 'how',
  'in', 'into', 'is', 'it', 'its', 'me', 'of', 'on', 'or', 'she', 'so',
  'than', 'that', 'the', 'their', 'them', 'then', 'they', 'this', 'to',
  'was', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
  'with', 'you', 'your',
  // Question-shape words that don't narrow which document is relevant
  'about', 'any', 'chetan', 'experience', 'know', 'tell', 'show', 'us',
  'use', 'used', 'using', 'work', 'worked', 'works', 'familiar',
])

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Keep alnum + tech-shape characters: + (c++), # (c#), . (next.js), - (in repo names)
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

function scoreDocument(doc: CorpusDocument, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0
  const text = doc.text.toLowerCase()
  let score = 0
  for (const tok of queryTokens) {
    // Word-boundary match — avoids matching "react" inside "reactor".
    const re = new RegExp(
      `(?:^|[^a-z0-9])${escapeRegex(tok)}(?:$|[^a-z0-9])`,
      'g',
    )
    const matches = text.match(re)
    if (!matches) continue
    // Frequency contributes, but cap so one verbose README doesn't dominate
    // every query.
    score += Math.min(matches.length, 6)
    // Coverage bonus — having any match for a token is itself signal.
    score += 4
  }
  return score
}

/**
 * Picks the documents to send for one chat turn. Always returns every resume
 * document plus the top-K repos by lexical relevance to the user's latest
 * message. If fewer than K repos had any match, pads with the most recently
 * pushed repos so the model never sees a near-empty repo set.
 */
export function retrieveDocuments(
  userQuery: string,
  corpus: CorpusDocument[],
): CorpusDocument[] {
  const resumeDocs = corpus.filter(
    (d): d is ResumeDocument => d.kind === 'resume-section',
  )
  const repoDocs = corpus.filter(
    (d): d is RepoReadmeDocument => d.kind === 'repo-readme',
  )

  const tokens = tokenize(userQuery)

  const scored = repoDocs.map((d) => ({
    doc: d,
    score: scoreDocument(d, tokens),
  }))
  scored.sort((a, b) => b.score - a.score)

  const matched = scored
    .filter((s) => s.score > 0)
    .slice(0, REPO_TOP_K)
    .map((s) => s.doc)

  if (matched.length < REPO_TOP_K) {
    const usedIds = new Set(matched.map((d) => d.sourceId))
    const padding = repoDocs
      .filter((d) => !usedIds.has(d.sourceId))
      .sort((a, b) => b.repo.pushedAt.localeCompare(a.repo.pushedAt))
      .slice(0, REPO_TOP_K - matched.length)
    matched.push(...padding)
  }

  return [...resumeDocs, ...matched]
}
