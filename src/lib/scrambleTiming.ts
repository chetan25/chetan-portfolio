/**
 * Shared scramble timing for the kinetic name + its 3D echo.
 *
 * Both the DOM `KineticName` and the `NameEchoKinetic` point cloud read these
 * constants so the two layers snap in lockstep — the cloud isn't an
 * independent animation that happens to look similar, it is the same scramble
 * extruded back in Z.
 *
 * Bump these values in one place to retune both layers at once.
 */

export const SCRAMBLE_DURATION_MS = 420
export const PER_CHAR_STAGGER_MS = 55
