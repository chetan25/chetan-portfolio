'use client'

/**
 * HeroScene — calm backdrop with ambient drifting particles and a subtle bloom
 * pass. The display name is rendered by `NameEchoKinetic` as a 3D point cloud,
 * anchored to the invisible DOM headline `KineticName` instances in `Hero`.
 */

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Points, PointMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import NameEchoKinetic from './NameEchoKinetic'

export type EchoConfig = {
  /** Which text this echo renders. One line per instance — render multiple
   *  echoes in `echoConfigs` to stage them on independent timelines. */
  lines?: string[]
  alignToSelector?: string
  alignOffsetCss?: { x: number; y: number }
  scaleXY?: number
  tiltY?: number
  startDelayMs?: number
}

// ---------- Drifting particles ----------
// Each point carries its own velocity vector and drifts independently. When
// a point exits the bounding volume on any axis it wraps to the opposite
// face, so the cloud feels "alive" without ever depopulating.
const DRIFT_BOUNDS = { x: 7, y: 3.5, zNear: 2, zFar: -4 }

function DriftingParticles({ count = 220 }: { count?: number }) {
  // Allocate two interleaved Float32Arrays — positions feed the geometry,
  // velocities are kept in a sibling buffer so we mutate by index in
  // useFrame without per-particle objects.
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * (DRIFT_BOUNDS.x * 2)
      pos[i * 3 + 1] = (Math.random() - 0.5) * (DRIFT_BOUNDS.y * 2)
      pos[i * 3 + 2] =
        DRIFT_BOUNDS.zFar +
        Math.random() * (DRIFT_BOUNDS.zNear - DRIFT_BOUNDS.zFar)
      const vx = (Math.random() - 0.5) * 0.6
      const vy = (Math.random() - 0.5) * 0.6
      const vz = (Math.random() - 0.5) * 0.4
      vel[i * 3 + 0] = vx
      vel[i * 3 + 1] = vy
      vel[i * 3 + 2] = vz
    }
    return { positions: pos, velocities: vel }
  }, [count])
  const ref = useRef<THREE.Points>(null)

  useFrame((_, delta) => {
    if (!ref.current) return
    const attr = ref.current.geometry.attributes
      .position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      arr[ix + 0] += velocities[ix + 0] * dt
      arr[ix + 1] += velocities[ix + 1] * dt
      arr[ix + 2] += velocities[ix + 2] * dt
      if (arr[ix + 0] > DRIFT_BOUNDS.x) arr[ix + 0] = -DRIFT_BOUNDS.x
      else if (arr[ix + 0] < -DRIFT_BOUNDS.x) arr[ix + 0] = DRIFT_BOUNDS.x
      if (arr[ix + 1] > DRIFT_BOUNDS.y) arr[ix + 1] = -DRIFT_BOUNDS.y
      else if (arr[ix + 1] < -DRIFT_BOUNDS.y) arr[ix + 1] = DRIFT_BOUNDS.y
      if (arr[ix + 2] > DRIFT_BOUNDS.zNear) arr[ix + 2] = DRIFT_BOUNDS.zFar
      else if (arr[ix + 2] < DRIFT_BOUNDS.zFar) arr[ix + 2] = DRIFT_BOUNDS.zNear
    }
    attr.needsUpdate = true
  })

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        transparent
        size={0.026}
        color="#ffffff"
        sizeAttenuation
        depthWrite={false}
        opacity={0.78}
      />
    </Points>
  )
}

// ---------- Backdrop gradient ----------
function Backdrop() {
  return (
    <mesh position={[0, 0, -8]}>
      <planeGeometry args={[40, 24]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={{
          uColorInner: { value: new THREE.Color('#0b1226') },
          uColorOuter: { value: new THREE.Color('#04060c') },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform vec3 uColorInner;
          uniform vec3 uColorOuter;
          void main() {
            float d = distance(vUv, vec2(0.6, 0.5));
            vec3 col = mix(uColorInner, uColorOuter, smoothstep(0.0, 0.7, d));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  )
}

// ---------- Scene ----------
function Scene({
  isMobile,
  echoConfigs,
}: {
  isMobile: boolean
  echoConfigs?: EchoConfig[]
}) {
  return (
    <>
      <Backdrop />
      <Environment preset="city" environmentIntensity={0.55} />

      <ambientLight intensity={0.28} />
      <directionalLight
        position={[2.5, 6, 3.5]}
        intensity={1.05}
        color="#dde7f5"
      />
      <directionalLight position={[-4, 2, 2]} intensity={0.4} color="#9bb8e8" />

      {(echoConfigs ?? [{}]).map((cfg, i) => (
        <NameEchoKinetic
          key={cfg.alignToSelector ?? i}
          isMobile={isMobile}
          lines={cfg.lines}
          alignToSelector={cfg.alignToSelector}
          alignOffsetCss={cfg.alignOffsetCss}
          scaleXY={cfg.scaleXY}
          tiltY={cfg.tiltY}
          startDelayMs={cfg.startDelayMs}
        />
      ))}

      <DriftingParticles count={isMobile ? 340 : 220} />

      <EffectComposer multisampling={isMobile ? 0 : 2} enableNormalPass={false}>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.85}
          luminanceSmoothing={0.25}
          intensity={0.3}
        />
      </EffectComposer>
    </>
  )
}

export default function HeroScene({
  isMobile = false,
  echoConfigs,
}: {
  isMobile?: boolean
  echoConfigs?: EchoConfig[]
}) {
  return (
    <Canvas
      dpr={isMobile ? [1, 1.4] : [1, 2]}
      camera={{ position: [0, 0.4, 7.5], fov: 38, near: 0.1, far: 50 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <Scene isMobile={isMobile} echoConfigs={echoConfigs} />
      </Suspense>
    </Canvas>
  )
}
