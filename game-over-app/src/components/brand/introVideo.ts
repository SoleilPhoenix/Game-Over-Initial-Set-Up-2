/**
 * Intro Video Source
 *
 * ===========================================================================
 * TO ADD THE VIDEO: put the file at `assets/brand/intro.mp4`, then replace the
 * `null` below with:
 *
 *     export const INTRO_VIDEO_SOURCE: IntroVideoSource = require('../../../assets/brand/intro.mp4');
 *
 * Nothing else needs to change. The intro screen already handles both cases.
 * ===========================================================================
 *
 * This indirection exists because `require()` on a missing asset is a *bundler*
 * error, not a runtime one - Metro resolves those paths statically, so it cannot
 * be wrapped in a try/catch or guarded by an if. A single exported constant is
 * therefore the only honest way to keep the screen shippable before the file
 * lands: with `null` the intro plays the logo reveal and moves on, and it
 * behaves as if the video had simply finished.
 */

export type IntroVideoSource = number | null;

export const INTRO_VIDEO_SOURCE: IntroVideoSource = null;

/**
 * How long the video runs, in ms. Only used to bound the intro when playback
 * never reports completion - a corrupt file or a codec the device refuses would
 * otherwise leave the user stranded on the intro screen forever.
 *
 * Set this generously above the real length; it is a backstop, not a schedule.
 */
export const INTRO_VIDEO_MAX_DURATION = 20000;
