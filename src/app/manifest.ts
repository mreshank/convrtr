import type { MetadataRoute } from "next";

// Static export note: manifest.ts compiles to a Route Handler under the
// hood, and this Next.js version refuses to export one with
// `output: "export"` unless it is explicitly marked static — it has no
// request-time input, so `force-static` merely states what was already
// true. Next.js also auto-injects the `<link rel="manifest">` tag
// site-wide from this file's presence, so layout.tsx does not need to
// reference it.
export const dynamic = "force-static";

// Colours are the dark surface/signal tokens from src/styles/tokens.css
// (--surface-base / --signal, dark variant) — the same pairing icon.svg
// draws the app mark in, so the install/splash experience matches the mark
// rather than the light theme the OS might currently be in.
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "convrtr",
		short_name: "convrtr",
		description: "Convert anything in your browser. Nothing is uploaded.",
		start_url: "/",
		display: "standalone",
		background_color: "#0b0b0c",
		theme_color: "#0b0b0c",
		icons: [
			{
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/icon-192-maskable.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icons/icon-512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
