// fitWidth/src/react/FitWidthText.tsx — React component wrapper for fitWidth

import React, { forwardRef, useCallback } from 'react'
import { useFitWidth } from './useFitWidth'
import type { FitWidthOptions } from '../core/types'

interface FitWidthTextProps extends FitWidthOptions {
	children: React.ReactNode
	className?: string
	style?: React.CSSProperties
	/** HTML element to render. Default: 'h1' */
	as?: React.ElementType
}

/**
 * Drop-in component that binary-searches the wdth axis and/or letter-spacing
 * to make the headline fill a target width. Forwards the ref to the root element.
 */
export const FitWidthText = forwardRef<HTMLElement, FitWidthTextProps>(
	function FitWidthText({ children, className, style, as: Tag = 'h1', ...options }, ref) {
		const innerRef = useFitWidth(options)

		/** Callback ref that satisfies both the forwarded ref and the internal hook ref */
		const mergedRef = useCallback(
			(node: HTMLElement | null) => {
				;(innerRef as React.MutableRefObject<HTMLElement | null>).current = node
				if (typeof ref === 'function') {
					ref(node)
				} else if (ref) {
					ref.current = node
				}
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[ref],
		)

		return (
			<Tag ref={mergedRef} className={className} style={style}>
				{children}
			</Tag>
		)
	},
)

FitWidthText.displayName = 'FitWidthText'
