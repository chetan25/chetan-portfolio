import { create } from 'zustand'
import { milestones, TOTAL_STAGES } from '@/lib/milestones'

type Direction = 'forward' | 'backward'

type JourneyState = {
  activeIndex: number
  direction: Direction
  isTransitioning: boolean
  greetingActive: boolean
  next: () => void
  prev: () => void
  goTo: (index: number) => void
  setTransitioning: (val: boolean) => void
  setGreetingActive: (val: boolean) => void
  reset: () => void
}

const DEBOUNCE_MS = 280
let lastActionAt = 0

const allow = (): boolean => {
  const now = performance.now()
  if (now - lastActionAt < DEBOUNCE_MS) return false
  lastActionAt = now
  return true
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  activeIndex: 0,
  direction: 'forward',
  isTransitioning: false,
  greetingActive: false,
  next: () => {
    if (!allow()) return
    const { activeIndex, isTransitioning } = get()
    if (isTransitioning || activeIndex >= TOTAL_STAGES - 1) return
    set({
      activeIndex: activeIndex + 1,
      direction: 'forward',
      isTransitioning: true,
    })
  },
  prev: () => {
    if (!allow()) return
    const { activeIndex, isTransitioning } = get()
    if (isTransitioning || activeIndex <= 0) return
    set({
      activeIndex: activeIndex - 1,
      direction: 'backward',
      isTransitioning: true,
    })
  },
  goTo: (index) => {
    if (!allow()) return
    const { activeIndex, isTransitioning } = get()
    if (isTransitioning) return
    const clamped = Math.max(0, Math.min(TOTAL_STAGES - 1, index))
    if (clamped === activeIndex) return
    const direction: Direction = clamped > activeIndex ? 'forward' : 'backward'
    set({ activeIndex: clamped, direction, isTransitioning: true })
  },
  setTransitioning: (val) => set({ isTransitioning: val }),
  setGreetingActive: (val) => set({ greetingActive: val }),
  reset: () =>
    set({
      activeIndex: 0,
      direction: 'forward',
      isTransitioning: false,
      greetingActive: false,
    }),
}))

export const useCurrentMilestone = () =>
  useJourneyStore((s) => milestones[s.activeIndex])
