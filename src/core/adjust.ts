// fitWidth/src/core/adjust.ts — framework-agnostic binary-search width fitting algorithm.
// Measurement runs through an injectable MeasureBackend (from @liiift-studio/measure-core),
// so the same search ports to non-DOM hosts (Figma temp node, InDesign composer). The DOM
// path measures candidates on an off-screen probe, writing the visible element only once.

import { DomMeasureBackend, type MeasureBackend } from '@liiift-studio/measure-core'
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
 * Build a RegExp matching a single axis value inside a font-variation-settings string.
 * Pre-compiled once per call for reuse across all binary-search iterations.
 */
function makeAxisPattern(axis: string): RegExp {
	// Use hyphen-first in character class so it is treated as a literal, not a range.
	return new RegExp(`(["'])${escapeRegExp(axis)}\\1\\s+[-\\d.eE+]+`)
}

/**
 * Override a single axis value inside a font-variation-settings string, preserving
 * all other axis values. Adds the axis if not already present.
 *
 * e.g. overrideAxis('"wght" 300, "opsz" 18', 'wdth', 90) → '"wght" 300, "opsz" 18, "wdth" 90'
 */
function overrideAxis(baseFVS: string, axis: string, value: number, pattern: RegExp): string {
	if (!baseFVS || baseFVS === 'normal') return `"${axis}" ${value}`
	const replacement = `"${axis}" ${value}`
	return pattern.test(baseFVS)
		? baseFVS.replace(pattern, replacement)
		: `${baseFVS}, ${replacement}`
}

/**
 * Binary search the width axis to fit the measured text width to targetWidth.
 * Measures each candidate via backend.measureText — never mutates the live element.
 * Returns the best axis value, its gap from target, and the winning fvs string.
 */
function searchAxis(
	backend: MeasureBackend,
	text: string,
	baseFVS: string,
	axis: string,
	axisPattern: RegExp,
	axisMin: number,
	axisMax: number,
	tolerance: number,
	targetWidth: number,
	maxIterations = 20,
): { value: number; gap: number; fvs: string } {
	// Degenerate range — return the single value without looping.
	if (axisMin >= axisMax) {
		const fvs = overrideAxis(baseFVS, axis, axisMin, axisPattern)
		const measured = backend.measureText(text, { fontVariationSettings: fvs }).width
		console.warn(`[fitWidth] axisMin (${axisMin}) >= axisMax (${axisMax}); using ${axisMin}`)
		return { value: axisMin, gap: measured - targetWidth, fvs }
	}

	let lo = axisMin
	let hi = axisMax
	let bestValue = (lo + hi) / 2
	let bestGap = Infinity
	let bestFVS = overrideAxis(baseFVS, axis, bestValue, axisPattern)

	for (let i = 0; i < maxIterations; i++) {
		const mid = (lo + hi) / 2
		const fvs = overrideAxis(baseFVS, axis, mid, axisPattern)
		const measured = backend.measureText(text, { fontVariationSettings: fvs }).width
		const gap = measured - targetWidth

		if (Math.abs(gap) < Math.abs(bestGap)) {
			bestValue = mid
			bestGap = gap
			bestFVS = fvs
		}

		if (Math.abs(gap) <= tolerance) break

		// Higher axis value → wider text (assumes a standard width-expanding axis like wdth)
		if (gap < 0) lo = mid  // too narrow — increase axis value
		else hi = mid          // too wide — decrease axis value
	}

	return { value: bestValue, gap: bestGap, fvs: bestFVS }
}

/**
 * Binary search letter-spacing (in em) to close a remaining width gap.
 * Measures each candidate via backend.measureText. Clamps to ±maxTracking em.
 * Returns the best em value and its gap from target.
 */
function searchTracking(
	backend: MeasureBackend,
	text: string,
	fvs: string,
	fontSizePx: number,
	maxTracking: number,
	tolerance: number,
	targetWidth: number,
	maxIterations = 20,
): { value: number; gap: number } {
	// Without a positive font size we cannot convert em → px — leave tracking at 0.
	if (!(fontSizePx > 0)) {
		const measured = backend.measureText(text, { fontVariationSettings: fvs, letterSpacing: 0 }).width
		return { value: 0, gap: measured - targetWidth }
	}

	let lo = -maxTracking
	let hi = maxTracking
	let bestValue = 0
	let bestGap = Infinity

	for (let i = 0; i < maxIterations; i++) {
		const mid = (lo + hi) / 2  // em
		const measured = backend.measureText(text, {
			fontVariationSettings: fvs,
			letterSpacing: mid * fontSizePx,  // em → px
		}).width
		const gap = measured - targetWidth

		if (Math.abs(gap) < Math.abs(bestGap)) {
			bestValue = mid
			bestGap = gap
		}

		if (Math.abs(gap) <= tolerance) break

		// Higher letter-spacing → wider text
		if (gap < 0) lo = mid
		else hi = mid
	}

	return { value: bestValue, gap: bestGap }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fit a display headline element to an exact target width by binary-searching
 * the width variable font axis and/or letter-spacing.
 *
 * Does NOT wrap content in spans or rewrite innerHTML — only sets
 * el.style.fontVariationSettings and el.style.letterSpacing, once, after the search.
 *
 * Calling applyFitWidth multiple times is idempotent: original styles are saved
 * on the first call and reset internally before each re-fit.
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

	// Pre-compile the axis regex pattern once for this call
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

	// Batch computed-style reads before the search
	const cs = getComputedStyle(el)
	const baseFVS = cs.fontVariationSettings
	const fontSize = parseFloat(cs.fontSize)
	const text = el.textContent ?? ''

	// Measure candidates on an off-screen probe seeded from this element's font,
	// so the visible element is written only once (no search-time flicker/thrash).
	const backend = new DomMeasureBackend(el)
	try {
		if (prefer === 'tracking') {
			// Tracking-only: search letter-spacing, leave font-variation-settings alone
			const { value } = searchTracking(backend, text, baseFVS, fontSize, maxTracking, tolerance, targetWidth)
			el.style.letterSpacing = `${value}em`
		} else if (prefer === 'axis') {
			// Axis-only: zero out letter-spacing, then search the axis
			el.style.letterSpacing = '0'
			const { fvs } = searchAxis(backend, text, baseFVS, axis, axisPattern, axisMin, axisMax, tolerance, targetWidth)
			el.style.fontVariationSettings = fvs
		} else {
			// Auto: axis first, then close any remaining gap with letter-spacing
			const { fvs, gap } = searchAxis(backend, text, baseFVS, axis, axisPattern, axisMin, axisMax, tolerance, targetWidth)
			el.style.fontVariationSettings = fvs
			if (Math.abs(gap) > tolerance) {
				const { value } = searchTracking(backend, text, fvs, fontSize, maxTracking, tolerance, targetWidth)
				el.style.letterSpacing = `${value}em`
			}
		}
	} finally {
		backend.dispose()
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
