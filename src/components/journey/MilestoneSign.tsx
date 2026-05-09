'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { Vector3Tuple } from 'three'
import { useJourneyStore } from '@/stores/journeyStore'

type Props = {
  index: number
  position: Vector3Tuple
  year: string
  title: string
}

const SIGN_WIDTH = 2.5
const SIGN_HEIGHT = 1.45
const POST_HEIGHT = 1.25

export default function MilestoneSign({ index, position, year, title }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const glassRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const opacityRef = useRef(1)
  const haloRef2 = useRef(0)

  const activeIndex = useJourneyStore((s) => s.activeIndex)
  const isActive = activeIndex === index
  const isPast = activeIndex > index

  // Slight inward tilt — signs on the right turn left a touch, signs on the
  // left turn right a touch, so the panel face squarely catches the camera.
  const yawTilt = position[0] > 0 ? -Math.PI / 14 : Math.PI / 14

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return

    const desiredOpacity = isPast ? 0.28 : 1.0
    opacityRef.current = THREE.MathUtils.lerp(
      opacityRef.current,
      desiredOpacity,
      delta * 3
    )
    const desiredHalo = isActive ? 1 : 0
    haloRef2.current = THREE.MathUtils.lerp(
      haloRef2.current,
      desiredHalo,
      delta * 3
    )

    // Active sign breathes upward with a gentle bob.
    const bobY = isActive ? Math.sin(state.clock.elapsedTime * 1.4) * 0.04 : 0
    g.position.y = position[1] + bobY

    if (glassRef.current) {
      const m = glassRef.current.material as THREE.MeshPhysicalMaterial
      m.opacity = opacityRef.current * 0.85
    }
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.MeshBasicMaterial
      m.opacity = haloRef2.current * 0.55 * opacityRef.current
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, yawTilt, 0]}>
      {/* Post — thin matte-black metal */}
      <mesh position={[0, POST_HEIGHT * 0.5, 0]}>
        <boxGeometry args={[0.06, POST_HEIGHT, 0.06]} />
        <meshStandardMaterial color="#0a0e16" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Halo glow plane (active state) — sits behind the panel */}
      <mesh
        ref={haloRef}
        position={[0, POST_HEIGHT + SIGN_HEIGHT * 0.5, -0.025]}
      >
        <planeGeometry args={[SIGN_WIDTH + 0.22, SIGN_HEIGHT + 0.22]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Frosted glass panel */}
      <mesh ref={glassRef} position={[0, POST_HEIGHT + SIGN_HEIGHT * 0.5, 0]}>
        <planeGeometry args={[SIGN_WIDTH, SIGN_HEIGHT]} />
        <meshPhysicalMaterial
          color="#0e1422"
          transmission={0.35}
          thickness={0.5}
          roughness={0.42}
          metalness={0.1}
          ior={1.3}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          envMapIntensity={0.4}
        />
      </mesh>

      {/* Year — accent blue, mono-feeling */}
      <Text
        position={[0, POST_HEIGHT + SIGN_HEIGHT * 0.78, 0.012]}
        fontSize={0.32}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
      >
        {year}
      </Text>

      {/* Title — soft white, wraps inside panel */}
      <Text
        position={[0, POST_HEIGHT + SIGN_HEIGHT * 0.34, 0.012]}
        fontSize={0.16}
        color="#fafafa"
        anchorX="center"
        anchorY="middle"
        maxWidth={SIGN_WIDTH - 0.32}
        textAlign="center"
        lineHeight={1.18}
      >
        {title}
      </Text>
    </group>
  )
}
