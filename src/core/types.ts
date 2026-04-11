// fitWidth/src/core/types.ts — options interface for the fitWidth tool

/** Options controlling the fitWidth effect */
export interface FitWidthOptions {
	/**
	 * Target width to fill. Default: 'container'
	 *
	 * - **'container'** — fill the parent element's clientWidth
	 * - **number** — exact pixel target
	 * - **HTMLElement** — match the rendered width of another element
	 */
	target?: 'container' | number | HTMLElement

	/**
	 * Which strategy to use. Default: 'auto'
	 *
	 * - **'auto'** — try the wdth axis first (if available), fall back to letter-spacing
	 * - **'axis'** — wdth axis only (letter-spacing is set to 0 first)
	 * - **'tracking'** — letter-spacing only (font-variation-settings left unchanged)
	 */
	prefer?: 'auto' | 'axis' | 'tracking'

	/**
	 * Variable font axis tag to adjust when prefer is 'auto' or 'axis'. Default: 'wdth'
	 */
	axis?: string

	/** Minimum axis value for the binary search. Default: 75 */
	axisMin?: number

	/** Maximum axis value for the binary search. Default: 125 */
	axisMax?: number

	/** Maximum absolute letter-spacing in em (clamped to ±this value). Default: 0.3 */
	maxTracking?: number

	/** Convergence tolerance in pixels — search stops when gap is within this value. Default: 0.5 */
	tolerance?: number
}
