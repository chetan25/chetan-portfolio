import JourneyClient from '@/components/journey/JourneyClient'

export const metadata = {
  title: 'Journey — Chetan Dasauni',
  description:
    'A walk through every chapter that shaped a senior engineering career.',
}

export default function JourneyPage() {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-zinc-950">
      <JourneyClient />
    </main>
  )
}
