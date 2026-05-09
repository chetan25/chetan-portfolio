'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { EchoConfig } from './HeroScene'

const HeroScene = dynamic(() => import('./HeroScene'), {
  ssr: false,
  loading: () => null,
})

export default function HeroClient({
  echoConfigs,
}: {
  echoConfigs?: EchoConfig[]
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return (
    <div className="pointer-events-auto absolute inset-0">
      <HeroScene isMobile={isMobile} echoConfigs={echoConfigs} />
    </div>
  )
}
