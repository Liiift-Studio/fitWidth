// README Studio capture harness for fitWidth.
// Serves the repo over HTTP, renders scripts/capture.html in headless Chromium,
// runs the real applyFitWidth from ../dist on the Roboto Flex variable font, and
// screenshots each `.scene` element to assets/<id>.png with transparent corners.
//
// Run: npm run build && node scripts/capture.mjs
// Setup: npm i -D playwright && npx playwright install chromium

import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { chromium } from "playwright"

const ROOT = process.cwd()
const PORT = Number(process.env.CAPTURE_PORT) || 3103
const MIME = {
	".html": "text/html",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".map": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
	".woff": "font/woff",
}

// Static file server scoped to the repo root
const server = createServer(async (req, res) => {
	try {
		const url = decodeURIComponent((req.url ?? "/").split("?")[0])
		const path = join(ROOT, url === "/" ? "/scripts/capture.html" : url)
		const data = await readFile(path)
		res.writeHead(200, { "Content-Type": MIME[extname(path)] ?? "application/octet-stream" })
		res.end(data)
	} catch {
		res.writeHead(404)
		res.end("not found")
	}
})

await new Promise((r) => server.listen(PORT, r))
const { port } = server.address()

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 2 })
await page.goto(`http://localhost:${port}/scripts/capture.html`, { waitUntil: "networkidle" })
// Wait for fonts + the in-page fit pass to resolve
await page.evaluate(() => window.__ready ?? document.fonts.ready)
await page.waitForTimeout(500)

const ids = await page.$$eval(".scene", (els) => els.map((e) => e.id))
for (const id of ids) {
	const el = await page.$(`#${id}`)
	await el.screenshot({ path: `assets/${id}.png`, omitBackground: true })
	console.log("captured assets/%s.png", id)
}

await browser.close()
server.close()
