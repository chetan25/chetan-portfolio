/**
 * Build-time chat context assembler.
 *
 * Reads `src/data/resume.json` + fetches public GitHub repos owned by the
 * configured user + downloads each repo's README, then writes a single
 * typed `src/lib/chat/corpus.json` consumed at request time by the chat
 * API route.
 *
 * Run via:   pnpm build:chat-context
 *
 * Auth: pass `GITHUB_TOKEN=<token>` in env to lift the rate limit from 60/hr
 * (unauthenticated) to 5000/hr. Optional — works without a token for small
 * portfolios, but a token is strongly recommended for CI.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Resume } from '../src/types/resume'
import type {
  Corpus,
  CorpusDocument,
  RepoReadmeDocument,
  ResumeDocument,
} from '../src/lib/chat/types'

// Resolve project root from this script's location so the script works
// regardless of cwd at invocation time.
const __filename = fileURLToPath(import.meta.url)
const PROJECT_ROOT = resolve(dirname(__filename), '..')
const RESUME_PATH = resolve(PROJECT_ROOT, 'src/data/resume.json')
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'src/lib/chat/corpus.json')

// Mirrors `GITHUB_USERNAME` from `src/lib/projectsConfig.ts`. We can't import
// that file here because it's part of the Next runtime tree; duplicating one
// constant is cheaper than wiring up project resolution.
const GITHUB_USERNAME = 'chetan25'

const REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=pushed&type=owner`

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  pushed_at: string
  fork: boolean
  archived: boolean
  size: number
  topics?: string[]
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'immersive-portfolio-chat-context-builder',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function fetchRepoList(): Promise<GitHubRepo[]> {
  const res = await fetch(REPOS_URL, { headers: authHeaders() })
  if (!res.ok) {
    throw new Error(
      `GitHub repos API returned ${res.status} ${res.statusText}`,
    )
  }
  return (await res.json()) as GitHubRepo[]
}

/**
 * Pulls the rendered README for a repo. Returns null on 404 (some repos
 * legitimately don't have one) so we silently skip them. Other errors throw —
 * a flaky GitHub response shouldn't quietly poison the corpus.
 */
async function fetchReadme(fullName: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${fullName}/readme`,
    {
      headers: { ...authHeaders(), Accept: 'application/vnd.github.raw' },
    },
  )
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(
      `GitHub README API for ${fullName}: ${res.status} ${res.statusText}`,
    )
  }
  return await res.text()
}

function formatRange(start: string, end: string): string {
  if (end === 'Present') return `${start} — Present`
  if (start === end) return start
  return `${start} — ${end}`
}

function resumeToDocuments(resume: Resume): ResumeDocument[] {
  const docs: ResumeDocument[] = []

  // Summary
  docs.push({
    sourceId: 'resume-summary',
    kind: 'resume-section',
    title: 'Resume — Summary',
    text: resume.summary,
    resumeAnchor: 'summary',
    section: 'summary',
  })

  // Experience
  for (const entry of resume.experience) {
    const lines: string[] = []
    lines.push(
      `${entry.role} — ${entry.company}, ${entry.location} (${formatRange(entry.start, entry.end)}).`,
    )
    if (entry.summary) lines.push('', entry.summary)
    if (entry.bullets.length > 0) {
      lines.push('')
      for (const b of entry.bullets) lines.push(`- ${b}`)
    }
    if (entry.tech && entry.tech.length > 0) {
      lines.push('', `Tech: ${entry.tech.join(', ')}.`)
    }
    docs.push({
      sourceId: `resume-${entry.id}`,
      kind: 'resume-section',
      title: `${entry.role} — ${entry.company}`,
      text: lines.join('\n'),
      resumeAnchor: entry.id,
      section: 'experience',
    })
  }

  // Education
  for (const entry of resume.education) {
    const lines: string[] = []
    lines.push(
      `${entry.credential} — ${entry.school}${entry.location ? `, ${entry.location}` : ''} (${formatRange(entry.start, entry.end)}).`,
    )
    if (entry.notes) lines.push('', entry.notes)
    docs.push({
      sourceId: `resume-${entry.id}`,
      kind: 'resume-section',
      title: `${entry.credential} — ${entry.school}`,
      text: lines.join('\n'),
      resumeAnchor: entry.id,
      section: 'education',
    })
  }

  // Skills (one doc per group keeps citations focused)
  for (const group of resume.skills) {
    docs.push({
      sourceId: `resume-${group.id}`,
      kind: 'resume-section',
      title: `Skills — ${group.label}`,
      text: `${group.label}: ${group.items.join(', ')}.`,
      resumeAnchor: group.id,
      section: 'skills',
    })
  }

  return docs
}

function repoToDocument(
  repo: GitHubRepo,
  readme: string,
): RepoReadmeDocument {
  // Prepend a structured header so primary language, description, topics, and
  // last-pushed date are part of the model's citable text — the README alone
  // often misses (or buries) the canonical stack signal that GitHub already
  // detects.
  const headerLines: string[] = [`Repository: ${repo.full_name}`]
  if (repo.language) headerLines.push(`Primary language: ${repo.language}`)
  if (repo.topics && repo.topics.length > 0) {
    headerLines.push(`Topics: ${repo.topics.join(', ')}`)
  }
  if (repo.description) headerLines.push(`Description: ${repo.description}`)
  headerLines.push(`Last pushed: ${repo.pushed_at.slice(0, 10)}`)

  const text = `${headerLines.join('\n')}\n\n---\n\n${readme}`

  return {
    sourceId: `repo-${repo.full_name.replace('/', '-')}`,
    kind: 'repo-readme',
    title: repo.name,
    text,
    repo: {
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      description: (repo.description ?? '').trim(),
      language: (repo.language ?? '').trim(),
      pushedAt: repo.pushed_at,
    },
  }
}

async function main() {
  console.log('[chat-context] reading resume…')
  const resumeRaw = await readFile(RESUME_PATH, 'utf-8')
  const resume = JSON.parse(resumeRaw) as Resume

  console.log('[chat-context] fetching repo list…')
  const reposRaw = await fetchRepoList()
  const repos = reposRaw.filter(
    (r) => !r.fork && !r.archived && r.size > 0,
  )
  console.log(`[chat-context] ${repos.length} eligible repos`)

  // Pull READMEs in parallel — GitHub is fine with this at portfolio scale.
  const readmeResults = await Promise.all(
    repos.map(async (repo) => {
      try {
        const readme = await fetchReadme(repo.full_name)
        return { repo, readme }
      } catch (err) {
        console.warn(
          `[chat-context] README fetch failed for ${repo.full_name}:`,
          (err as Error).message,
        )
        return { repo, readme: null }
      }
    }),
  )

  const repoDocs: RepoReadmeDocument[] = []
  let skipped = 0
  for (const { repo, readme } of readmeResults) {
    if (!readme || readme.trim().length === 0) {
      skipped += 1
      continue
    }
    repoDocs.push(repoToDocument(repo, readme))
  }
  console.log(
    `[chat-context] ${repoDocs.length} repo READMEs included, ${skipped} skipped`,
  )

  const documents: CorpusDocument[] = [
    ...resumeToDocuments(resume),
    ...repoDocs,
  ]

  const corpus: Corpus = {
    generatedAt: new Date().toISOString(),
    documents,
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, JSON.stringify(corpus, null, 2), 'utf-8')

  const totalChars = documents.reduce((acc, d) => acc + d.text.length, 0)
  console.log(
    `[chat-context] wrote ${documents.length} documents (${totalChars.toLocaleString()} chars) → ${OUTPUT_PATH.replace(PROJECT_ROOT, '.')}`,
  )
}

main().catch((err) => {
  console.error('[chat-context] failed:', err)
  process.exit(1)
})
