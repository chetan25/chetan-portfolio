import { Suspense } from 'react'
import HeroRouter from '@/components/hero/HeroRouter'

// Title intentionally omitted so the layout's `title.default` wins on the
// home route (no "Home — Chetan Dasauni" suffix awkwardness).

export default function Home() {
  return (
    <main id="main" className="relative min-h-[100dvh] w-full overflow-hidden bg-zinc-950">
      <Suspense fallback={null}>
        <HeroRouter />
      </Suspense>
    </main>
  )
}
