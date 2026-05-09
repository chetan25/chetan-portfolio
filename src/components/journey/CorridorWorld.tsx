'use client'

import { Grid } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useJourneyStore } from '@/stores/journeyStore'

const PARTICLE_COUNT_DESKTOP = 160
const PARTICLE_COUNT_MOBILE = 70

const PARTICLE_BOUNDS = {
  x: 16,
  yMin: -0.3,
  yMax: 6,
  zNear: 5,
  zFar: -85,
}

function DriftingParticles({ isMobile }: { isMobile: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * PARTICLE_BOUNDS.x * 2
      pos[i * 3 + 1] =
        PARTICLE_BOUNDS.yMin +
        Math.random() * (PARTICLE_BOUNDS.yMax - PARTICLE_BOUNDS.yMin)
      pos[i * 3 + 2] =
        PARTICLE_BOUNDS.zFar +
        Math.random() * (PARTICLE_BOUNDS.zNear - PARTICLE_BOUNDS.zFar)
      vel[i * 3] = (Math.random() - 0.5) * 0.05
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.025
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.04
    }
    return { positions: pos, velocities: vel }
  }, [count])

  useFrame((_, delta) => {
    const p = ref.current
    if (!p) return
    const arr = (p.geometry.attributes.position as THREE.BufferAttribute)
      .array as Float32Array
    const k = delta * 60
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      arr[ix] += velocities[ix] * k
      arr[ix + 1] += velocities[ix + 1] * k
      arr[ix + 2] += velocities[ix + 2] * k
      // Wrap around bounds
      if (arr[ix] > PARTICLE_BOUNDS.x) arr[ix] = -PARTICLE_BOUNDS.x
      if (arr[ix] < -PARTICLE_BOUNDS.x) arr[ix] = PARTICLE_BOUNDS.x
      if (arr[ix + 1] > PARTICLE_BOUNDS.yMax) arr[ix + 1] = PARTICLE_BOUNDS.yMin
      if (arr[ix + 1] < PARTICLE_BOUNDS.yMin) arr[ix + 1] = PARTICLE_BOUNDS.yMax
      if (arr[ix + 2] > PARTICLE_BOUNDS.zNear) arr[ix + 2] = PARTICLE_BOUNDS.zFar
      if (arr[ix + 2] < PARTICLE_BOUNDS.zFar) arr[ix + 2] = PARTICLE_BOUNDS.zNear
    }
    p.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={isMobile ? 0.024 : 0.022}
        color="#ffffff"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

const HORIZON_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const HORIZON_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    // Off-center radial — vanishing point sits below mid-frame so the glow
    // reads as a horizon, not a halo.
    vec2 c = vUv - vec2(0.5, 0.42);
    float d = length(c * vec2(1.0, 2.6));
    float pulse = 0.85 + 0.15 * sin(uTime * 0.55);
    float glow = smoothstep(0.55, 0.0, d) * pulse;
    vec3 colA = vec3(0.06, 0.20, 0.46);
    vec3 colB = vec3(0.018, 0.04, 0.085);
    vec3 col = mix(colB, colA, glow);
    gl_FragColor = vec4(col, glow * 0.95);
  }
`

function HorizonGlow() {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh position={[0, 4.2, -92]} renderOrder={-1}>
      <planeGeometry args={[140, 32]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={HORIZON_VERT}
        fragmentShader={HORIZON_FRAG}
      />
    </mesh>
  )
}

const SPEED_LINE_COUNT = 22

function SpeedLines() {
  const isTransitioning = useJourneyStore((s) => s.isTransitioning)
  const groupRef = useRef<THREE.Group>(null)
  const opacityRef = useRef(0)

  const lines = useMemo(() => {
    const arr: Array<{ x: number; y: number; z: number }> = []
    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 18,
        y: 0.4 + Math.random() * 5,
        z: -15 - Math.random() * 55,
      })
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    const target = isTransitioning ? 0.65 : 0
    opacityRef.current = THREE.MathUtils.lerp(
      opacityRef.current,
      target,
      delta * 6
    )
    const g = groupRef.current
    if (!g) return
    g.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      const m = mesh.material as THREE.MeshBasicMaterial
      if (m) m.opacity = opacityRef.current
      // Streak forward fast during transitions so they whoosh past the camera.
      if (isTransitioning) {
        mesh.position.z += delta * 28
        if (mesh.position.z > 6) mesh.position.z = -70
      }
    })
  })

  return (
    <group ref={groupRef}>
      {lines.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <boxGeometry args={[0.012, 0.012, 3.2]} />
          <meshBasicMaterial
            color="#cbd5ff"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

export default function CorridorWorld({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      <HorizonGlow />

      {/* Floor grid — fades to distance, gives parallax reference for the
          dolly motion so the camera reads as moving (not the cards). */}
      <Grid
        position={[0, 0, -42]}
        args={[80, 130]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a2335"
        sectionSize={5}
        sectionThickness={1.0}
        sectionColor="#3b82f6"
        fadeDistance={62}
        fadeStrength={1.6}
        followCamera={false}
        infiniteGrid={false}
      />

      <DriftingParticles isMobile={isMobile} />
      {!isMobile && <SpeedLines />}
    </>
  )
}
