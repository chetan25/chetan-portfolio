'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import { milestones } from '@/lib/milestones'
import { signPositions } from '@/lib/corridorPositions'
import CorridorWorld from './CorridorWorld'
import CorridorCharacter from './CorridorCharacter'
import CorridorCamera from './CorridorCamera'
import MilestoneSign from './MilestoneSign'
import CharacterSpotlight from './CharacterSpotlight'

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isMobile
}

export default function JourneyScene() {
  const isMobile = useIsMobile()

  return (
    <Canvas
      shadows={false}
      dpr={isMobile ? 1 : [1, 1.6]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 2, 5], fov: 55, near: 0.1, far: 220 }}
    >
      <color attach="background" args={['#06070b']} />
      <fog attach="fog" args={['#0a1018', 14, 82]} />

      {/* Ambient cool base — ensures the dark glass panels never go fully
          black; gives the void some chroma in the shadows. */}
      <ambientLight intensity={0.18} color="#bcd0ff" />

      {/* Hemisphere — gentle sky/ground bounce so the character doesn't read
          as a flat silhouette against the void. */}
      <hemisphereLight args={['#7aa6d6', '#10141c', 0.45]} />

      {/* Key light — above + slightly forward, cool tint. Sculpts the
          character's silhouette. */}
      <directionalLight position={[2, 6, 4]} intensity={1.1} color="#dde8ff" />

      {/* Accent rim from behind/below — picks out the back edge of the
          character against the horizon glow, in the brand accent. */}
      <directionalLight
        position={[-3, 2, -6]}
        intensity={0.55}
        color="#3b82f6"
      />

      <Suspense fallback={null}>
        <CorridorWorld isMobile={isMobile} />
        <CorridorCharacter />
        <CharacterSpotlight />
        {milestones.map((m, i) => {
          const pos = signPositions[i]
          if (!pos) return null
          return (
            <MilestoneSign
              key={m.id}
              index={i}
              position={pos}
              year={m.year}
              title={m.title}
            />
          )
        })}
      </Suspense>

      <CorridorCamera />
    </Canvas>
  )
}
