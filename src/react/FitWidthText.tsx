// fitWidth/src/react/FitWidthText.tsx — React component wrapper for fitWidth

import React, { forwardRef, useCallback } from 'react'
import { useFitWidth } from './useFitWidth'
import type { FitWidthOptions } from '../core/types'

/**
 * Props for FitWidthText.
 * Extends FitWidthOptions for algorithm configuration plus standard HTML attributes
 * so consumers can pass id, aria-*, role, event handlers, etc.
 * Note: `as` is a component-level prop and is not part of FitWidthOptions.
 */
interface FitWidthTextProps extends FitWidthOptions, React.HTMLAttributes<HTMLElement> {
	/** Content to render inside the element */
	children: React.ReactNode
	/** Additional CSS class names */
	className?: string
	/** Inline style overrides */
	style?: React.CSSProperties
	/** HTML element to render. Default: 'h1' */
	as?: React.ElementType
}

/**
 * Drop-in component that binary-searches the wdth axis and/or letter-spacing
 * to make the headline fill a target width. Forwards the ref to the root element
 * and passes all standard HTML/ARIA attributes through to the rendered element.
 */
export const FitWidthText = forwardRef<HTMLElement, FitWidthTextProps>(
	function FitWidthText(
		{
			children,
			className,
			style,
			as: Tag = 'h1',
			// Extract FitWidthOptions so they don't bleed into DOM props
			target,
			prefer,
			axis,
			axisMin,
			axisMax,
			maxTracking,
			tolerance,
			respectReducedMotion,
			...htmlProps
		},
		ref,
	) {
		const fitOptions: FitWidthOptions = { target, prefer, axis, axisMin, axisMax, maxTracking, tolerance, respectReducedMotion }
		const innerRef = useFitWidth(fitOptions)

		/** Callback ref that satisfies both the forwarded ref and the internal hook ref */
		const mergedRef = useCallback(
			(node: HTMLElement | null) => {
				// innerRef is MutableRefObject<HTMLElement | null> — assign directly
				innerRef.current = node
				if (typeof ref === 'function') {
					ref(node)
				} else if (ref) {
					;(ref as React.MutableRefObject<HTMLElement | null>).current = node
				}
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[ref],
		)

		return (
			<Tag ref={mergedRef} className={className} style={style} {...htmlProps}>
				{children}
			</Tag>
		)
	},
)

FitWidthText.displayName = 'FitWidthText'
