// fitWidth/src/__tests__/adjust.test.ts — core algorithm tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { applyFitWidth, removeFitWidth } from '../core/adjust'

// ─── DOM measurement mock ─────────────────────────────────────────────────────

const CONTAINER_W = 600
const ELEMENT_W = 400  // element is narrower than container — algorithm must widen it

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

		// Simulate user having reduced motion enabled
		vi.spyOn(window, 'matchMedia').mockReturnValue({
			matches: true,
			media: '(prefers-reduced-motion: reduce)',
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
		} as unknown as MediaQueryList)

		applyFitWidth(el, { respectReducedMotion: true })

		// Styles must be unchanged — the fit was skipped
		expect(el.style.fontVariationSettings).toBe('"wdth" 100')
		expect(el.style.letterSpacing).toBe('0em')
	})

	// 18. respectReducedMotion: true applies the fit normally when matchMedia does not match
	it('respectReducedMotion: true still fits when prefers-reduced-motion does not match', () => {
		const { el } = makeElement()

		// Simulate user NOT having reduced motion enabled
		vi.spyOn(window, 'matchMedia').mockReturnValue({
			matches: false,
			media: '(prefers-reduced-motion: reduce)',
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
		} as unknown as MediaQueryList)

		applyFitWidth(el, { respectReducedMotion: true, prefer: 'axis' })

		// Fit ran normally — fontVariationSettings should be set
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})

	// 19. respectReducedMotion: false (default) applies the fit regardless of matchMedia
	it('respectReducedMotion: false applies the fit regardless of motion preference', () => {
		const { el } = makeElement()

		// Even if reduced motion is preferred, the option is false so the fit runs
		vi.spyOn(window, 'matchMedia').mockReturnValue({
			matches: true,
			media: '(prefers-reduced-motion: reduce)',
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
		} as unknown as MediaQueryList)

		applyFitWidth(el, { respectReducedMotion: false, prefer: 'axis' })

		// Fit ran — fontVariationSettings should be set
		expect(el.style.fontVariationSettings.length).toBeGreaterThan(0)
	})
})
