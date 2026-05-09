'use client'

const YEARS = [
  '2013 — Vancouver',
  '2014 — Douglas College',
  '2015 — Thrinacia',
  '2016 — Sycle',
  '2020 — Unbounce',
  '2022 — Intuit',
  '2025 — Scribd',
]

export default function YearsMarquee() {
  const items = [...YEARS, ...YEARS]
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden border-t border-white/5 bg-gradient-to-t from-zinc-950/80 to-transparent">
      <div className="flex animate-[years-marquee_38s_linear_infinite] gap-12 whitespace-nowrap py-4 font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-600">
        {items.map((s, i) => (
          <span key={i} className="shrink-0">
            {s}
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes years-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}
