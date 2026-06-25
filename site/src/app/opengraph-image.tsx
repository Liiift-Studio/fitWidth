// OG image for fitwidth.com — generated at build time via next/og
// Satori (used by ImageResponse) supports TTF and WOFF but not WOFF2.
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'Fit Width — flush every time.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
	const interLight = await readFile(join(process.cwd(), 'public/fonts/inter-300.woff'))
	return new ImageResponse(
		(
			<div style={{ background: '#000a9d', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', fontFamily: 'Inter, sans-serif' }}>
				{/* Label */}
				<span style={{ fontSize: 13, letterSpacing: '0.18em', color: '#b6bece', textTransform: 'uppercase' }}>fit width</span>

				{/* Bar preview + headline */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
						{[100, 100, 100].map((_, i) => (
							<div key={i} style={{ width: '100%', height: 4, background: i === 1 ? '#b6bece' : '#757a84', borderRadius: 2 }} />
						))}
					</div>
					<div style={{ fontSize: 76, color: '#f2f5fb', lineHeight: 1.06, fontWeight: 300 }}>Fit Width,</div>
					<div style={{ fontSize: 76, color: '#9298a5', lineHeight: 1.06, fontWeight: 300 }}>flush every time.</div>
				</div>

				{/* Footer */}
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
					<div style={{ fontSize: 14, color: '#b6bece', letterSpacing: '0.04em', display: 'flex', gap: 20 }}>
						<span>TypeScript</span><span style={{ opacity: 0.4 }}>·</span>
						<span>Zero dependencies</span><span style={{ opacity: 0.4 }}>·</span>
						<span>React + Vanilla JS</span>
					</div>
					<div style={{ fontSize: 13, color: '#9298a5', letterSpacing: '0.04em' }}>fitwidth.com</div>
				</div>
			</div>
		),
		{ ...size, fonts: [{ name: 'Inter', data: interLight as unknown as ArrayBuffer, style: 'normal', weight: 300 }] },
	)
}
