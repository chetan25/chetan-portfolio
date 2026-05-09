import type { Vector3Tuple } from 'three'
import { milestones } from './milestones'

// Distance the character (and camera) advance per stage, along -Z.
const CORRIDOR_STEP = 9

// Lateral offset for milestone signs from the path centerline.
const SIGN_LATERAL = 3.4

// Sign sits this far past the character's arrival point (deeper in -Z) so the
// camera frames it ahead and to the side, not directly beside the character.
const SIGN_AHEAD = 1.8

// Character world positions per stage. Stage 0 is at the origin; each next
// stage is one CORRIDOR_STEP further into -Z.
export const stagePositions: Vector3Tuple[] = milestones.map((_, i) => [
  0,
  0,
  -CORRIDOR_STEP * i,
])

// Sign world positions per stage. Stage 0 has no sign (intro bubble owns it).
// Signs alternate right (odd indices) / left (even indices > 0).
export const signPositions: (Vector3Tuple | null)[] = milestones.map((_, i) => {
  if (i === 0) return null
  const side = i % 2 === 1 ? 1 : -1
  return [SIGN_LATERAL * side, 0, -CORRIDOR_STEP * i - SIGN_AHEAD]
})

// Camera offset from the character — over-the-shoulder, slightly raised.
export const cameraOffset: Vector3Tuple = [0, 1.85, 4.6]

// Camera lookAt offset from the character — slightly above his head and
// pushed forward into -Z, so the upcoming sign sits naturally in frame.
export const cameraLookAtOffset: Vector3Tuple = [0, 1.45, -2.4]

export const WALK_SPEED = 4.5
export const CAMERA_LERP_RATE = 3.2

if (
  process.env.NODE_ENV !== 'production' &&
  stagePositions.length !== milestones.length
) {
  console.warn(
    'corridorPositions: stagePositions length mismatch with milestones'
  )
}
