"use client"

// Interactive demo: drag a width slider to see headlines fill their container exactly
import { useState, useDeferredValue, useRef, useEffect } from "react"
import { FitWidthText } from "@liiift-studio/fitwidth"
import type { FitWidthOptions } from "@liiift-studio/fitwidth"

type PreferMode = NonNullable<FitWidthOptions['prefer']>

/** Labels for the three demo headlines */
const HEADLINES = ["Typography", "Display Type", "Headline"]

/** Reads current fontVariationSettings and letterSpacing from a DOM element */
function readAppliedStyles(el: HTMLElement | null): { fvs: string; ls: string } {
	if (!el) return { fvs: '—', ls: '—' }
	const fvs = el.style.fontVariationSettings || '—'
	const ls = el.style.letterSpacing || '0em'
	return { fvs, ls }
}

/** Single headline row with a container border to make flush-ness visible */
function HeadlineRow({ text, containerPct, prefer }: { text: string; containerPct: number; prefer: PreferMode }) {
	const elRef = useRef<HTMLElement | null>(null)
	const [fvs, setFvs] = useState('—')
	const [ls, setLs] = useState('0em')

	// After each render, read back the applied styles from the DOM element
	useEffect(() => {
		// Small rAF delay so FitWidthText has applied its styles
		const id = requestAnimationFrame(() => {
			const { fvs: nextFvs, ls: nextLs } = readAppliedStyles(elRef.current)
			setFvs(nextFvs)
			setLs(nextLs)
		})
		return () => cancelAnimationFrame(id)
	})

	return (
		<div className="flex flex-col gap-2">
			{/* Container with visible border — the headline should be flush to both edges */}
			<div
				style={{
					width: `${containerPct}%`,
					border: '1px solid rgba(212,184,240,0.25)',
					borderRadius: 4,
					padding: '8px 0',
					overflow: 'hidden',
					background: 'rgba(212,184,240,0.04)',
				}}
			>
				<FitWidthText
					ref={elRef as React.Ref<HTMLElement>}
					target="container"
					prefer={prefer}
					style={{
						fontFamily: "var(--font-merriweather), serif",
						fontVariationSettings: '"wght" 300, "opsz" 72',
						fontSize: "clamp(1.5rem, 5vw, 3.5rem)",
						lineHeight: 1.1,
						margin: 0,
						display: 'block',
						whiteSpace: 'nowrap',
					}}
				>
					{text}
				</FitWidthText>
			</div>
			{/* Live readout of applied styles */}
			<div className="flex gap-6 text-xs opacity-40 font-mono tabular-nums">
				<span>fvs: {fvs}</span>
				<span>ls: {ls}</span>
			</div>
		</div>
	)
}

/** Interactive demo with container width slider and prefer mode toggle */
export default function Demo() {
	const [containerPct, setContainerPct] = useState(80)
	const [prefer, setPrefer] = useState<PreferMode>('auto')

	const dContainerPct = useDeferredValue(containerPct)

	return (
		<div className="w-full flex flex-col gap-8">
			{/* Controls */}
			<div className="flex flex-wrap items-center gap-6">
				{/* Container width slider */}
				<div className="flex flex-col gap-1 min-w-48 flex-1">
					<div className="flex justify-between text-xs uppercase tracking-widest opacity-50">
						<span>Container Width</span>
						<span className="tabular-nums">{containerPct}%</span>
					</div>
					<input
						type="range"
						min={30}
						max={100}
						step={1}
						value={containerPct}
						aria-label="Container width percentage"
						onChange={e => setContainerPct(Number(e.target.value))}
						onTouchStart={e => e.stopPropagation()}
						style={{ touchAction: 'none' }}
					/>
				</div>

				{/* Prefer mode toggle */}
				<div className="flex items-center gap-2 flex-shrink-0">
					<span className="text-xs uppercase tracking-widest opacity-50">Prefer</span>
					{(['auto', 'axis', 'tracking'] as const).map(v => (
						<button
							key={v}
							onClick={() => setPrefer(v)}
							aria-pressed={prefer === v}
							className="text-xs px-3 py-1 rounded-full border transition-opacity"
							style={{
								borderColor: 'currentColor',
								opacity: prefer === v ? 1 : 0.4,
								background: prefer === v ? 'var(--btn-bg)' : 'transparent',
							}}
						>
							{v}
						</button>
					))}
				</div>
			</div>

			{/* Headlines */}
			<div className="flex flex-col gap-6">
				{HEADLINES.map((text) => (
					<HeadlineRow
						key={text}
						text={text}
						containerPct={dContainerPct}
						prefer={prefer}
					/>
				))}
			</div>

			<p className="text-xs opacity-50 italic" style={{ lineHeight: "1.8" }}>
				Each headline fills its container exactly — to within half a pixel. Drag the slider to resize the container. Switch prefer mode to see the wdth axis or letter-spacing used in isolation.
			</p>
		</div>
	)
}
