'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useJourneyStore } from '@/stores/journeyStore'
import {
  cameraLookAtOffset,
  cameraOffset,
  stagePositions,
} from '@/lib/corridorPositions'
import { characterPositionRef } from './sharedRefs'

const BOB_AMPLITUDE = 0.055
const BOB_FREQUENCY = 6.2

// Tight rigid follow — the camera locks to the character's current position
// every frame so they advance together. No race-to-destination, no overshoot.
const FOLLOW_LERP_RATE = 9

export default function CorridorCamera() {
  const camera = useThree((s) => s.camera)
  const targetPos = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3())

  const isTransitioning = useJourneyStore((s) => s.isTransitioning)

  useEffect(() => {
    const stage = stagePositions[0]
    const startPos = new THREE.Vector3(
      stage[0] + cameraOffset[0],
      stage[1] + cameraOffset[1],
      stage[2] + cameraOffset[2]
    )
    camera.position.copy(startPos)
    targetPos.current.copy(startPos)
    currentLookAt.current.set(
      stage[0] + cameraLookAtOffset[0],
      stage[1] + cameraLookAtOffset[1],
      stage[2] + cameraLookAtOffset[2]
    )
    camera.lookAt(currentLookAt.current)
  }, [camera])

  useFrame((state, delta) => {
    // Track the character's *current* position, not the destination stage —
    // this keeps the over-the-shoulder offset constant whether walking
    // forward or backward. The previous race-to-target lerp made the camera
    // arrive ahead of the character on forward navigation, leaving him
    // briefly off-frame ("super sonic" feel).
    const charPos = characterPositionRef.current
    targetPos.current.set(
      charPos.x + cameraOffset[0],
      charPos.y + cameraOffset[1],
      charPos.z + cameraOffset[2]
    )
    targetLookAt.current.set(
      charPos.x + cameraLookAtOffset[0],
      charPos.y + cameraLookAtOffset[1],
      charPos.z + cameraLookAtOffset[2]
    )

    const t = Math.min(1, delta * FOLLOW_LERP_RATE)
    camera.position.lerp(targetPos.current, t)
    currentLookAt.current.lerp(targetLookAt.current, t)

    // Footstep-synced micro-bob during transitions only — sells motion
    // without inducing the seasick feeling that constant bob would.
    if (isTransitioning) {
      const time = state.clock.elapsedTime
      const bobY = Math.sin(time * BOB_FREQUENCY) * BOB_AMPLITUDE
      const bobX = Math.sin(time * BOB_FREQUENCY * 0.5) * BOB_AMPLITUDE * 0.5
      camera.position.y += bobY
      camera.position.x += bobX
    }

    camera.lookAt(currentLookAt.current)
  })

  return null
}
