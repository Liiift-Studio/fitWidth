// fitWidth/src/core/adjust.ts — framework-agnostic binary-search width fitting algorithm

import type { FitWidthOptions } from './types'

// ─── Saved-state registry ─────────────────────────────────────────────────────

/** Original inline styles saved before the first applyFitWidth call */
interface SavedStyles {
	/** el.style.fontVariationSettings at time of first call */
	fvs: string
	/** el.style.letterSpacing at time of first call */
	letterSpacing: string
}

/**
 * Per-element saved original inline styles.
 * The first call to applyFitWidth saves the originals; removeFitWidth restores them.
 * Subsequent calls to applyFitWidth reset from these saved values before re-fitting.
 */
const savedStyles = new WeakMap<HTMLElement, SavedStyles>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Defaults applied when options are omitted */
const DEFAULTS = {
	target: 'container' as const,
	prefer: 'auto' as const,
	axis: 'wdth',
	axisMin: 75,
	axisMax: 125,
	maxTracking: 0.3,
	tolerance: 0.5,
}

/**
 * Resolve the target width in pixels.
 *
 * - 'container': parent element's getBoundingClientRect().width
 * - number: used directly
 * - HTMLElement: that element's getBoundingClientRect().width
 */
function resolveTarget(el: HTMLElement, target: FitWidthOptions['target']): number {
	if (target === undefined || target === 'container') {
		const parent = el.parentElement
		return parent
			? parent.getBoundingClientRect().width
			: el.getBoundingClientRect().width
	}
	if (typeof target === 'number') return target
	// HTMLElement reference
	return target.getBoundingClientRect().width
}

/**
 * Escape a string for literal use inside a RegExp.
 * Replaces all regex metacharacters with their escaped equivalents.
 */
function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Override a single axis value inside a font-variation-settings string,
 * preserving all other axis values. Adds the axis if not already present.
 * Pre-compiles the pattern for reuse across multiple calls with the same axis.
 *
 * e.g. overrideAxis('"wght" 300, "opsz" 18', 'wdth', 90) → '"wght" 300, "opsz" 18, "wdth" 90'
 */
function makeAxisPattern(axis: string): RegExp {
	// Use hyphen-first in character class so it is treated as a literal, not a range.
	return new RegExp(`(["'])${escapeRegExp(axis)}\\1\\s+[-\\d.eE+]+`)
}

function overrideAxis(baseFVS: string, axis: string, value: number, pattern: RegExp): string {
	if (!baseFVS || baseFVS === 'normal') return `"${axis}" ${value}`
	const replacement = `"${axis}" ${value}`
	return pattern.test(baseFVS)
		? baseFVS.replace(pattern, replacement)
		: `${baseFVS}, ${replacement}`
}

/**
 * Binary search the wdth axis to fit element width to targetWidth.
 * Returns the best axis value found after up to maxIterations steps.
 * Sets el.style.fontVariationSettings directly during the search.
 * Accepts a pre-compiled axis pattern to avoid recompiling on every iteration.
 */
function binarySearchAxis(
	el: HTMLElement,
	targetWidth: number,
	baseFVS: string,
	axis: string,
	axisPattern: RegExp,
	axisMin: number,
	axisMax: number,
	tolerance: number,
	maxIterations = 20,
): { value: number; gap: number } {
	// Guard: degenerate range — return midpoint immediately without looping
	if (axisMin >= axisMax) {
		const mid = axisMin
		el.style.fontVariationSettings = overrideAxis(baseFVS, axis, mid, axisPattern)
		const measured = el.getBoundingClientRect().width
		console.warn(`[fitWidth] axisMin (${axisMin}) >= axisMax (${axisMax}); using ${mid}`)
		return { value: mid, gap: measured - targetWidth }
	}

	let lo = axisMin
	let hi = axisMax
	let bestValue = (lo + hi) / 2
	let bestGap = Infinity

	for (let i = 0; i < maxIterations; i++) {
		const mid = (lo + hi) / 2
		el.style.fontVariationSettings = overrideAxis(baseFVS, axis, mid, axisPattern)
		const measured = el.getBoundingClientRect().width
		const gap = measured - targetWidth

		if (Math.abs(gap) < Math.abs(bestGap)) {
			bestValue = mid
			bestGap = gap
		}

		if (Math.abs(gap) <= tolerance) break

		// Higher axis value → wider text (assumes standard width-expanding axis like wdth)
		if (gap < 0) {
			// Text is too narrow — increase axis value
			lo = mid
		} else {
			// Text is too wide — decrease axis value
			hi = mid
		}
	}

	return { value: bestValue, gap: bestGap }
}

/**
 * Binary search letter-spacing (in em) to close a remaining width gap.
 * Sets el.style.letterSpacing directly during the search.
 * Clamps result to ±maxTracking em.
 * Returns the best value and gap found, consistent with binarySearchAxis.
 */
function binarySearchTracking(
	el: HTMLElement,
	targetWidth: number,
	fontSize: number,
	maxTracking: number,
	tolerance: number,
	maxIterations = 20,
): { value: number; gap: number } {
	// When fontSize is not a positive finite number we cannot produce em values —
	// leave letter-spacing at 0 and report the current gap without looping.
	if (!(fontSize > 0)) {
		el.style.letterSpacing = '0em'
		const measured = el.getBoundingClientRect().width
		return { value: 0, gap: measured - targetWidth }
	}

	let lo = -maxTracking
	let hi = maxTracking
	let bestValue = 0
	let bestGap = Infinity

	for (let i = 0; i < maxIterations; i++) {
		const mid = (lo + hi) / 2
		el.style.letterSpacing = `${mid}em`
		const measured = el.getBoundingClientRect().width
		const gap = measured - targetWidth

		if (Math.abs(gap) < Math.abs(bestGap)) {
			bestValue = mid
			bestGap = gap
		}

		if (Math.abs(gap) <= tolerance) break

		// Higher letter-spacing → wider text
		if (gap < 0) {
			lo = mid
		} else {
			hi = mid
		}
	}

	// Apply best found value
	el.style.letterSpacing = `${bestValue}em`
	return { value: bestValue, gap: bestGap }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fit a display headline element to an exact target width by binary-searching
 * the wdth variable font axis and/or letter-spacing.
 *
 * Does NOT wrap content in spans or rewrite innerHTML — only modifies
 * el.style.fontVariationSettings and el.style.letterSpacing directly.
 *
 * Calling applyFitWidth multiple times is idempotent: original styles are saved
 * on the first call and restored internally before each re-fit.
 *
 * @param el      - Single-line display element (headline, pull-quote, masthead)
 * @param options - FitWidthOptions (merged with defaults)
 */
export function applyFitWidth(el: HTMLElement, options: FitWidthOptions = {}): void {
	if (typeof window === 'undefined') return

	// Honour prefers-reduced-motion: skip the fit if the user has requested it
	if (
		options.respectReducedMotion &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	) return

	// Save scroll position — iOS Safari ignores overflow-anchor: none
	const scrollY = window.scrollY

	// Resolve options against defaults
	const prefer = options.prefer ?? DEFAULTS.prefer
	const axis = options.axis ?? DEFAULTS.axis
	const axisMin = options.axisMin ?? DEFAULTS.axisMin
	const axisMax = options.axisMax ?? DEFAULTS.axisMax
	const maxTracking = options.maxTracking ?? DEFAULTS.maxTracking
	const tolerance = options.tolerance ?? DEFAULTS.tolerance

	// Validate numeric options — guard against NaN/Infinity/swapped ranges
	if (!isFinite(axisMin) || !isFinite(axisMax)) {
		console.warn(`[fitWidth] axisMin and axisMax must be finite numbers; got ${axisMin}, ${axisMax}`)
		return
	}
	if (!isFinite(maxTracking) || maxTracking < 0) {
		console.warn(`[fitWidth] maxTracking must be a finite non-negative number; got ${maxTracking}`)
		return
	}

	// Pre-compile the axis regex pattern once for this call (reused across all iterations)
	const axisPattern = makeAxisPattern(axis)

	// Save original inline styles on first call (idempotent for subsequent calls)
	if (!savedStyles.has(el)) {
		savedStyles.set(el, {
			fvs: el.style.fontVariationSettings,
			letterSpacing: el.style.letterSpacing,
		})
	}

	// Reset to saved originals before re-fitting (makes repeated calls idempotent)
	const saved = savedStyles.get(el)!
	el.style.fontVariationSettings = saved.fvs
	el.style.letterSpacing = saved.letterSpacing

	// Resolve target width (read AFTER reset so parent geometry is stable)
	const targetWidth = resolveTarget(el, options.target)

	if (targetWidth <= 0) return

	// Batch computed-style reads before entering the binary search loops
	const cs = getComputedStyle(el)
	const baseFVS = cs.fontVariationSettings
	const fontSize = parseFloat(cs.fontSize)

	if (prefer === 'tracking') {
		// Tracking-only mode: binary search letter-spacing, leave font-variation-settings alone
		binarySearchTracking(el, targetWidth, fontSize, maxTracking, tolerance)
	} else if (prefer === 'axis') {
		// Axis-only mode: zero out letter-spacing first, then binary search the axis
		el.style.letterSpacing = '0'
		binarySearchAxis(el, targetWidth, baseFVS, axis, axisPattern, axisMin, axisMax, tolerance)
	} else {
		// Auto mode: try axis first, then use letter-spacing to close any remaining gap
		const { gap } = binarySearchAxis(el, targetWidth, baseFVS, axis, axisPattern, axisMin, axisMax, tolerance)

		if (Math.abs(gap) > tolerance) {
			// Axis alone didn't converge — refine with letter-spacing from the
			// current axis position (already applied to el at the best value found)
			binarySearchTracking(el, targetWidth, fontSize, maxTracking, tolerance)
		}
	}

	// Restore scroll after style mutations
	requestAnimationFrame(() => {
		if (Math.abs(window.scrollY - scrollY) > 2) {
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		}
	})
}

/**
 * Remove fitWidth styles and restore the element to its original inline styles.
 * No-op if applyFitWidth was never called on this element.
 *
 * @param el - The element previously adjusted by applyFitWidth
 */
export function removeFitWidth(el: HTMLElement): void {
	const saved = savedStyles.get(el)
	if (!saved) return
	el.style.fontVariationSettings = saved.fvs
	el.style.letterSpacing = saved.letterSpacing
	savedStyles.delete(el)
}
