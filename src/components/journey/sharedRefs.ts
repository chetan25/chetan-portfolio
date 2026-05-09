import * as THREE from 'three'

// Module-level ref written by CorridorCharacter every frame and read by
// CorridorCamera. Letting the camera track the character's *current* position
// (rather than the destination stage position) keeps them always at the same
// over-the-shoulder offset — no overshoot, no character-disappears-for-a-sec.
export const characterPositionRef: { current: THREE.Vector3 } = {
  current: new THREE.Vector3(),
}
