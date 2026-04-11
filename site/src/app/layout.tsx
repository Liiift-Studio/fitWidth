import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
	title: "Fit Width — Fill any width, exactly",
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: "Fit Width binary-searches a variable font's wdth axis and letter-spacing to make any headline fill an exact target width. Works with React, vanilla JS, or any framework.",
	keywords: ["fit width", "variable font", "wdth", "letter-spacing", "display type", "headline", "typography", "TypeScript", "npm", "react"],
	openGraph: {
		title: "Fit Width — Fill any width, exactly",
		description: "Binary-search the wdth axis and letter-spacing to make any headline flush with its container. A precision typesetting tool, now in one npm package.",
		url: "https://fitwidth.com",
		siteName: "Fit Width",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Fit Width — Fill any width, exactly",
		description: "Binary-search the wdth axis and letter-spacing to make any headline flush with its container.",
	},
	metadataBase: new URL("https://fitwidth.com"),
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`h-full antialiased ${inter.variable}`}>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	)
}
