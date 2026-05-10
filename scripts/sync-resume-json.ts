/**
 * sync-resume-json
 *
 * Manual command — run when you've replaced the resume `.docx` and need to
 * propagate the changes into `src/data/resume.json` (which drives the
 * `/resume` page and the chatbot's citation corpus).
 *
 * Pipeline:
 *   1. Read the .docx → extract raw text via `mammoth`.
 *   2. Read the existing `resume.json` (so Claude can preserve stable IDs
 *      that are used as DOM anchors and chat-citation keys).
 *   3. Ask Claude (Sonnet 4.6, matching `src/app/api/chat/route.ts`) to
 *      reshape the text into the strict `Resume` schema.
 *   4. Validate basic structure and write back.
 *
 * Run: `pnpm sync:resume`
 *
 * Requires `ANTHROPIC_API_KEY` in `.env.local` (same env var the chat uses).
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mammoth from 'mammoth'
import Anthropic from '@anthropic-ai/sdk'
import type { Resume } from '../src/types/resume'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const DOCX_PATH = resolve(
  PROJECT_ROOT,
  'public/Chetan_Dasauni_Resume_2026.docx'
)
const JSON_PATH = resolve(PROJECT_ROOT, 'src/data/resume.json')

const SYSTEM_PROMPT = `You convert a resume's markdown into a strict JSON document matching a TypeScript schema. Output ONLY valid JSON — no commentary, no code fences, no preamble.

Schema:
type Resume = {
  meta: {
    name: string
    title: string
    location: string
    email: string
    githubUrl: string
    linkedinUrl: string
    docxHref: string
  }
  summary: string
  experience: Array<{
    id: string
    company: string
    role: string
    location: string
    start: string  // ISO month or year, e.g. '2025-04' or '2025'
    end: string    // same format as 'start', or the literal string 'Present'
    summary?: string  // optional one-line headline shown above the bullets
    bullets: string[]
    tech?: string[]   // tech stack tags
  }>
  education: Array<{
    id: string
    school: string
    credential: string
    location?: string
    start: string
    end: string
    notes?: string
  }>
  skills: Array<{
    id: string  // kebab-case scoped, e.g. 'skills-frontend'
    label: string
    items: string[]
  }>
}

Rules:
- Preserve every existing 'id' from the previous JSON when the corresponding entry still exists. Only invent new IDs for entries that are genuinely new.
- ID convention: kebab-case scoped names — 'experience-<company-slug>', 'education-<school-slug>', 'skills-<group>'.
- Keep meta.docxHref pointing at the same value as the previous JSON.
- Use the same date format as the previous JSON.
- Bullets should be full prose sentences from the resume, preserved verbatim where possible.
- Output JSON only.`

function isTextBlock(b: { type: string }): b is { type: 'text'; text: string } {
  return b.type === 'text'
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error(
      'Error: ANTHROPIC_API_KEY is not set. Add it to .env.local and re-run.'
    )
    process.exit(1)
  }

  console.log('· Reading .docx ...')
  const docxBuffer = readFileSync(DOCX_PATH)
  const { value: rawText } = await mammoth.extractRawText({
    buffer: docxBuffer,
  })
  if (!rawText.trim()) {
    console.error('Error: .docx parsed to empty text.')
    process.exit(1)
  }

  console.log('· Reading existing resume.json (for ID preservation) ...')
  const previousJson = JSON.parse(readFileSync(JSON_PATH, 'utf-8')) as Resume

  console.log('· Calling Claude (claude-sonnet-4-6) ...')
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Previous JSON (preserve IDs that still apply):\n\n${JSON.stringify(
          previousJson,
          null,
          2
        )}\n\n---\n\nResume text (extracted from .docx):\n\n${rawText}\n\n---\n\nReturn the updated JSON now. Output ONLY JSON.`,
      },
    ],
  })

  let extracted = ''
  for (const block of response.content) {
    if (isTextBlock(block)) extracted += block.text
  }
  extracted = extracted.trim()
  // Defensive — strip code fences if Claude adds them despite instructions.
  const jsonStr = extracted
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  let parsed: Resume
  try {
    parsed = JSON.parse(jsonStr) as Resume
  } catch {
    console.error('Error: Claude returned invalid JSON. Raw response:\n')
    console.error(extracted)
    process.exit(1)
  }

  // Basic shape validation — catches hallucinated structures before they ship.
  const missing: string[] = []
  if (!parsed.meta) missing.push('meta')
  if (typeof parsed.summary !== 'string') missing.push('summary')
  if (!Array.isArray(parsed.experience)) missing.push('experience')
  if (!Array.isArray(parsed.education)) missing.push('education')
  if (!Array.isArray(parsed.skills)) missing.push('skills')
  if (missing.length > 0) {
    console.error(
      `Error: returned JSON is missing required fields: ${missing.join(', ')}`
    )
    process.exit(1)
  }

  console.log('· Writing src/data/resume.json ...')
  writeFileSync(JSON_PATH, JSON.stringify(parsed, null, 2) + '\n')

  console.log('\nResume JSON synced.')
  console.log(
    "Review with `git diff src/data/resume.json` before committing."
  )
}

main().catch((err) => {
  console.error('sync:resume failed:', err)
  process.exit(1)
})
