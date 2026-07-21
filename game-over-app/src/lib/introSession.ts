/**
 * Launch Intro - once per app session
 *
 * Deliberately in-memory rather than persisted: the intro is a launch moment,
 * so it should play on every cold start but never twice within one run of the
 * app. Persisting it would show it exactly once ever, and re-reading it from
 * storage would make the routing decision async, which would put a blank frame
 * in front of the very thing the intro exists to make feel considered.
 */

let played = false;

export function shouldPlayIntro(): boolean {
  return !played;
}

export function markIntroPlayed(): void {
  played = true;
}

/** Test seam - lets a test (or a debug menu) replay the intro. */
export function resetIntroForTesting(): void {
  played = false;
}
