"use client"

// Interactive demo: drag a width slider (or move cursor/tilt/angular) to see headlines fill their container exactly
import { useState, useEffect, useCallback, useLayoutEffect, useRef, useMemo } from "react"
import { applyFitWidth } from "@liiift-studio/fitwidth"
import type { FitWidthOptions } from "@liiift-studio/fitwidth"

type PreferMode = NonNullable<FitWidthOptions['prefer']>

/** Labels for the three demo headlines */
const HEADLINES = ["Typography", "Display Type", "Headline"]

/** Cursor icon SVG */
function CursorIcon() {
	return (
		<svg width="11" height="14" viewBox="0 0 11 14" fill="currentColor" aria-hidden>
			<path d="M0 0L0 11L3 8L5 13L6.8 12.3L4.8 7.3L8.5 7.3Z" />
		</svg>
	)
}

/** Gyroscope icon SVG — circle with rotation arrow */
function GyroIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
			<circle cx="7" cy="7" r="5.5" />
			<circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
			<path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" strokeWidth="1.4" />
			<path d="M11.5 5.5 L12.5 7 L13.8 6" strokeWidth="1.2" />
		</svg>
	)
}

/**
 * Single headline row — applies applyFitWidth directly (not via FitWidthText) to avoid
 * React style-prop reset of fontVariationSettings on re-renders. ResizeObserver watches
 * the container div (not the inline-block element) so it fires on parent-width changes.
 */
function HeadlineRow({ text, containerPct, prefer, showInternals }: { text: string; containerPct: number; prefer: PreferMode; showInternals: boolean }) {
	const containerRef = useRef<HTMLDivElement>(null)
	const elRef = useRef<HTMLParagraphElement>(null)
	// Ref-based readout avoids state re-renders that would reset FVS via React style prop
	const readoutRef = useRef<HTMLSpanElement>(null)

	const apply = useCallback(() => {
		const el = elRef.current
		if (!el) return
		applyFitWidth(el, { target: 'container', prefer, axisMin: 25, axisMax: 151 })
		if (readoutRef.current) {
			const fvs = el.style.fontVariationSettings || '—'
			const ls = el.style.letterSpacing || '0em'
			readoutRef.current.textContent = `fvs: ${fvs}  ls: ${ls}`
		}
	}, [prefer])

	// Re-run on prefer change; observe the container for resize (not the element itself,
	// since inline-block element width doesn't change when the container resizes)
	useLayoutEffect(() => {
		apply()
		const container = containerRef.current
		if (!container || typeof ResizeObserver === 'undefined') return
		const ro = new ResizeObserver(apply)
		ro.observe(container)
		return () => ro.disconnect()
	}, [apply])

	// Re-run after fonts load once on mount — ResizeObserver handles subsequent re-fits.
	// Deps are intentionally [] to avoid re-subscribing every time apply reference changes;
	// document.fonts.ready stays resolved so re-subscribing with [apply] causes double-applies.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		document.fonts.ready.then(apply)
	}, [])

	return (
		<div className="flex flex-col gap-2">
			{/* Container with visible border — the headline should be flush to both edges */}
			<div
				ref={containerRef}
				style={{
					width: `${containerPct}%`,
					border: '1px solid color-mix(in oklch, var(--foreground) 25%, transparent)',
					borderRadius: 4,
					padding: '8px 0',
					overflow: 'hidden',
					background: 'color-mix(in oklch, var(--foreground) 4%, transparent)',
				}}
			>
				<p
					ref={elRef}
					aria-hidden="true"
					style={{
						fontFamily: "'Roboto Flex', sans-serif",
						fontSize: "clamp(2.5rem, 8vw, 6rem)",
						fontWeight: 400,
						lineHeight: 1.1,
						margin: 0,
						display: 'inline-block',
						whiteSpace: 'nowrap',
					}}
				>
					{text}
				</p>
			</div>
			{/* Live readout updated via ref to avoid state-driven re-renders */}
			{showInternals && (
				<div className="flex gap-6 text-xs text-muted font-mono tabular-nums">
					<span ref={readoutRef} aria-live="polite" aria-atomic="true">fvs: —  ls: 0em</span>
				</div>
			)}
		</div>
	)
}

/** Interactive demo with container width slider, prefer mode toggle, cursor/gyro, and angular width */
export default function Demo() {
	const [containerPct, setContainerPct] = useState(80)
	const [prefer, setPrefer] = useState<PreferMode>('auto')
	const [showInternals, setShowInternals] = useState(true)

	// Interaction modes — mutually exclusive
	const [cursorMode, setCursorMode] = useState(false)
	const [gyroMode, setGyroMode] = useState(false)
	const [angularMode, setAngularMode] = useState(false)

	// Angular mode parameters
	const [viewingDistanceCm, setViewingDistanceCm] = useState(60)
	const [angleDeg, setAngleDeg] = useState(5)

	// Ref to the outer wrapper to measure actual container pixel width for angular computation
	const demoRef = useRef<HTMLDivElement>(null)
	// Measured pixel width of the demo wrapper — kept in state so angular pct recomputes on resize
	const [demoWidth, setDemoWidth] = useState(800)

	// Gyro-driven container pct — kept separate from slider state so slider value props
	// never change during gyro mode (which would cause mobile to scroll to the input)
	const [gyroContainerPct, setGyroContainerPct] = useState(80)
	// Permission denial feedback for iOS gyro
	const [gyroDenied, setGyroDenied] = useState(false)

	// Detected capabilities — resolved client-side after mount
	const [showCursor, setShowCursor] = useState(false)
	const [showGyro, setShowGyro] = useState(false)

	useEffect(() => {
		const isHover = window.matchMedia('(hover: hover)').matches
		const isTouch = window.matchMedia('(hover: none)').matches
		setShowCursor(isHover)
		setShowGyro(isTouch && 'DeviceOrientationEvent' in window)
	}, [])

	// Track demo wrapper width for accurate angular pct computation
	useEffect(() => {
		const el = demoRef.current
		if (!el || typeof ResizeObserver === 'undefined') return
		const ro = new ResizeObserver(entries => {
			const w = entries[0]?.contentRect.width
			if (w) setDemoWidth(w)
		})
		ro.observe(el)
		// Set initial width once mounted
		setDemoWidth(el.getBoundingClientRect().width || 800)
		return () => ro.disconnect()
	}, [])

	// Compute pixel target from angular parameters: 2 * distance_mm * tan(angle/2) * (96px/25.4mm)
	const { angularPxRounded, angularContainerPct } = useMemo(() => {
		const pxTarget = 2 * (viewingDistanceCm * 10) * Math.tan((angleDeg / 2) * (Math.PI / 180)) * (96 / 25.4)
		return {
			angularPxRounded: Math.round(pxTarget),
			angularContainerPct: Math.min(100, Math.max(1, (pxTarget / demoWidth) * 100)),
		}
	}, [viewingDistanceCm, angleDeg, demoWidth])

	// Effective container pct — priority: gyro > angular > slider
	const effectiveContainerPct = gyroMode
		? gyroContainerPct
		: angularMode
			? angularContainerPct
			: containerPct

	// Cursor mode — X controls container width (left = narrow, right = wide)
	useEffect(() => {
		if (!cursorMode) return
		const handleMove = (e: MouseEvent) => {
			setContainerPct(Math.round(30 + (e.clientX / window.innerWidth) * (100 - 30)))
		}
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setCursorMode(false)
		}
		window.addEventListener('mousemove', handleMove)
		window.addEventListener('keydown', handleKey)
		return () => {
			window.removeEventListener('mousemove', handleMove)
			window.removeEventListener('keydown', handleKey)
		}
	}, [cursorMode])

	// Gyro mode — gamma (left/right tilt) controls container width.
	// Updates gyroContainerPct (not slider state) so slider value props stay frozen,
	// preventing mobile browsers from scrolling to the input on each orientation update.
	// rAF throttle limits re-renders to one per frame.
	useEffect(() => {
		if (!gyroMode) return
		let rafId: number | null = null
		const handleOrientation = (e: DeviceOrientationEvent) => {
			if (rafId !== null) return
			rafId = requestAnimationFrame(() => {
				rafId = null
				if (e.gamma !== null) {
					// gamma: -90 (tilt left) to 90 (tilt right) → containerPct 30–100%
					setGyroContainerPct(Math.round(30 + ((e.gamma + 90) / 180) * (100 - 30)))
				}
			})
		}
		window.addEventListener('deviceorientation', handleOrientation)
		return () => {
			window.removeEventListener('deviceorientation', handleOrientation)
			if (rafId !== null) cancelAnimationFrame(rafId)
		}
	}, [gyroMode])

	// Toggle cursor mode — turns off gyro and angular if active
	const toggleCursor = useCallback(() => {
		setGyroMode(false)
		setAngularMode(false)
		setGyroDenied(false)
		setCursorMode(v => !v)
	}, [])

	// Toggle gyro mode — requests iOS permission if needed, turns off cursor and angular if active
	const toggleGyro = useCallback(async () => {
		if (gyroMode) {
			setGyroMode(false)
			setGyroDenied(false)
			return
		}
		setCursorMode(false)
		setAngularMode(false)
		setGyroDenied(false)
		const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
			requestPermission?: () => Promise<PermissionState>
		}
		if (typeof DOE.requestPermission === 'function') {
			const permission = await DOE.requestPermission()
			if (permission === 'granted') {
				setGyroMode(true)
			} else {
				setGyroDenied(true)
			}
		} else {
			setGyroMode(true)
		}
	}, [gyroMode])

	// Toggle angular mode — turns off cursor and gyro if active
	const toggleAngular = useCallback(() => {
		setCursorMode(false)
		setGyroMode(false)
		setGyroDenied(false)
		setAngularMode(v => !v)
	}, [])

	// activeMode: any non-default interaction mode is active
	const activeMode = cursorMode || gyroMode || angularMode

	return (
		<div ref={demoRef} className="w-full flex flex-col gap-8">
			{/* Controls */}
			<div className="flex flex-wrap items-center gap-6">
				{/* Container width slider — hidden in angular mode */}
				{!angularMode && (
					<div className="flex flex-col gap-1 min-w-48 flex-1">
						<div className="flex justify-between text-xs uppercase tracking-[0.18em] font-medium text-muted">
							<span>Container Width</span>
							{/* Show effective pct so label matches what headlines are actually fitted to */}
							<span className="tabular-nums">{Math.round(effectiveContainerPct)}%</span>
						</div>
						<input
							type="range"
							min={30}
							max={100}
							step={1}
							value={containerPct}
							aria-label="Container width percentage"
							aria-valuetext={`${Math.round(effectiveContainerPct)} percent`}
							title={cursorMode || gyroMode ? "Disabled while cursor/gyro mode is active" : "Drag to resize the container — fitWidth will re-fit each headline to the new width"}
							disabled={cursorMode || gyroMode}
							onChange={e => setContainerPct(Number(e.target.value))}
							onTouchStart={e => e.stopPropagation()}
							style={{ touchAction: 'none', opacity: (cursorMode || gyroMode) ? 0.3 : undefined }}
						/>
					</div>
				)}

				{/* Angular mode sliders — shown only in angular mode */}
				{angularMode && (
					<>
						<div className="flex flex-col gap-1 min-w-48 flex-1">
							<div className="flex justify-between text-xs uppercase tracking-[0.18em] font-medium text-muted">
								<span>Angular Width</span>
								<span className="tabular-nums">{angleDeg}° <span style={{ opacity: 0.7 }}>(≈ {angularPxRounded}px)</span></span>
							</div>
							<input
								type="range"
								min={0.5}
								max={20}
								step={0.5}
								value={angleDeg}
								aria-label="Angular width in degrees"
								aria-valuetext={`${angleDeg} degrees, approximately ${angularPxRounded} pixels`}
								title="Set the visual angle subtended by the text — combined with viewing distance this determines the physical pixel width fitWidth targets"
								onChange={e => setAngleDeg(Number(e.target.value))}
								onTouchStart={e => e.stopPropagation()}
								style={{ touchAction: 'none' }}
							/>
						</div>
						<div className="flex flex-col gap-1 min-w-48 flex-1">
							<div className="flex justify-between text-xs uppercase tracking-[0.18em] font-medium text-muted">
								<span>Viewing Distance</span>
								<span className="tabular-nums">{viewingDistanceCm}cm</span>
							</div>
							<input
								type="range"
								min={30}
								max={150}
								step={1}
								value={viewingDistanceCm}
								aria-label="Viewing distance in centimetres"
								aria-valuetext={`${viewingDistanceCm} centimetres`}
								title="Set how far the reader sits from the display — longer distances mean more pixels are needed to subtend the same angle"
								onChange={e => setViewingDistanceCm(Number(e.target.value))}
								onTouchStart={e => e.stopPropagation()}
								style={{ touchAction: 'none' }}
							/>
						</div>
					</>
				)}

				{/* Prefer mode toggle */}
				<div className="flex items-center gap-2 flex-shrink-0">
					<span className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Prefer</span>
					{(['auto', 'axis', 'tracking'] as const).map(v => (
						<button
							key={v}
							onClick={() => setPrefer(v)}
							aria-pressed={prefer === v}
							title={
								v === 'auto'     ? 'Let fitWidth choose: uses the wdth axis first, falls back to letter-spacing when the axis range is exhausted' :
								v === 'axis'     ? 'Fit using the variable font wdth axis only — letter-spacing is never touched' :
								                   'Fit using letter-spacing only — wdth axis is never changed'
							}
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

				{/* Show/hide internals toggle */}
				<button
					onClick={() => setShowInternals(v => !v)}
					aria-pressed={showInternals}
					title="Toggle the live fontVariationSettings and letter-spacing readout beneath each headline"
					className="text-xs px-3 py-1 rounded-full border transition-opacity"
					style={{ borderColor: 'currentColor', opacity: showInternals ? 1 : 0.4, background: showInternals ? 'var(--btn-bg)' : 'transparent' }}
				>
					{showInternals ? 'Hide internals' : 'Show internals'}
				</button>
			</div>

			{/* Cursor / gyro / angular mode toggles */}
			<div className="flex flex-wrap items-center gap-3">
				{showCursor && (
					<button
						onClick={toggleCursor}
						aria-pressed={cursorMode}
						title="Move cursor left/right to control container width"
						className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all"
						style={{
							borderColor: 'currentColor',
							opacity: cursorMode ? 1 : 0.5,
							background: cursorMode ? 'var(--btn-bg)' : 'transparent',
						}}
					>
						<CursorIcon />
						<span>{cursorMode ? 'Esc to exit' : 'Cursor'}</span>
					</button>
				)}
				{showGyro && (
					<button
						onClick={toggleGyro}
						aria-pressed={gyroMode}
						title="Tilt left/right to control container width"
						className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all"
						style={{
							borderColor: 'currentColor',
							opacity: gyroMode ? 1 : 0.5,
							background: gyroMode ? 'var(--btn-bg)' : 'transparent',
						}}
					>
						<GyroIcon />
						<span>{gyroMode ? 'Tilt active' : 'Tilt'}</span>
					</button>
				)}
				<button
					onClick={toggleAngular}
					aria-pressed={angularMode}
					title="Angular mode: replaces the width slider with angular (degrees) and viewing-distance controls. The container width is derived from a visual angle rather than a percentage."
					className="text-xs px-3 py-1 rounded-full border transition-all"
					style={{
						borderColor: 'currentColor',
						opacity: angularMode ? 1 : 0.5,
						background: angularMode ? 'var(--btn-bg)' : 'transparent',
					}}
				>
					Angular
				</button>
				{/* aria-live region so screen readers hear the hint when a mode activates */}
				<div aria-live="polite" aria-atomic="true" className="contents">
					{activeMode && (
						<p className="text-xs text-muted italic">
							{cursorMode
								? 'Move cursor left/right to adjust container width. Press Esc to exit.'
								: gyroMode
									? 'Tilt left/right to adjust container width.'
									: 'Angular mode active — width is set by degrees and viewing distance.'}
						</p>
					)}
					{gyroDenied && (
						<p className="text-xs opacity-70 italic" style={{ color: 'rgb(255 150 150)' }}>
							Motion permission denied. Enable motion access in your device settings to use tilt mode.
						</p>
					)}
				</div>
			</div>

			{/* Headlines */}
			<div className="flex flex-col gap-6">
				{HEADLINES.map((text) => (
					<HeadlineRow
						key={text}
						text={text}
						containerPct={effectiveContainerPct}
						prefer={prefer}
						showInternals={showInternals}
					/>
				))}
			</div>

			<p className="text-xs text-muted italic" style={{ lineHeight: "1.8" }}>
				Each headline fills its container exactly — to within half a pixel. Drag the slider to resize the container. Switch prefer mode to see the wdth axis or letter-spacing used in isolation. Smartwatches and fixed-width displays make this non-negotiable — a headline that almost fills a round watch face looks broken; one that fills it exactly looks intentional.
			</p>
		</div>
	)
}
