import type { MetadataRoute } from "next";

// Static export note: manifest.ts compiles to a Route Handler under the
// hood, and this Next.js version refuses to export one with
// `output: "export"` unless it is explicitly marked static — it has no
// request-time input, so `force-static` merely states what was already
// true. Next.js also auto-injects the `<link rel="manifest">` tag
// site-wide from this file's presence, so layout.tsx does not need to
// reference it.
export const dynamic = "force-static";

// #0A0A0A is fixed, not theme-live. A web app manifest is JSON read by the
// operating system, so it cannot reference a custom property and cannot
// follow a theme change: whatever is written here is what the install and
// splash experience gets in both themes. The value corresponds to --terminal
// in the light theme and --terminal-ink in the dark one (tokens.css swaps the
// pair), and it is the ground icon.svg draws the app mark on — so the install
// experience matches the mark rather than whichever theme the OS is in.
//
// This is the one file src/design/__tests__/tokens.test.ts allows a literal
// hex in, for exactly that reason.
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "convrtr",
		short_name: "convrtr",
		description: "Convert anything in your browser. Nothing is uploaded.",
		start_url: "/",
		display: "standalone",
		background_color: "#0A0A0A",
		theme_color: "#0A0A0A",
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
