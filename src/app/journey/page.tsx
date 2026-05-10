import type { Metadata } from 'next'
import JourneyClient from '@/components/journey/JourneyClient'

const PAGE_DESCRIPTION =
  'A walk through every chapter that shaped a senior engineering career.'

export const metadata: Metadata = {
  title: 'Journey',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/journey' },
  openGraph: {
    title: 'Journey — Chetan Dasauni',
    description: PAGE_DESCRIPTION,
    url: '/journey',
  },
  twitter: {
    title: 'Journey — Chetan Dasauni',
    description: PAGE_DESCRIPTION,
  },
}

export default function JourneyPage() {
  return (
    <main id="main" className="relative min-h-[100dvh] w-full overflow-hidden bg-zinc-950">
      <JourneyClient />
    </main>
  )
}
