/**
 * Single source of truth for the resume page and the chatbot's citation
 * corpus. Each entry's `id` doubles as:
 *   - The DOM anchor on /resume (e.g. <section id="experience-scribd">)
 *   - The citation source key returned by the Anthropic Citations API
 *
 * Convention: kebab-case scoped names — `experience-<company>`,
 * `education-<school>`, `skills-<group>`.
 */

export type Resume = {
  meta: ResumeMeta
  summary: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: SkillGroup[]
}

export type ResumeMeta = {
  name: string
  title: string
  location: string
  email: string
  githubUrl: string
  linkedinUrl: string
  docxHref: string
}

export type ExperienceEntry = {
  id: string
  company: string
  role: string
  location: string
  /** ISO month or year, e.g. '2025-04' or '2025'. */
  start: string
  /** Same format as `start`, or the literal string 'Present'. */
  end: string
  /** Optional one-line headline shown above the bullets. */
  summary?: string
  bullets: string[]
  /** Tech stack tags shown as small mono pills under the role line. */
  tech?: string[]
}

export type EducationEntry = {
  id: string
  school: string
  credential: string
  location?: string
  start: string
  end: string
  notes?: string
}

export type SkillGroup = {
  id: string
  label: string
  items: string[]
}
