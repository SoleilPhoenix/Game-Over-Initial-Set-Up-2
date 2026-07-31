# Game Over web brand assets

These files are self-contained website deliverables derived from [`../brand/logo.svg`](../brand/logo.svg). They use Midnight Navy `#0D1B2A` and Champagne Gold `#C6A75E`.

- `logo-mark.svg` — the gold mark on transparency, with a tightly cropped viewBox and no wordmark.
- `logo-on-navy.svg` — the mark centred on a square Midnight Navy canvas, matching the native splash treatment.
- `splash.svg` — the mark, original path-based “Game Over” wordmark, and a smaller muted `game-over.app` line on Midnight Navy.
- `favicon.svg` — a mark-only browser icon. Its source paths receive a small optical stroke increase so the rings remain visible at 16×16.
- `intro.html` — a dependency-free, JavaScript-free inline-SVG version of the app’s four-second reveal. Reduced-motion visitors see the finished logo immediately.
- `generate.py` — the standard-library-only regeneration tool for all five deliverables above.

The “Game Over” lettering is copied from the source SVG as paths. The small domain line uses a system sans-serif stack: it avoids a font download or embedded font while degrading predictably across platforms.

The Expo app intentionally continues to use PNG files for its top-level icon, native splash image, and Android adaptive-icon foreground because Expo requires raster files in those fields. Only the web favicon points to `assets/web/favicon.svg`; the existing PNG assets are unchanged.

## Regenerating

After replacing `assets/brand/logo.svg`, run:

```sh
python3 assets/web/generate.py
```

The generator reuses the traced gold paths and their local navy correction paths, recalculates the mark’s Bézier bounds for its trimmed viewBox, and rebuilds the animation from the measurements in `src/components/brand/logoGeometry.ts`. If those animation measurements or timings change, update the matching constants in `generate.py` from `logoGeometry.ts` and `AnimatedLogo.tsx`, regenerate, and repeat the validation commands documented in the change report.
