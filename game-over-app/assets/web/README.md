# Game Over web brand assets

These files are self-contained website deliverables derived from [`../brand/logo.svg`](../brand/logo.svg). They use Midnight Navy `#0D1B2A` and Champagne Gold `#C6A75E`.

- `logo-mark.svg` — the gold mark on transparency, with a tightly cropped viewBox and no wordmark.
- `logo-on-navy.svg` — the mark centred on a square Midnight Navy canvas, matching the native splash treatment.
- `splash.svg` — the mark, original path-based “Game Over” wordmark, and a smaller muted `game-over.app` line on Midnight Navy.
- `favicon.svg` — a mark-only icon derived from the traced source paths. It holds up from roughly 64×64 upwards and is **not** what the browser tab uses; see below.
- `favicon-small.svg` — the icon the app actually ships (`app.config.ts` → `web.favicon`). Hand-drawn on a 16-unit viewBox so one unit is one pixel at the size browsers actually render: one ring instead of two, no diamond. It is **not** produced by `generate.py` and must not be overwritten by it.
- `intro.html` — a dependency-free, JavaScript-free inline-SVG version of the app’s four-second reveal. Reduced-motion visitors see the finished logo immediately.
- `generate.py` — the standard-library-only regeneration tool for all five deliverables above.

The “Game Over” lettering is copied from the source SVG as paths. The small domain line uses a system sans-serif stack: it avoids a font download or embedded font while degrading predictably across platforms.

The Expo app intentionally continues to use PNG files for its top-level icon, native splash image, and Android adaptive-icon foreground because Expo requires raster files in those fields. Only the web favicon points into this folder, at `assets/web/favicon-small.svg`; the existing PNG assets are unchanged.

### Why the favicon is a separate drawing, not a scaled logo

Rendered at true 16×16, `favicon.svg` loses its identity: the double ring merges into one, the diamond collapses into a blob, and the gold turns matte olive.
That last part is not a rendering bug but arithmetic.
The traced paths carry `stroke-width="0.5"` on a 1024-unit viewBox, so at 16 pixels a line is 0.008 pixels wide.
A rasteriser can neither draw nor drop it, so it blends the gold proportionally into the navy behind it.

Thickening the strokes was tried and reverted: it destroyed the diamond facets.
The working answer is a dedicated drawing whose viewBox matches the delivery size.
To re-check after any change:

```sh
qlmanage -t -s 16 -o /tmp/fav assets/web/favicon-small.svg
```

Any gold pixel brighter than `#C6A75E` is an artefact; antialiasing only ever darkens toward the navy.

## Regenerating

After replacing `assets/brand/logo.svg`, run:

```sh
python3 assets/web/generate.py
```

The generator reuses the traced gold paths and their local navy correction paths, recalculates the mark’s Bézier bounds for its trimmed viewBox, and rebuilds the animation from the measurements in `src/components/brand/logoGeometry.ts`. If those animation measurements or timings change, update the matching constants in `generate.py` from `logoGeometry.ts` and `AnimatedLogo.tsx`, regenerate, and repeat the validation commands documented in the change report.
