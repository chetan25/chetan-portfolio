'use server'

import { cookies } from 'next/headers'
import { incrementResumeVisits } from '@/lib/visitCounter'

const COOKIE_NAME = 'rsvc'
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365 // 1 year

/**
 * Records a resume visit, deduplicated per browser via a long-lived cookie.
 * Safe to call repeatedly — cookie short-circuits the increment after the
 * first success. Failures are swallowed so the page never breaks on a
 * counter outage.
 */
export async function recordResumeVisit(): Promise<void> {
  const cookieStore = await cookies()
  if (cookieStore.get(COOKIE_NAME)) return

  cookieStore.set(COOKIE_NAME, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_S,
    path: '/resume',
  })

  await incrementResumeVisits()
}
