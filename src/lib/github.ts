import 'server-only'
import { GITHUB_USERNAME } from './projectsConfig'
import type { RepoEntry } from './repoTypes'

export type { RepoEntry } from './repoTypes'
export { deriveYear } from './repoTypes'

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
}

const REVALIDATE_SECONDS = 3600

const REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=pushed&type=owner`

async function fetchRepoList(): Promise<GitHubRepo[]> {
  const res = await fetch(REPOS_URL, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) {
    throw new Error(`GitHub repos API ${res.status}`)
  }
  return (await res.json()) as GitHubRepo[]
}

function compareEntriesDescending(a: RepoEntry, b: RepoEntry): number {
  if (a.pushedAt > b.pushedAt) return -1
  if (a.pushedAt < b.pushedAt) return 1
  return 0
}

function toEntry(repo: GitHubRepo): RepoEntry {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: (repo.description ?? '').trim(),
    language: (repo.language ?? '').trim(),
    pushedAt: repo.pushed_at,
  }
}

/**
 * Fetches every public, non-fork, non-archived, non-empty repository owned
 * by the configured GitHub user. Sorted by `pushed_at` descending.
 *
 * Note: throws on GitHub API failure — callers must catch. The /projects
 * page handles this in its <Suspense>/error boundary.
 */
export async function getRepos(): Promise<RepoEntry[]> {
  const repos = await fetchRepoList()
  return repos
    .filter((r) => !r.fork && !r.archived && r.size > 0)
    .map(toEntry)
    .sort(compareEntriesDescending)
}
