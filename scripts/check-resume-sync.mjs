/**
 * Pre-commit gate: if a resume `.docx` is staged but `src/data/resume.json`
 * isn't, block the commit and prompt for `pnpm sync:resume`. Plain Node so
 * husky can run it without a TS toolchain.
 */
import { execFileSync } from 'node:child_process'

const RESUME_JSON = 'src/data/resume.json'

let staged
try {
  staged = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    { encoding: 'utf-8' },
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
} catch {
  // Not a git repo or git unavailable — skip silently.
  process.exit(0)
}

const docxStaged = staged.some(
  (file) => /resume/i.test(file) && file.toLowerCase().endsWith('.docx'),
)
const jsonStaged = staged.includes(RESUME_JSON)

if (docxStaged && !jsonStaged) {
  console.error('')
  console.error(
    '  Resume .docx is staged but src/data/resume.json is not.',
  )
  console.error(
    '  These need to stay in sync — the JSON drives /resume rendering',
  )
  console.error("  and the chat citation corpus.")
  console.error('')
  console.error('  Run:')
  console.error('      pnpm sync:resume')
  console.error('')
  console.error("  Then `git add src/data/resume.json` and commit again.")
  console.error('')
  process.exit(1)
}
