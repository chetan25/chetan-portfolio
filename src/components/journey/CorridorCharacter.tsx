'use client'

import { useFBX, useAnimations, useProgress } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useJourneyStore } from '@/stores/journeyStore'
import {
  signPositions,
  stagePositions,
  WALK_SPEED,
} from '@/lib/corridorPositions'
import { TOTAL_STAGES } from '@/lib/milestones'
import { characterPositionRef } from './sharedRefs'

const ARRIVAL_EPSILON = 0.06

// On stop, the character keeps facing his walk direction (toward -Z) but
// glances slightly toward the active sign — a subtle "looking at it with
// you" turn rather than a presented-to-camera pose.
const IDLE_HEAD_TURN_FRACTION = 0.22
const IDLE_ROT_LERP = 3.2

// Delay between drei reporting all assets loaded and the greeting wave firing.
// LoadingScreen needs ~1150ms after progress=100 to finish fading (450ms hold
// + 700ms fade-out); we fire shortly after the screen is gone.
const WAVE_AFTER_LOAD_DELAY_MS = 1300

// Mixamo bakes a forward Hips translation into every clip. Combined with our
// useFrame walk lerp, that would double-displace the character each step.
function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks.filter(
    (t) => !/(?:mixamorig:?)?(?:Hips|RootNode|Root)\.position/i.test(t.name)
  )
  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

function shortestArc(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

type AnimName = 'idle' | 'walk' | 'wave'

export default function CorridorCharacter({
  scale = 0.015,
}: {
  scale?: number
}) {
  const group = useRef<THREE.Group>(null)
  const targetRef = useRef(new THREE.Vector3())
  const moveDir = useRef(new THREE.Vector3())
  const wasMovingRef = useRef(false)
  const idleTargetRotY = useRef<number | null>(null)

  const activeIndex = useJourneyStore((s) => s.activeIndex)
  const setTransitioning = useJourneyStore((s) => s.setTransitioning)

  // Start in idle. The greeting wave is deferred until after loading finishes
  // and the user has had a beat to see the character standing there — see
  // the WAVE_AFTER_LOAD_DELAY_MS effect below.
  const [animation, setAnimation] = useState<AnimName>('idle')
  const waveTriggeredRef = useRef(false)

  const { progress: loadProgress, active: loadActive } = useProgress()

  const idleFbx = useFBX('/models/character-idle.fbx')
  const walkFbx = useFBX('/models/character-walk.fbx')
  const waveFbx = useFBX('/models/waving.fbx')

  const clips = useMemo(() => {
    const out: THREE.AnimationClip[] = []
    if (idleFbx.animations[0]) {
      const c = stripRootMotion(idleFbx.animations[0])
      c.name = 'idle'
      out.push(c)
    }
    if (walkFbx.animations[0]) {
      const c = stripRootMotion(walkFbx.animations[0])
      c.name = 'walk'
      out.push(c)
    }
    if (waveFbx.animations[0]) {
      const c = stripRootMotion(waveFbx.animations[0])
      c.name = 'wave'
      out.push(c)
    }
    return out
  }, [idleFbx, walkFbx, waveFbx])

  useEffect(() => {
    idleFbx.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        // No shadow casting in the void — keeps the GPU budget for transmission
        // panels and particles.
        mesh.castShadow = false
        mesh.receiveShadow = false
      }
    })
  }, [idleFbx])

  // Snap to stage 0 on mount. Character keeps default rotation (facing +Z =
  // facing the camera) so the intro reads as "he greets the user, then turns
  // and walks into the corridor on first advance".
  useEffect(() => {
    if (!group.current) return
    const start = stagePositions[0]
    group.current.position.set(start[0], start[1], start[2])
    targetRef.current.set(start[0], start[1], start[2])
    characterPositionRef.current.copy(group.current.position)
  }, [])

  useEffect(() => {
    const next = stagePositions[activeIndex]
    targetRef.current.set(next[0], next[1], next[2])
  }, [activeIndex])

  const { actions, mixer } = useAnimations(clips, group)

  useEffect(() => {
    const action = actions[animation]
    if (!action) return
    if (animation === 'wave') {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
    }
    action.timeScale = animation === 'walk' ? 1.4 : 1
    action.reset().fadeIn(0.3).play()
    return () => {
      action.fadeOut(0.3)
    }
  }, [actions, animation])

  // After the wave finishes, fall to idle (unless we've already started walking).
  useEffect(() => {
    if (!mixer) return
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      const clipName = e.action.getClip().name
      if (clipName === animation && animation === 'wave') {
        if (!wasMovingRef.current) setAnimation('idle')
      }
    }
    mixer.addEventListener('finished', onFinished as never)
    return () => mixer.removeEventListener('finished', onFinished as never)
  }, [mixer, animation])

  // Greeting wave: fires once, after drei reports all assets loaded and the
  // configured beat has passed. Skipped if the user has already advanced past
  // stage 0 or started walking before the timer elapses.
  useEffect(() => {
    if (waveTriggeredRef.current) return
    if (loadActive) return
    if (loadProgress < 100) return
    if (useJourneyStore.getState().activeIndex !== 0) return

    const t = setTimeout(() => {
      if (waveTriggeredRef.current) return
      if (wasMovingRef.current) return
      if (useJourneyStore.getState().activeIndex !== 0) return
      waveTriggeredRef.current = true
      setAnimation('wave')
      // Surface the greeting in the HUD at the same beat as the wave —
      // IntroBubble subscribes to this flag.
      useJourneyStore.getState().setGreetingActive(true)
    }, WAVE_AFTER_LOAD_DELAY_MS)
    return () => clearTimeout(t)
  }, [loadActive, loadProgress])

  useFrame((_, delta) => {
    if (!group.current) return
    const pos = group.current.position
    const target = targetRef.current
    const distance = pos.distanceTo(target)
    const isMoving = distance > ARRIVAL_EPSILON

    if (isMoving !== wasMovingRef.current) {
      wasMovingRef.current = isMoving
      if (isMoving) {
        setAnimation('walk')
        idleTargetRotY.current = null
      } else {
        setTransitioning(false)
        setAnimation('idle')
        const walkRotY = group.current.rotation.y
        const isLastStage = activeIndex === TOTAL_STAGES - 1
        if (isLastStage) {
          // Final beat — turn fully around to face the camera, closing the
          // journey by addressing the user directly.
          idleTargetRotY.current = walkRotY + shortestArc(walkRotY, 0)
        } else {
          // Slight head-turn toward the active sign on idle — a "look at this
          // with me" glance rather than a presented pose.
          const sign = signPositions[activeIndex]
          if (sign) {
            const dx = sign[0] - pos.x
            const dz = sign[2] - pos.z
            const lookY = Math.atan2(dx, dz)
            idleTargetRotY.current =
              walkRotY +
              shortestArc(walkRotY, lookY) * IDLE_HEAD_TURN_FRACTION
          } else {
            idleTargetRotY.current = walkRotY
          }
        }
      }
    }

    if (!isMoving) {
      if (idleTargetRotY.current !== null) {
        group.current.rotation.y = THREE.MathUtils.lerp(
          group.current.rotation.y,
          idleTargetRotY.current,
          delta * IDLE_ROT_LERP
        )
      }
      return
    }

    moveDir.current.subVectors(target, pos).normalize()
    const step = Math.min(WALK_SPEED * delta, distance)
    pos.addScaledVector(moveDir.current, step)
    characterPositionRef.current.copy(pos)

    // Lerp via shortest arc, not raw value. Otherwise: when the previous idle
    // target was a "+2π equivalent of 0" (which can happen on the last stage
    // because shortestArc(walkRotY, 0) returns +π for any walkRotY slightly
    // above π — going CCW past 2π is numerically shorter), `rotation.y`
    // settles at ~2π. A raw lerp toward 0 from 2π then unwinds linearly —
    // visually a full 360° spin before walking. shortestArc keeps every step
    // within ±π of the current rotation.
    const targetRotY = Math.atan2(moveDir.current.x, moveDir.current.z)
    const currentRotY = group.current.rotation.y
    const arc = shortestArc(currentRotY, targetRotY)
    group.current.rotation.y = THREE.MathUtils.lerp(
      currentRotY,
      currentRotY + arc,
      delta * 6
    )
  })

  return (
    <group ref={group} scale={scale}>
      <primitive object={idleFbx} />
    </group>
  )
}
