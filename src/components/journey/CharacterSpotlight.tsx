'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { characterPositionRef } from './sharedRefs'

// Pool of warm light that travels with the character so he reads against the
// cool-blue void. The light position is offset above + slightly camera-side
// so the front of the silhouette catches the highlight.
const LIGHT_OFFSET = { x: 0.6, y: 4.2, z: 2.4 }

export default function CharacterSpotlight() {
  const lightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  useFrame(() => {
    const charPos = characterPositionRef.current
    const light = lightRef.current
    const target = targetRef.current
    if (!light || !target) return
    light.position.set(
      charPos.x + LIGHT_OFFSET.x,
      charPos.y + LIGHT_OFFSET.y,
      charPos.z + LIGHT_OFFSET.z
    )
    target.position.set(charPos.x, charPos.y + 1.0, charPos.z)
    light.target = target
    target.updateMatrixWorld()
  })

  return (
    <>
      <spotLight
        ref={lightRef}
        intensity={28}
        distance={11}
        angle={0.55}
        penumbra={0.65}
        decay={1.6}
        color="#fff3dc"
      />
      <object3D ref={targetRef} />
    </>
  )
}
