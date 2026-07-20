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
 * Regions used to cut the real logo asset into the parts the reveal animates.
 * They tile the artwork without gaps or overlap, so showing all of them at once
 * reproduces the asset exactly:
 *
 *   y 196–288  gem          y 288–712  rings + stem
 *   y 712–745  empty        y 745–872  wordmark
 *
 * No path-level splitting is needed - the parts are separated by empty space
 * (the gem's culet ends at y≈282, rings span y≈296–701, the wordmark starts at
 * y≈771), so plain rectangular cuts are enough.
 */
export const GEM_BAND = { top: 196, bottom: 288 } as const;
export const RINGS_BAND = { top: 288, bottom: 712 } as const;
export const WORD_BAND = { top: 745, bottom: 872 } as const;

/**
 * The stem is not redrawn as a stroke. Instead a navy shade covers exactly this
 * strip inside the rings band and retreats downwards, uncovering the real stem
 * from top to bottom. The strip is safe to blank out because the rings leave a
 * gap at 12 o'clock - they do not cross x≈512 above the centre, so nothing but
 * the stem lives in here.
 */
export const STEM_STRIP = { left: 500, right: 525, top: STEM_TOP, bottom: 505 } as const;

const polar = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

/** Total sweep of one ring: the full circle minus the gap it leaves at the top. */
const CIRCUIT_DEG = 360 - 2 * GAP_HALF_DEG;

/**
 * One ring as a single unbroken stroke. It starts just right of the top gap,
 * runs down the right side, around the bottom and back up the left side to the
 * other edge of the gap - so the line travels from the top all the way round and
 * returns to the top.
 *
 * Drawn as one path rather than two meeting halves: the reveal traces each ring
 * as one continuous gesture and then carries outward to the next, which reads as
 * a circuit being closed. It also removes the seam the two-half version had at
 * 6 o'clock, where both strokes ended on the same point.
 */
export function ringCircuitPath(r: number): string {
  const start = polar(r, -90 + GAP_HALF_DEG);
  const end = polar(r, -90 - GAP_HALF_DEG);
  // largeArc=1 because the sweep is well over 180 degrees; sweep=1 runs clockwise.
  return `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`;
}

/** Arc length of one ring - the dash length the draw-on animates against. */
export const ringCircuitLength = (r: number) => (r * CIRCUIT_DEG * Math.PI) / 180;
