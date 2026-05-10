'use client'

import { useEffect } from 'react'
import { recordResumeVisit } from './actions'

/**
 * Fire-and-forget visit recorder. Renders nothing — exists purely so the
 * Server Action runs from the client (Server Components can't write cookies
 * during render, and we want the cookie-based dedup to live with the
 * counter). Failures are swallowed in the action; nothing to surface here.
 */
export default function RecordVisit() {
  useEffect(() => {
    recordResumeVisit().catch(() => {})
  }, [])
  return null
}
