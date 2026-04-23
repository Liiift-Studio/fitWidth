# fitWidth

[![npm](https://img.shields.io/npm/v/%40liiift-studio%2Ffitwidth.svg)](https://www.npmjs.com/package/@liiift-studio/fitwidth) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![part of liiift type-tools](https://img.shields.io/badge/liiift-type--tools-blueviolet)](https://github.com/Liiift-Studio/type-tools)

CSS has no native way to stretch or compress a display headline to fill an exact container width without changing font-size. `fitWidth` binary-searches the `wdth` variable font axis — and falls back to `letter-spacing` — to close that gap precisely. Type size stays constant; only inter-glyph geometry changes.

**[fitwidth.com](https://fitwidth.com)** · [npm](https://www.npmjs.com/package/@liiift-studio/fitwidth) · [GitHub](https://github.com/Liiift-Studio/fitWidth)

TypeScript · Zero dependencies · React + Vanilla JS

---

## Install

```bash
npm install @liiift-studio/fitwidth
```

---

## Usage

> **Next.js App Router:** this library uses browser APIs. Add `"use client"` to any component file that imports from it.

> **Variable font recommended:** `fitWidth` works best with a variable font that has a `wdth` axis. When a `wdth` axis is available, `prefer: 'auto'` uses it for the main fit and refines with `letter-spacing` only if needed. With a static font, the algorithm falls back to `letter-spacing` alone — the result is functional but typographically coarser.

### React component

```tsx
import { FitWidthText } from '@liiift-studio/fitwidth'

<FitWidthText as="h1" axis="wdth" axisMin={75} axisMax={125}>
  The quick brown fox
</FitWidthText>
```

The default `as` element is `'h1'`. Pass any valid HTML element type — `'h2'`, `'p'`, `'div'` — to render a different tag.

### React hook

```tsx
import { useFitWidth } from '@liiift-studio/fitwidth'

// Inside a React component:
const ref = useFitWidth({ axis: 'wdth', axisMin: 75, axisMax: 125 })
return <h1 ref={ref}>The quick brown fox</h1>
```

The hook re-runs automatically on resize via `ResizeObserver` and after fonts finish loading via `document.fonts.ready`. It cleans up the observer on unmount.

### Vanilla JS

```ts
import { applyFitWidth, removeFitWidth } from '@liiift-studio/fitwidth'

const el = document.querySelector('h1')
const opts = { axis: 'wdth', axisMin: 75, axisMax: 125 }

function run() {
  applyFitWidth(el, opts)
}

run()
document.fonts.ready.then(run)

let ro = new ResizeObserver(() => run())
ro.observe(el)

// Later — disconnect and restore original inline styles:
// ro.disconnect()
// removeFitWidth(el)
```

### TypeScript

```ts
import type { FitWidthOptions } from '@liiift-studio/fitwidth'

const opts: FitWidthOptions = {
  target: 'container',
  prefer: 'auto',
  axis: 'wdth',
  axisMin: 75,
  axisMax: 125,
  maxTracking: 0.3,
  tolerance: 0.5,
}
```

---

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `target` | `'container'` | Width to fill. `'container'` fills the parent element's clientWidth. Pass a `number` for an exact pixel target. Pass an `HTMLElement` to match the rendered width of another element |
| `prefer` | `'auto'` | Strategy to use. `'auto'` tries the `wdth` axis first, then refines with `letter-spacing` if needed. `'axis'` uses the axis only (sets `letter-spacing` to 0 first). `'tracking'` uses `letter-spacing` only and leaves `font-variation-settings` unchanged |
| `axis` | `'wdth'` | Variable font axis tag to adjust when `prefer` is `'auto'` or `'axis'`. Any four-character OpenType axis tag is valid (e.g. `'wdth'`, `'wght'`, `'XTRA'`) |
| `axisMin` | `75` | Minimum axis value for the binary search |
| `axisMax` | `125` | Maximum axis value for the binary search |
| `maxTracking` | `0.3` | Maximum absolute `letter-spacing` in em. The result is clamped to ±this value |
| `tolerance` | `0.5` | Convergence tolerance in pixels. The search stops when the remaining gap is within this value |
| `respectReducedMotion` | `false` | When `true`, checks `prefers-reduced-motion: reduce` before fitting. If the user has enabled reduced motion, `applyFitWidth` returns early without modifying any styles. The React hook also listens for OS-level changes to the preference and re-evaluates automatically |
| `as` | `'h1'` | HTML element to render. Accepts any valid React element type. *(React component only)* |

---

## How it works

**Binary search algorithm:** `applyFitWidth` reads the element's current width using `getBoundingClientRect()`, then bisects the search space up to 20 times per pass. Each iteration sets `el.style.fontVariationSettings` or `el.style.letterSpacing` directly and re-measures. The loop exits early once the gap falls within `tolerance` pixels.

**`prefer: 'auto'` strategy:** The axis search runs first. If the best axis value still leaves a gap larger than `tolerance` — because the target is outside the font's axis range — a second binary search over `letter-spacing` runs from the current position to close the remaining difference. Axis variation is always preferred over tracking when available, because it preserves the designer's intended glyph shapes.

**No innerHTML rewriting:** Unlike line-based tools in this suite, `fitWidth` operates on a single element and never wraps content in spans or rewrites `innerHTML`. It modifies only `el.style.fontVariationSettings` and `el.style.letterSpacing`. The original inline values are saved in a `WeakMap` on the first call; subsequent calls reset from those saved values before re-fitting, making repeated invocations idempotent. `removeFitWidth` restores the saved originals and clears the entry.

**ResizeObserver built in:** The React hook and Vanilla JS example both observe the container with `ResizeObserver`. Callbacks are debounced with `requestAnimationFrame` and deduplicated by integer pixel width — the fit only re-runs when the container actually changes width.

**`document.fonts.ready` timing:** Browser width measurements before a web font loads return metrics for the fallback font, producing an incorrect fit. The hook and Vanilla JS example both call `document.fonts.ready.then(run)` to re-run once the real font is available.

---

## Dev notes

### `next` in root devDependencies

`package.json` at the repo root lists `next` as a devDependency. This is a **Vercel detection workaround** — not a real dependency of the npm package. Vercel's build system inspects the root `package.json` to detect the framework; without `next` present it falls back to a static build and skips the Next.js pipeline, breaking the `/site` subdirectory deploy.

The package itself has zero runtime dependencies. Do not remove this entry.

---

## Future improvements

- **Multi-element sync** — accept an array of elements and fit them all to the same computed target width in a single pass, so a stack of pull-quotes share identical tracking
- **Clamped overshoot mode** — instead of converging to exactly `targetWidth`, allow the user to specify a `minFill` ratio (e.g. `0.98`) so the algorithm stops as soon as the line reaches 98 % of the target, avoiding aggressive tracking on very short words
- **SSR hydration hint** — accept a pre-computed `axisValue` prop that is applied immediately on mount before the first `ResizeObserver` fires, eliminating the brief unstyled state on first render
- **Canvas-based width measurement** — use `CanvasRenderingContext2D.measureText()` as a non-layout measurement path to avoid forced reflow on every resize cycle, with BCR as the fallback for accuracy

---

Current version: v1.0.10
