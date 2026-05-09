'use client'

import { useEffect } from 'react'
import { useJourneyStore } from '@/stores/journeyStore'

export function useJourneyControls() {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        useJourneyStore.getState().next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        useJourneyStore.getState().prev()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
}
