// fitWidth/src/react/useFitWidth.ts — React hook that applies fitWidth on mount and resize

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { applyFitWidth } from '../core/adjust'
import type { FitWidthOptions } from '../core/types'

/**
 * React hook that binary-searches the wdth axis and/or letter-spacing to make
 * the ref'd element fill a target width. Re-runs on container resize and after
 * fonts finish loading. Cleans up on unmount.
 *
 * @param options - FitWidthOptions (merged with defaults inside applyFitWidth)
 * @returns A ref to attach to the target headline element
 */
export function useFitWidth(options: FitWidthOptions = {}) {
	const ref = useRef<HTMLElement>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options

	// Destructure options that should trigger a re-run when they change
	const { target, prefer, axis, axisMin, axisMax, maxTracking, tolerance, respectReducedMotion } = options

	const run = useCallback(() => {
		const el = ref.current
		if (!el) return
		applyFitWidth(el, optionsRef.current)
	}, [target, prefer, axis, axisMin, axisMax, maxTracking, tolerance, respectReducedMotion])

	useLayoutEffect(() => {
		run()

		if (typeof ResizeObserver === 'undefined') return

		let lastWidth = 0
		let rafId = 0
		const ro = new ResizeObserver((entries) => {
			const w = Math.round(entries[0].contentRect.width)
			if (w === lastWidth) return
			lastWidth = w
			cancelAnimationFrame(rafId)
			rafId = requestAnimationFrame(run)
		})
		ro.observe(ref.current!)

		return () => {
			ro.disconnect()
			cancelAnimationFrame(rafId)
		}
	}, [run])

	// Re-run after fonts finish loading — measurements before font-swap produce
	// incorrect widths and the fit will be off until the real font is available
	useEffect(() => {
		document.fonts.ready.then(run)
	}, [run])

	// Re-evaluate when the user changes their motion preference at the OS level.
	// Only active when respectReducedMotion is true — applyFitWidth handles the
	// guard internally, so calling run() on either change direction is correct:
	// if they disable reduced-motion the fit applies; if they enable it, the early
	// return in applyFitWidth skips the fit (styles are not changed).
	useEffect(() => {
		if (!respectReducedMotion) return
		if (typeof window === 'undefined') return
		if (typeof window.matchMedia !== 'function') return

		const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
		const handler = () => run()
		mql.addEventListener('change', handler)
		return () => mql.removeEventListener('change', handler)
	}, [respectReducedMotion, run])

	return ref
}
