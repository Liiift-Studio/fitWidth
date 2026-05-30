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
 * @returns A MutableRefObject to attach to the target headline element
 */
export function useFitWidth(options: FitWidthOptions = {}) {
	const ref = useRef<HTMLElement | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options

	// Track whether the hook is mounted so fire-and-forget async callbacks can bail out
	const mountedRef = useRef(true)

	// Destructure options that should trigger a re-run when they change
	const { target, prefer, axis, axisMin, axisMax, maxTracking, tolerance, respectReducedMotion } = options

	const run = useCallback(() => {
		const el = ref.current
		if (!el) return
		applyFitWidth(el, optionsRef.current)
	}, [target, prefer, axis, axisMin, axisMax, maxTracking, tolerance, respectReducedMotion])

	// Keep mountedRef current alongside the component lifecycle
	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	useLayoutEffect(() => {
		run()

		if (typeof ResizeObserver === 'undefined') return

		const el = ref.current
		if (!el) return

		// Observe the container (parent) rather than the fitted element itself.
		// If the element exhausts its axis/tracking range it becomes shorter than the
		// container, so observing the element would miss subsequent container resizes.
		const container = el.parentElement ?? el

		let lastWidth = 0
		let rafId = 0
		const ro = new ResizeObserver((entries) => {
			// Guard: spec allows empty entries array when element is detached
			if (!entries.length) return
			const w = Math.round(entries[0].contentRect.width)
			if (w === lastWidth) return
			lastWidth = w
			cancelAnimationFrame(rafId)
			rafId = requestAnimationFrame(run)
		})
		ro.observe(container)

		return () => {
			ro.disconnect()
			cancelAnimationFrame(rafId)
		}
	}, [run])

	// Re-run after fonts finish loading — measurements before font-swap produce
	// incorrect widths and the fit will be off until the real font is available.
	// Use 'loadingdone' for ongoing font-swap events (fonts.ready settles only once).
	// The fonts.ready.then path handles the initial page load.
	useEffect(() => {
		if (!document.fonts) return

		let cancelled = false

		// Initial load: fire once when fonts are ready
		document.fonts.ready.then(() => {
			if (!cancelled && mountedRef.current) run()
		}).catch(() => {})

		// Ongoing: re-run whenever additional fonts load after initial ready
		const handleLoadingDone = () => {
			if (!cancelled && mountedRef.current) run()
		}
		document.fonts.addEventListener('loadingdone', handleLoadingDone)

		return () => {
			cancelled = true
			document.fonts.removeEventListener('loadingdone', handleLoadingDone)
		}
		// Intentionally omit `run` from deps: fonts.ready is a one-time registration
		// and loadingdone should stay wired for the component lifetime without
		// re-registering on every options change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

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
