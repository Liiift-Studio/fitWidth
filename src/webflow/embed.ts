// fitWidth/src/webflow/embed.ts — zero-config browser bundle for Webflow Custom Code Embed.
// Fits any element marked with [data-fitwidth] to its target width, reading options from
// data-* attributes, and re-fits on viewport resize. Exposes a small window.FitWidth API.
import { applyFitWidth, removeFitWidth } from '../core/adjust'
import type { FitWidthOptions } from '../core/types'

/** Attribute that opts an element in to width fitting. */
const OPT_IN_ATTR = 'data-fitwidth'

/** Elements currently under management, re-fitted on resize. */
const tracked = new Set<HTMLElement>()

/**
 * Read fitWidth options from an element's data-* attributes.
 * Unset attributes fall through to the library defaults.
 *
 * Supported attributes:
 *   data-fw-target       — 'container' (default) or a pixel number
 *   data-fw-prefer       — auto | axis | tracking
 *   data-fw-axis         — variable font axis tag (default 'wdth')
 *   data-fw-axis-min     — axis search lower bound
 *   data-fw-axis-max     — axis search upper bound
 *   data-fw-max-tracking — max absolute letter-spacing in em
 *   data-fw-tolerance    — convergence tolerance in px
 *
 * @param el - The opted-in element
 */
function readOptions(el: HTMLElement): FitWidthOptions {
	const d = el.dataset
	const opts: FitWidthOptions = {}

	if (d.fwTarget) {
		const n = parseFloat(d.fwTarget)
		opts.target = isNaN(n) ? 'container' : n
	}
	if (d.fwPrefer === 'auto' || d.fwPrefer === 'axis' || d.fwPrefer === 'tracking') {
		opts.prefer = d.fwPrefer
	}
	if (d.fwAxis) opts.axis = d.fwAxis
	if (d.fwAxisMin !== undefined) { const n = parseFloat(d.fwAxisMin); if (!isNaN(n)) opts.axisMin = n }
	if (d.fwAxisMax !== undefined) { const n = parseFloat(d.fwAxisMax); if (!isNaN(n)) opts.axisMax = n }
	if (d.fwMaxTracking !== undefined) { const n = parseFloat(d.fwMaxTracking); if (!isNaN(n)) opts.maxTracking = n }
	if (d.fwTolerance !== undefined) { const n = parseFloat(d.fwTolerance); if (!isNaN(n)) opts.tolerance = n }

	return opts
}

/**
 * Fit a single element and register it for resize re-fitting.
 *
 * @param el - Element to fit
 */
function fitElement(el: HTMLElement): void {
	applyFitWidth(el, readOptions(el))
	tracked.add(el)
}

/**
 * Re-fit every tracked element. applyFitWidth resets to saved originals first,
 * so repeated calls are idempotent.
 */
function refit(): void {
	tracked.forEach((el) => applyFitWidth(el, readOptions(el)))
}

/**
 * Restore and stop tracking a single element.
 *
 * @param el - Element previously fitted
 */
function destroy(el: HTMLElement): void {
	removeFitWidth(el)
	tracked.delete(el)
}

/**
 * Scan a root for opted-in elements and fit each one.
 *
 * @param root - Element or document to search (default: document)
 */
function init(root: ParentNode = document): void {
	root.querySelectorAll<HTMLElement>(`[${OPT_IN_ATTR}]`).forEach(fitElement)
}

// Re-fit on viewport resize — the container's width drives the fit. Throttled to one
// re-fit per animation frame so a drag-resize doesn't run the search on every event.
let resizeRaf = 0
function onResize(): void {
	if (resizeRaf) cancelAnimationFrame(resizeRaf)
	resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; refit() })
}

/**
 * Auto-initialise once the DOM is parsed and web fonts have loaded.
 * Fonts must settle first: the fitted width depends on final glyph metrics,
 * which shift when a web font swaps in.
 */
function autoInit(): void {
	const run = () => {
		if (document.fonts?.ready) {
			document.fonts.ready.then(() => init()).catch(() => init())
		} else {
			init()
		}
		window.addEventListener('resize', onResize)
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true })
	} else {
		run()
	}
}

autoInit()

// Public browser API — assigned to window.FitWidth via the IIFE global name.
export { init, refit, destroy }
