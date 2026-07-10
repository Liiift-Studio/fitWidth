// fitWidth/src/framer/FitWidth.tsx — Framer code component wrapping the fitWidth core.
//
// Distribution: paste this file into Framer (Insert → Code → New Component), or host it as an
// ES module and add it by URL. It imports the framework-agnostic core straight from the CDN, so
// it needs no build step — applyFitWidth/removeFitWidth take a DOM element, not React, so there
// is no React version/externalisation issue.
//
// fitWidth is an APPLY-ONCE tool: it binary-searches the wdth axis and/or letter-spacing to fit
// a single-line headline to a target width, sets two inline styles once, and does not animate.
// There is therefore no rAF loop and no RenderTarget animate/static gating — the fit is desirable
// in every render target (canvas, preview, export). Because the result depends on the container
// width, a ResizeObserver re-fits whenever the parent's box changes.
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"
// Pin to a published version so shared instances stay stable. Bump when the core changes.
// The core is framework-agnostic (operates on a DOM element), so no React externalisation is needed.
import { applyFitWidth, removeFitWidth } from "https://esm.sh/@liiift-studio/fitwidth@1.0.18"

/** Props surfaced to the Framer UI via addPropertyControls, plus base text styling.
 *  Option fields are declared explicitly so the component needs no type import over HTTP. */
interface FitWidthFramerProps {
	/** The headline text to fit. Keep it to a single line. */
	text: string
	/** CSS font-family — SHOULD resolve to a variable font exposing the chosen axis (e.g. wdth). */
	fontFamily: string
	/** Font size in px. */
	fontSize: number
	/** Text colour. */
	color: string
	/** Horizontal text alignment. */
	textAlign: "left" | "center" | "right"
	/** How the target width is chosen: fill the parent box, or an exact pixel value. */
	targetMode: "container" | "pixels"
	/** Exact target width in px — used only when targetMode is 'pixels'. */
	targetPx: number
	/** Fitting strategy: axis first then tracking (auto), axis only, or tracking only. */
	prefer: "auto" | "axis" | "tracking"
	/** Variable font axis tag adjusted when prefer is 'auto' or 'axis'. */
	axis: string
	/** Minimum axis value for the binary search. */
	axisMin: number
	/** Maximum axis value for the binary search. */
	axisMax: number
	/** Maximum absolute letter-spacing in em (clamped to ±this value). */
	maxTracking: number
	/** Convergence tolerance in px — search stops once the gap is within this. */
	tolerance: number
	/** When true, skip fitting if the user has requested reduced motion. */
	respectReducedMotion: boolean
}

/**
 * Binary-search width fit (wdth axis + letter-spacing), as a Framer code component.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function FitWidth(props: Partial<FitWidthFramerProps>) {
	const {
		text = "Fit to width",
		fontFamily = "Roboto Flex",
		fontSize = 72,
		color = "#111111",
		textAlign = "left",
		targetMode = "container",
		targetPx = 600,
		prefer = "auto",
		axis = "wdth",
		axisMin = 25,
		axisMax = 151,
		maxTracking = 0.3,
		tolerance = 0.5,
		respectReducedMotion = false,
	} = props

	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return

		// 'container' fills the parent box; 'pixels' targets an exact width.
		const target = targetMode === "pixels" ? targetPx : "container"
		const options = { target, prefer, axis, axisMin, axisMax, maxTracking, tolerance, respectReducedMotion }

		// Apply-once fit. No rAF loop, no span wrapping — only two inline styles are set.
		applyFitWidth(el, options)

		// The fit depends on the container width, so re-fit whenever the parent box resizes
		// (Framer frame resize, responsive breakpoints). Guard for non-DOM/SSR hosts.
		const parent = el.parentElement
		const observer =
			typeof ResizeObserver !== "undefined" && parent
				? new ResizeObserver(() => applyFitWidth(el, options))
				: null
		if (observer && parent) observer.observe(parent)

		return () => {
			observer?.disconnect()
			removeFitWidth(el)
		}
	}, [
		text,
		fontFamily,
		fontSize,
		targetMode,
		targetPx,
		prefer,
		axis,
		axisMin,
		axisMax,
		maxTracking,
		tolerance,
		respectReducedMotion,
	])

	return (
		<div
			ref={ref}
			style={{
				fontFamily,
				fontSize,
				color,
				textAlign,
				lineHeight: 1.1,
				whiteSpace: "nowrap",
				width: "100%",
			}}
		>
			{text}
		</div>
	)
}

// Map every meaningful FitWidthOptions field to a Framer control.
// Omitted: `target` as an HTMLElement reference — an element ref cannot be a property control,
// so the 'container' | number cases are surfaced via targetMode + targetPx instead.
addPropertyControls(FitWidth, {
	text: {
		type: ControlType.String,
		title: "Text",
		defaultValue: "Fit to width",
		displayTextArea: false,
	},
	fontFamily: {
		type: ControlType.String,
		title: "Font",
		defaultValue: "Roboto Flex",
		description: "Use a variable font that exposes the chosen axis (e.g. wdth) for best results.",
	},
	fontSize: { type: ControlType.Number, title: "Size", defaultValue: 72, min: 8, max: 400, unit: "px" },
	color: { type: ControlType.Color, title: "Colour", defaultValue: "#111111" },
	textAlign: {
		type: ControlType.Enum,
		title: "Align",
		options: ["left", "center", "right"],
		optionTitles: ["Left", "Center", "Right"],
		defaultValue: "left",
		displaySegmentedControl: true,
	},
	targetMode: {
		type: ControlType.Enum,
		title: "Target",
		options: ["container", "pixels"],
		optionTitles: ["Container", "Pixels"],
		defaultValue: "container",
		displaySegmentedControl: true,
	},
	targetPx: {
		type: ControlType.Number,
		title: "Target px",
		defaultValue: 600,
		min: 50,
		max: 3000,
		unit: "px",
		hidden: (p: Partial<FitWidthFramerProps>) => p.targetMode !== "pixels",
	},
	prefer: {
		type: ControlType.Enum,
		title: "Strategy",
		options: ["auto", "axis", "tracking"],
		optionTitles: ["Auto", "Axis only", "Tracking only"],
		defaultValue: "auto",
	},
	axis: {
		type: ControlType.String,
		title: "Axis",
		defaultValue: "wdth",
		description: "Variable font width axis tag (used for Auto and Axis-only strategies).",
	},
	axisMin: { type: ControlType.Number, title: "Axis min", defaultValue: 25, min: 1, max: 1000, step: 1 },
	axisMax: { type: ControlType.Number, title: "Axis max", defaultValue: 151, min: 1, max: 1000, step: 1 },
	maxTracking: {
		type: ControlType.Number,
		title: "Max tracking",
		defaultValue: 0.3,
		min: 0,
		max: 2,
		step: 0.05,
		unit: "em",
	},
	tolerance: {
		type: ControlType.Number,
		title: "Tolerance",
		defaultValue: 0.5,
		min: 0.1,
		max: 10,
		step: 0.1,
		unit: "px",
	},
	respectReducedMotion: {
		type: ControlType.Boolean,
		title: "Reduce motion",
		defaultValue: false,
		enabledTitle: "Respect",
		disabledTitle: "Ignore",
	},
})
