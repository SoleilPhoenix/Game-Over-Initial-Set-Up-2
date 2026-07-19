/**
 * Stroke geometry for the Game Over mark.
 *
 * `assets/brand/logo.svg` is a traced logo: every gold "line" is really a thin
 * filled outline, so animating `strokeDashoffset` on those paths would draw the
 * contour of the contour instead of the line itself. For the reveal animation we
 * therefore rebuild the mark as true stroke geometry and cross-fade into the real
 * asset at the end, which keeps the final frame pixel-identical to the brand file.
 *
 * The numbers below were measured off the rendered SVG by hit-testing
 * (`isPointInFill`) along horizontal, vertical and polar scan lines, to 0.5 user
 * units. They are in the logo's own 1024x1024 viewBox space.
 */

export const VIEWBOX = 1024;

export const NAVY = '#0D1B2A';
export const GOLD = '#C6A75E';

/** Centre of the three concentric rings. */
export const CX = 512.1;
export const CY = 498.4;

/** Ring radii, outermost first. */
export const RING_RADII = [202.4, 181.5, 162.5] as const;

/** Measured stroke width of every line in the mark. */
export const STROKE_W = 4.5;

/** Half-width of the gap the rings leave at 12 o'clock for the stem. */
export const GAP_HALF_DEG = 11;

/** The stem runs from just under the gem down to exactly the ring centre. */
export const STEM_X = 512.25;
export const STEM_TOP = 282;
export const STEM_BOTTOM = 499.5;

/**
 * Horizontal bands used to crop the real logo asset into its parts. The mark and
 * the wordmark are separated by empty space (rings end at y≈701, wordmark starts
 * at y≈771), so a band cut is enough - no path-level splitting required.
 */
export const GEM_BAND = { top: 196, bottom: 292 } as const;
export const WORD_BAND = { top: 745, bottom: 872 } as const;

const polar = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

/**
 * One half of a ring: starts at the edge of the top gap and sweeps down to the
 * 6 o'clock position. Drawing both halves at once makes the ring close at the
 * bottom, which reads more deliberate than a single arc racing all the way round.
 */
export function ringHalfPath(r: number, side: 'left' | 'right'): string {
  const start = polar(r, side === 'right' ? -90 + GAP_HALF_DEG : -90 - GAP_HALF_DEG);
  const end = polar(r, 90);
  const sweep = side === 'right' ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}`;
}

/** Arc length of one ring half - the dash length the draw-on animates against. */
export const ringHalfLength = (r: number) => (r * (180 - GAP_HALF_DEG) * Math.PI) / 180;

export const STEM_PATH = `M ${STEM_X} ${STEM_TOP} L ${STEM_X} ${STEM_BOTTOM}`;
export const STEM_LENGTH = STEM_BOTTOM - STEM_TOP;
