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
    // Wrapper carries a radial gradient that matches the in-canvas `Backdrop`
    // shader (#0b1226 → #04060c, centered 60% / 50%). On cold visits the
    // dynamic chunk + drei `Environment` HDR can take a moment; the Canvas
    // is `background: transparent` and the inner Suspense fallback is null,
    // so without this the user would briefly see flat zinc-950 before the
    // navy backdrop paints. With the gradient, the handoff is invisible.
    <div className="pointer-events-auto absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,#0b1226_0%,#04060c_70%)]">
      <HeroScene isMobile={isMobile} echoConfigs={echoConfigs} />
    </div>
  )
}
