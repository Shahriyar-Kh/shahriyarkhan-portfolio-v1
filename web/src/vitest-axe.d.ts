/* eslint-disable @typescript-eslint/no-empty-object-type -- these
   interfaces intentionally add no members of their own; extending
   CustomMatchers<T> IS the augmentation, matching the standard pattern
   used by @testing-library/jest-dom's own Vitest typings. */

// vitest-axe@0.1.0 ships no Vitest type augmentation at all (checked -
// not a config issue on this end), so tsc has no way to know
// `toHaveNoViolations()` exists on `expect(...)` results. Registered at
// runtime via expect.extend() in vitest.setup.ts; this file only teaches
// tsc about it.
interface CustomMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module "vitest" {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// The presence of this export (rather than the file being a bare global
// script) is what makes the `declare module "vitest"` block above an
// AUGMENTATION of the real module instead of a full replacement of it -
// without this, every other named export from "vitest" (describe, it,
// expect, vi, ...) disappears for the whole project.
export {};
