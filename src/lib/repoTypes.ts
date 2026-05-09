/**
 * Shared, framework-neutral types and pure utilities for repo data. Lives
 * apart from `./github.ts` (which is `server-only`) so client components like
 * `RepoList`/`RepoRow` can import them without dragging the server module
 * into the client bundle.
 */

export interface RepoEntry {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  description: string
  language: string // GitHub primary-language label, '' if none
  pushedAt: string // ISO timestamp
}

export function deriveYear(pushedAt: string): string {
  return pushedAt ? pushedAt.slice(0, 4) : ''
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

export function deriveMonthYear(pushedAt: string): string {
  if (!pushedAt) return ''
  const d = new Date(pushedAt)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
