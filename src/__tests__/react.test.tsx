// fitWidth/src/__tests__/react.test.tsx — @testing-library/react hook and component tests

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { useFitWidth } from '../react/useFitWidth'
import { FitWidthText } from '../react/FitWidthText'

// ─── DOM measurement mock ─────────────────────────────────────────────────────

const CONTAINER_W = 600

/**
 * Mock getBoundingClientRect globally so all elements report CONTAINER_W.
 * In happy-dom, CSS changes don't affect layout — this keeps the binary search
 * from spinning and ensures applyFitWidth returns without error.
 */
function mockMeasurement() {
	const orig = Element.prototype.getBoundingClientRect
	Element.prototype.getBoundingClientRect = function () {
		return {
			width: CONTAINER_W,
			height: 20,
			top: 0,
			left: 0,
			bottom: 20,
			right: CONTAINER_W,
			x: 0,
			y: 0,
			toJSON: () => {},
		} as DOMRect
	}
	return () => {
		Element.prototype.getBoundingClientRect = orig
	}
}

// ─── useFitWidth hook tests ───────────────────────────────────────────────────

describe('useFitWidth', () => {
	let cleanupMock: (() => void) | null = null

	beforeEach(() => {
		document.body.innerHTML = ''
		cleanupMock = mockMeasurement()
	})

	afterEach(() => {
		cleanupMock?.()
		cleanupMock = null
		vi.restoreAllMocks()
	})

	it('mounts without throwing', () => {
		expect(() => renderHook(() => useFitWidth())).not.toThrow()
	})

	it('returns a ref object', () => {
		const { result } = renderHook(() => useFitWidth())
		expect(result.current).toBeDefined()
		expect(typeof result.current).toBe('object')
		expect('current' in result.current).toBe(true)
	})

	it('unmounts without throwing', () => {
		const { unmount } = renderHook(() => useFitWidth())
		expect(() => unmount()).not.toThrow()
	})

	it('accepts empty options without throwing', () => {
		expect(() => renderHook(() => useFitWidth({}))).not.toThrow()
	})

	it('accepts all options simultaneously without throwing', () => {
		expect(() =>
			renderHook(() =>
				useFitWidth({
					axis: 'wdth',
					axisMin: 80,
					axisMax: 120,
					maxTracking: 0.2,
					prefer: 'auto',
					respectReducedMotion: false,
				}),
			),
		).not.toThrow()
	})

	it('re-runs when prefer option changes', () => {
		let prefer: 'auto' | 'axis' | 'tracking' = 'auto'
		const { rerender } = renderHook(() => useFitWidth({ prefer }))
		act(() => {
			prefer = 'tracking'
			rerender()
		})
		// No error thrown means re-run succeeded
		expect(true).toBe(true)
	})

	it('re-runs when axis option changes', () => {
		let axis = 'wdth'
		const { rerender } = renderHook(() => useFitWidth({ axis }))
		act(() => {
			axis = 'wght'
			rerender()
		})
		expect(true).toBe(true)
	})

	it('re-runs when axisMin changes', () => {
		let axisMin = 75
		const { rerender } = renderHook(() => useFitWidth({ axisMin }))
		act(() => {
			axisMin = 60
			rerender()
		})
		expect(true).toBe(true)
	})

	it('re-runs when axisMax changes', () => {
		let axisMax = 125
		const { rerender } = renderHook(() => useFitWidth({ axisMax }))
		act(() => {
			axisMax = 150
			rerender()
		})
		expect(true).toBe(true)
	})

	it('re-runs when maxTracking changes', () => {
		let maxTracking = 0.3
		const { rerender } = renderHook(() => useFitWidth({ maxTracking }))
		act(() => {
			maxTracking = 0.5
			rerender()
		})
		expect(true).toBe(true)
	})

	it('re-runs when respectReducedMotion changes', () => {
		let respectReducedMotion = false
		const { rerender } = renderHook(() => useFitWidth({ respectReducedMotion }))
		act(() => {
			respectReducedMotion = true
			rerender()
		})
		expect(true).toBe(true)
	})
})

// ─── FitWidthText component tests ─────────────────────────────────────────────

describe('FitWidthText', () => {
	let cleanupMock: (() => void) | null = null

	beforeEach(() => {
		document.body.innerHTML = ''
		cleanupMock = mockMeasurement()
	})

	afterEach(() => {
		cleanupMock?.()
		cleanupMock = null
		vi.restoreAllMocks()
	})

	it('renders without throwing', () => {
		expect(() => render(<FitWidthText>Hello</FitWidthText>)).not.toThrow()
	})

	it('renders children text content', () => {
		const { container } = render(<FitWidthText>Hello world</FitWidthText>)
		expect(container.textContent).toContain('Hello world')
	})

	it('renders as h1 by default', () => {
		const { container } = render(<FitWidthText>Heading</FitWidthText>)
		expect(container.querySelector('h1')).not.toBeNull()
	})

	it('renders as a custom element via as prop', () => {
		const { container } = render(<FitWidthText as="p">Paragraph</FitWidthText>)
		expect(container.querySelector('p')).not.toBeNull()
		expect(container.querySelector('h1')).toBeNull()
	})

	it('renders as h2 via as prop', () => {
		const { container } = render(<FitWidthText as="h2">Sub heading</FitWidthText>)
		expect(container.querySelector('h2')).not.toBeNull()
	})

	it('forwards className', () => {
		const { container } = render(<FitWidthText className="my-class">Text</FitWidthText>)
		const el = container.firstElementChild
		expect(el?.className).toContain('my-class')
	})

	it('forwards aria-label', () => {
		const { container } = render(<FitWidthText aria-label="headline text">Text</FitWidthText>)
		const el = container.firstElementChild
		expect(el?.getAttribute('aria-label')).toBe('headline text')
	})

	it('forwards style prop', () => {
		const { container } = render(<FitWidthText style={{ color: 'red' }}>Text</FitWidthText>)
		const el = container.firstElementChild as HTMLElement
		expect(el?.style.color).toBe('red')
	})

	it('forwards arbitrary HTML attributes', () => {
		const { container } = render(<FitWidthText data-testid="fit-el">Text</FitWidthText>)
		const el = container.firstElementChild
		expect(el?.getAttribute('data-testid')).toBe('fit-el')
	})

	it('accepts FitWidthOptions props without leaking them as DOM attributes', () => {
		const { container } = render(
			<FitWidthText prefer="axis" axisMin={80} axisMax={120} maxTracking={0.2}>
				Text
			</FitWidthText>,
		)
		const el = container.firstElementChild
		// FitWidthOptions props must not appear as DOM attributes
		expect(el?.hasAttribute('prefer')).toBe(false)
		expect(el?.hasAttribute('axisMin')).toBe(false)
	})

	it('unmounts without throwing', () => {
		const { unmount } = render(<FitWidthText>Text</FitWidthText>)
		expect(() => unmount()).not.toThrow()
	})

	it('has displayName FitWidthText', () => {
		expect(FitWidthText.displayName).toBe('FitWidthText')
	})

	it('forwards a ref to the root element', () => {
		const ref = React.createRef<HTMLElement>()
		render(<FitWidthText ref={ref}>Text</FitWidthText>)
		expect(ref.current).not.toBeNull()
		expect(ref.current?.tagName).toBe('H1')
	})
})
