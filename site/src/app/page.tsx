import Demo from "@/components/Demo"
import CopyInstall from "@/components/CopyInstall"
import CodeBlock from "@/components/CodeBlock"
import ToolDirectory from "@/components/ToolDirectory"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<p className="text-xs uppercase tracking-widest opacity-50">fitwidth</p>
					<h1 className="text-4xl lg:text-8xl xl:text-9xl" style={{ fontFamily: "var(--font-merriweather), serif", fontVariationSettings: '"wght" 300, "opsz" 144', lineHeight: "1.05em" }}>
						Fill any width,<br />
						<span style={{ opacity: 0.5, fontStyle: "italic" }}>exactly.</span>
					</h1>
				</div>
				<div className="flex items-center gap-4">
					<CopyInstall />
					<a href="https://github.com/Liiift-Studio/FitWidth" className="text-sm opacity-50 hover:opacity-100 transition-opacity">GitHub</a>
				</div>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-50 tracking-wide">
					<span>TypeScript</span><span>·</span><span>Zero dependencies</span><span>·</span><span>React + Vanilla JS</span>
				</div>
				<p className="text-base opacity-60 leading-relaxed max-w-lg">
					CSS can&apos;t make a display headline fill its container — letter-spacing is proportional, and the wdth axis affects every character equally. Fit Width binary-searches both to converge on an exact width to within half a pixel.
				</p>
			</section>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4">
				<p className="text-xs uppercase tracking-widest opacity-50">Live demo — drag the slider</p>
				<div className="rounded-xl -mx-8 px-8 py-8" style={{ background: "rgba(0,0,0,0.25)", overflow: 'hidden' }}>
					<Demo />
				</div>
			</section>

			{/* Explanation */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<p className="text-xs uppercase tracking-widest opacity-50">How it works</p>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm leading-relaxed opacity-70">
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">CSS can&apos;t fit a headline</p>
						<p>letter-spacing adds a fixed amount after every character — it&apos;s proportional, not absolute. The wdth axis scales character shapes but doesn&apos;t guarantee a target width. Neither can converge on an exact measurement alone.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Binary search converges in 20 iterations</p>
						<p>Fit Width uses a classic binary search: measure the element, compare to target, move the midpoint. Within 15–20 iterations it converges to within the tolerance (default 0.5 px). The cost is negligible — no reflow until the final write.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Axis first, then tracking</p>
						<p>In <code className="text-xs font-mono">prefer=&apos;auto&apos;</code> mode, Fit Width tries the wdth axis first. If the axis range isn&apos;t enough to reach the target, letter-spacing closes the remaining gap. Either strategy can be used exclusively via <code className="text-xs font-mono">&apos;axis&apos;</code> or <code className="text-xs font-mono">&apos;tracking&apos;</code>.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Idempotent — call it again on resize</p>
						<p>Original inline styles are saved on the first call and restored before each re-fit. It&apos;s safe to call <code className="text-xs font-mono">applyFitWidth</code> repeatedly. <code className="text-xs font-mono">useFitWidth</code> and <code className="text-xs font-mono">FitWidthText</code> wire up a ResizeObserver and <code className="text-xs font-mono">document.fonts.ready</code> automatically.</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex items-baseline gap-4">
					<p className="text-xs uppercase tracking-widest opacity-50">Usage</p>
					<p className="text-xs opacity-50 tracking-wide">TypeScript + React · Vanilla JS</p>
				</div>
				<div className="flex flex-col gap-8 text-sm">
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Drop-in component</p>
						<CodeBlock code={`import { FitWidthText } from '@liiift-studio/fitwidth'

<FitWidthText prefer="auto">
  Display Headline
</FitWidthText>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Hook — attach to any element</p>
						<CodeBlock code={`import { useFitWidth } from '@liiift-studio/fitwidth'

const ref = useFitWidth({ prefer: 'auto' })
<h1 ref={ref}>Display Headline</h1>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Vanilla JS</p>
						<CodeBlock code={`import { applyFitWidth, removeFitWidth } from '@liiift-studio/fitwidth'

const el = document.querySelector('h1')
applyFitWidth(el, { prefer: 'auto' })

// Restore original styles
removeFitWidth(el)`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Options</p>
						<table className="w-full text-xs">
							<thead><tr className="opacity-50 text-left"><th className="pb-2 pr-6 font-normal">Option</th><th className="pb-2 pr-6 font-normal">Default</th><th className="pb-2 font-normal">Description</th></tr></thead>
							<tbody className="opacity-70">
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">target</td><td className="py-2 pr-6">&apos;container&apos;</td><td className="py-2">Width to fill: <code className="font-mono">&apos;container&apos;</code> (parent clientWidth), a pixel number, or an HTMLElement.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">prefer</td><td className="py-2 pr-6">&apos;auto&apos;</td><td className="py-2"><code className="font-mono">&apos;auto&apos;</code> — wdth axis first, then letter-spacing. <code className="font-mono">&apos;axis&apos;</code> — axis only. <code className="font-mono">&apos;tracking&apos;</code> — letter-spacing only.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">axis</td><td className="py-2 pr-6">&apos;wdth&apos;</td><td className="py-2">Variable font axis tag to binary-search.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">axisMin</td><td className="py-2 pr-6">75</td><td className="py-2">Minimum axis value for the binary search.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">axisMax</td><td className="py-2 pr-6">125</td><td className="py-2">Maximum axis value for the binary search.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">maxTracking</td><td className="py-2 pr-6">0.3</td><td className="py-2">Maximum absolute letter-spacing in em (clamped to ±this value).</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">tolerance</td><td className="py-2 pr-6">0.5</td><td className="py-2">Convergence tolerance in pixels — search stops when within this gap.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">as</td><td className="py-2 pr-6">&apos;h1&apos;</td><td className="py-2">HTML element to render. Accepts any valid React element type. (FitWidthText only)</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			<SiteFooter current="fitWidth" npmVersion={version} siteVersion={siteVersion} />

		</main>
	)
}
