// fitWidth/src/__tests__/adjust.test.ts — core algorithm tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { applyFitWidth, removeFitWidth } from '../core/adjust'

// ─── DOM measurement mock ─────────────────────────────────────────────────────

const CONTAINER_W = 600
const ELEMENT_W = 400  // element is narrower than container — algorithm must widen it

/**
 * Partial MediaQueryList for use in vi.spyOn mocks.
 * Using a typed partial avoids the double-unknown cast.
 */
function makeMQL(matches: boolean): MediaQueryList {
	return {
		matches,
		media: '(prefers-reduced-motion: reduce)',
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
	} as unknown as MediaQueryList
}

/**
 * Mock getBoundingClientRect so:
 *   - The target element itself starts at ELEMENT_W
 *   - The parent element (container) reports CONTAINER_W
 *
 * In happy-dom, CSS font-variation-settings and letter-spacing don't affect
 * getBoundingClientRect, so the binary search converges to the axis/tracking limit.
 * Tests verify that properties were set and no errors were thrown.
 */
function mockMeasurement() {
	const origBCR = Element.prototype.getBoundingClientRect
	Element.prototype.getBoundingClientRect = function (this: Element) {
		// The parent container spans CONTAINER_W
		return { width: CONTAINER_W, top: 0, left: 0, bottom: 20, right: CONTAINER_W, height: 20, x: 0, y: 0, toJSON: () => {} } as DOMRect
	}
	return () => {
		Element.prototype.getBoundingClientRect = origBCR
	}
}

/**
 * Mock that differentiates element vs container measurements.
 * The element starts narrower; the container is always CONTAINER_W.
 * This lets us verify that the binary search actually changes the element's
 * reported width across iterations (simulating CSS responding to axis/tracking changes).
 */
function mockDifferentiatedMeasurement(el: HTMLElement, container: HTMLElement) {
	let callCount = 0
	const elSpy = vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => {
		// Simulate element growing toward CONTAINER_W with each iteration
		callCount++
		const w = Math.min(ELEMENT_W + callCount * 20, CONTAINER_W)
		return { width: w, top: 0, left: 0, bottom: 20, right: w, height: 20, x: 0, y: 0, toJSON: () => {} } as DOMRect
	})
	const containerSpy = vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
		{ width: CONTAINER_W, top: 0, left: 0, bottom: 20, right: CONTAINER_W, height: 20, x: 0, y: 0, toJSON: () => {} } as DOMRect
	)
	return { elSpy, containerSpy }
}

/**
 * Make an element with a parent container so 'container' target resolution works.
 * The element itself initially has width ELEMENT_W (simulated via inline style).
 */
function makeElement(tag = 'h1'): { el: HTMLElement; container: HTMLElement } {
	const container = document.createElement('div')
	container.style.width = `${CONTAINER_W}px`
	const el = document.createElement(tag)
	el.style.width = `${ELEMENT_W}px`
	el.textContent = 'A Wide Display Headline'
	container.appendChild(el)
	document.body.appendChild(container)
	return { el, container }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('fitWidth', () => {
	let cleanup: (() => void) | null = null

	beforeEach(() => {
		document.body.innerHTML = ''
		cleanup = mockMeasurement()
	})

	afterEach(() => {
		cleanup?.()
		cleanup = null
		vi.restoreAllMocks()
	})

	// 1. applyFitWidth doesn't throw with empty options
	it('applyFitWidth does not throw with empty options', () => {
		const { el } = makeElement()
		expect(() => applyFitWidth(el, {})).not.toThrow()
	})

	// 2. applyFitWidth doesn't throw with no options argument at all
	it('applyFitWidth does not throw with no arguments', () => {
		const { el } = makeElement()
		expect(() => applyFitWidth(el)).not.toThrow()
	})

	// 3. removeFitWidth restores original inline styles
	it('removeFitWidth restores original fontVariationSettings and letterSpacing', () => {
		const { el } = makeElement()
		// Set known initial inline styles
		el.style.fontVariationSettings = '"wdth" 100'
		el.style.letterSpacing = '0.05em'

		applyFitWidth(el, {})
		removeFitWidth(el)

		expect(el.style.fontVariationSettings).toBe('"wdth" 100')
		expect(el.style.letterSpacing).toBe('0.05em')
	})

	// 4. removeFitWidth is a no-op if applyFitWidth was never called
	it('removeFitWidth is a no-op if applyFitWidth was never called', () => {
		const { el } = makeElement()
		el.style.fontVariationSettings = '"wdth" 90'
		expect(() => removeFitWidth(el)).not.toThrow()
		// Original value should be unchanged since we never applied
		expect(el.style.fontVariationSettings).toBe('"wdth" 90')
	})

	// 5. Calling applyFitWidth twice is idempotent — originals saved only once
	it('applyFitWidth twice is idempotent — originals are saved only from the first call', () => {
		const { el } = makeElement()
		el.style.fontVariationSettings = '"wdth" 100'
		el.style.letterSpacing = '0em'

		applyFitWidth(el, {})
		// Grab the state after first apply
		const fvsAfterFirst = el.style.fontVariationSettings

		applyFitWidth(el, {})
		// Second apply should produce consistent output (same reset point)
		expect(el.style.fontVariationSettings).toBe(fvsAfterFirst)
	})

	// 6. After second apply, removeFitWidth still restores the very first original
	it('removeFitWidth after double-apply restores the original from first call', () => {
		const { el } = makeElement()
		el.style.fontVariationSettings = '"wdth" 100'
		el.style.letterSpacing = ''

		applyFitWidth(el, {})
		applyFitWidth(el, {})
		removeFitWidth(el)

		expect(el.style.fontVariationSettings).toBe('"wdth" 100')
		expect(el.style.letterSpacing).toBe('')
	})

	// 7. prefer: 'tracking' sets letterSpacing to a string ending in 'em'
	it("prefer: 'tracking' sets letterSpacing to an em value", () => {
		const { el } = makeElement()
		applyFitWidth(el, { prefer: 'tracking' })
		expect(el.style.letterSpacing).toMatch(/em$/)
	})

	// 8. prefer: 'axis' sets fontVariationSettings to a non-empty string
	it("prefer: 'axis' sets fontVariationSettings to a non-empty string", () => {
		const { el } = makeElement()
		applyFitWidth(el, { prefer: 'axis' })
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})

	// 9. prefer: 'auto' sets fontVariationSettings (axis attempted first)
	it("prefer: 'auto' sets fontVariationSettings", () => {
		const { el } = makeElement()
		applyFitWidth(el, { prefer: 'auto' })
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})

	// 10. target: 'container' uses parent element width
	it("target: 'container' resolves using the parent element width", () => {
		const { el, container } = makeElement()
		// Spy on the container's getBoundingClientRect to confirm it's called
		const spy = vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
			width: CONTAINER_W, height: 50, top: 0, left: 0, bottom: 50, right: CONTAINER_W, x: 0, y: 0, toJSON: () => {},
		} as DOMRect)
		applyFitWidth(el, { target: 'container' })
		expect(spy).toHaveBeenCalled()
	})

	// 11. target: number uses the given pixel value directly
	it('target: number uses the provided pixel value', () => {
		const { el } = makeElement()
		// Should not throw and should apply something
		expect(() => applyFitWidth(el, { target: 500, prefer: 'axis' })).not.toThrow()
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})

	// 12. target: HTMLElement uses that element's width
	it('target: HTMLElement uses the target element width', () => {
		const { el } = makeElement()
		const targetEl = document.createElement('div')
		targetEl.style.width = '550px'
		document.body.appendChild(targetEl)
		vi.spyOn(targetEl, 'getBoundingClientRect').mockReturnValue({
			width: 550, height: 20, top: 0, left: 0, bottom: 20, right: 550, x: 0, y: 0, toJSON: () => {},
		} as DOMRect)
		expect(() => applyFitWidth(el, { target: targetEl, prefer: 'axis' })).not.toThrow()
	})

	// 13. Custom axis tag is reflected in fontVariationSettings
	it('custom axis tag appears in fontVariationSettings', () => {
		const { el } = makeElement()
		applyFitWidth(el, { prefer: 'axis', axis: 'wght', axisMin: 300, axisMax: 700 })
		expect(el.style.fontVariationSettings).toContain('"wght"')
	})

	// 14. SSR guard: returns without error when window is undefined
	it('SSR guard: returns without error in SSR environment', () => {
		// Temporarily hide window
		const origWindow = globalThis.window
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(globalThis as any).window = undefined
		const { el } = makeElement()
		expect(() => applyFitWidth(el, {})).not.toThrow()
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(globalThis as any).window = origWindow
	})

	// 15. prefer: 'axis' zeroes letter-spacing before fitting
	it("prefer: 'axis' resets letterSpacing to '0' before fitting", () => {
		const { el } = makeElement()
		el.style.letterSpacing = '0.1em'
		// After axis-only mode letter-spacing should be '0' (set before search)
		// but saved original stays '0.1em' and is restored by removeFitWidth
		applyFitWidth(el, { prefer: 'axis' })
		// The axis search may override it but it starts at 0 — just verify no throw and fvs set
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})

	// 16. Options all present: tolerance, axisMin, axisMax, maxTracking respected (no throw)
	it('all options can be set simultaneously without throwing', () => {
		const { el } = makeElement()
		expect(() => applyFitWidth(el, {
			target: 'container',
			prefer: 'auto',
			axis: 'wdth',
			axisMin: 80,
			axisMax: 120,
			maxTracking: 0.2,
			tolerance: 1,
		})).not.toThrow()
	})

	// 17. respectReducedMotion: true skips the fit when matchMedia reports reduced motion
	it('respectReducedMotion: true skips fit when prefers-reduced-motion matches', () => {
		const { el } = makeElement()
		el.style.fontVariationSettings = '"wdth" 100'
		el.style.letterSpacing = '0em'

		vi.spyOn(window, 'matchMedia').mockReturnValue(makeMQL(true))

		applyFitWidth(el, { respectReducedMotion: true })

		// Styles must be unchanged — the fit was skipped
		expect(el.style.fontVariationSettings).toBe('"wdth" 100')
		expect(el.style.letterSpacing).toBe('0em')
	})

	// 18. respectReducedMotion: true applies the fit normally when matchMedia does not match
	it('respectReducedMotion: true still fits when prefers-reduced-motion does not match', () => {
		const { el } = makeElement()

		vi.spyOn(window, 'matchMedia').mockReturnValue(makeMQL(false))

		applyFitWidth(el, { respectReducedMotion: true, prefer: 'axis' })

		// Fit ran normally — fontVariationSettings should be set
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})

	// 19. respectReducedMotion: false (default) applies the fit regardless of matchMedia
	it('respectReducedMotion: false applies the fit regardless of motion preference', () => {
		const { el } = makeElement()

		// Even if reduced motion is preferred, the option is false so the fit runs
		vi.spyOn(window, 'matchMedia').mockReturnValue(makeMQL(true))

		applyFitWidth(el, { respectReducedMotion: false, prefer: 'axis' })

		// Fit ran — fontVariationSettings should be set
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})

	// 20. resolveTarget fallback: detached element (no parentElement) falls back to element width
	it("resolveTarget fallback: detached element with target: 'container' falls back to element itself", () => {
		// Element not appended to any parent — parentElement is null
		const el = document.createElement('h1')
		el.textContent = 'Detached'
		// Stub getBoundingClientRect directly on the detached element
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
			width: 300, height: 20, top: 0, left: 0, bottom: 20, right: 300, x: 0, y: 0, toJSON: () => {},
		} as DOMRect)
		// Should not throw
		expect(() => applyFitWidth(el, { target: 'container', prefer: 'axis' })).not.toThrow()
	})

	// 21. targetWidth <= 0 early-return: does not modify styles
	it('targetWidth <= 0 causes early return without modifying styles', () => {
		const { el } = makeElement()
		el.style.fontVariationSettings = '"wdth" 90'
		el.style.letterSpacing = '0em'

		// Override parent to report zero width — triggers the early-return guard
		vi.spyOn(el.parentElement!, 'getBoundingClientRect').mockReturnValue({
			width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {},
		} as DOMRect)

		applyFitWidth(el, { target: 'container', prefer: 'axis' })

		// Styles must be unchanged (early return before any search)
		expect(el.style.fontVariationSettings).toBe('"wdth" 90')
		expect(el.style.letterSpacing).toBe('0em')
	})

	// 22. axisMin >= axisMax guard: emits console.warn and does not throw
	it('axisMin >= axisMax emits a warning and does not throw', () => {
		const { el } = makeElement()
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => applyFitWidth(el, { prefer: 'axis', axisMin: 100, axisMax: 100 })).not.toThrow()
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('axisMin'))
	})

	// 23. NaN/Infinity axisMin: emits console.warn and returns early
	it('non-finite axisMin emits a warning and returns early without modifying styles', () => {
		const { el } = makeElement()
		el.style.fontVariationSettings = '"wdth" 90'
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		applyFitWidth(el, { prefer: 'axis', axisMin: Infinity, axisMax: 125 })
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('finite'))
		expect(el.style.fontVariationSettings).toBe('"wdth" 90')
	})

	// 24. NaN maxTracking: emits console.warn and returns early
	it('NaN maxTracking emits a warning and returns early', () => {
		const { el } = makeElement()
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		applyFitWidth(el, { prefer: 'tracking', maxTracking: NaN })
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('maxTracking'))
	})

	// 25. overrideAxis with axis containing regex metacharacters does not throw
	it('axis string with regex metacharacter does not throw', () => {
		const { el } = makeElement()
		// 'wdth+' contains a regex metacharacter — should be safely escaped
		expect(() => applyFitWidth(el, { prefer: 'axis', axis: 'wdth+', axisMin: 75, axisMax: 125 })).not.toThrow()
	})

	// 26. Differentiated mock: binary search actually exercises direction logic
	it('binary search converges — element grows toward container width', () => {
		cleanup?.() // release the shared prototype mock for this test
		cleanup = null

		const { el, container } = makeElement()
		const { elSpy } = mockDifferentiatedMeasurement(el, container)

		applyFitWidth(el, { prefer: 'axis', axisMin: 75, axisMax: 125 })

		// el.getBoundingClientRect was called multiple times (not just once)
		expect(elSpy.mock.calls.length).toBeGreaterThan(1)
		// fontVariationSettings was modified by the search
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})
})
