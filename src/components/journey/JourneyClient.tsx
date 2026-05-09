'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useJourneyControls } from '@/hooks/useJourneyControls'
import { useJourneyStore } from '@/stores/journeyStore'
import JourneyHUD from './JourneyHUD'
import LoadingScreen from '@/components/ui/LoadingScreen'

const JourneyScene = dynamic(() => import('./JourneyScene'), {
  ssr: false,
  loading: () => null,
})

export default function JourneyClient() {
  useJourneyControls()

  // Always start the experience at stage 0. The store persists across the
  // session, so without this a user who walks the timeline, navigates away,
  // then comes back would land mid-corridor.
  useEffect(() => {
    useJourneyStore.getState().reset()
  }, [])

  return (
    <div
      className="absolute inset-0"
      onClick={() => useJourneyStore.getState().next()}
    >
      <JourneyScene />
      <JourneyHUD />
      <LoadingScreen />
    </div>
  )
}
