import { Suspense } from 'react'
import HeroRouter from '@/components/hero/HeroRouter'

export const metadata = {
  title: 'Chetan Dasauni — Senior Software Engineer',
  description:
    'Senior software engineer building polished interfaces and tooling. 11+ years at Sycle, Unbounce, Intuit, and Scribd.',
}

export default function Home() {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-zinc-950">
      <Suspense fallback={null}>
        <HeroRouter />
      </Suspense>
    </main>
  )
}
