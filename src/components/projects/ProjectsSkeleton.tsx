/**
 * Suspense fallback for /projects. Renders a list of skeleton rows that
 * match the real layout dimensions so there is no layout shift when the
 * data arrives.
 */

const SHIMMER =
  'rounded bg-white/[0.04] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent motion-reduce:before:animate-none'

const SKELETON_ROW_COUNT = 12

function SkeletonRow() {
  return (
    <li className="grid grid-cols-1 gap-3 py-6 sm:grid-cols-[80px_1fr_auto_28px] sm:items-baseline sm:gap-6">
      <span className={`relative h-3 w-12 overflow-hidden ${SHIMMER}`} />
      <div className="space-y-2">
        <span className={`relative block h-4 w-3/4 overflow-hidden ${SHIMMER}`} />
        <span className={`relative block h-3 w-5/6 overflow-hidden ${SHIMMER}`} />
      </div>
      <span className={`relative hidden h-4 w-20 overflow-hidden sm:block ${SHIMMER}`} />
      <span aria-hidden />
    </li>
  )
}

export default function ProjectsSkeleton() {
  return (
    <section className="mt-16 sm:mt-20">
      <div className={`relative h-3 w-48 overflow-hidden ${SHIMMER}`} />
      <ul
        aria-busy="true"
        className="mt-6 divide-y divide-white/5 border-y border-white/5 sm:mt-8"
      >
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </ul>
    </section>
  )
}
