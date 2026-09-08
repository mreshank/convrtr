import type { MetadataRoute } from "next";

// Static export note: manifest.ts compiles to a Route Handler under the
// hood, and this Next.js version refuses to export one with
// `output: "export"` unless it is explicitly marked static — it has no
// request-time input, so `force-static` merely states what was already
// true. Next.js also auto-injects the `<link rel="manifest">` tag
// site-wide from this file's presence, so layout.tsx does not need to
// reference it.
export const dynamic = "force-static";

// #000000 is written out, not referenced. A web app manifest is JSON read
// by the operating system, so it cannot resolve a custom property: the
// literal is the only way to state the value at all, which is why this is
// the one file src/design/__tests__/tokens.test.ts allows a literal hex in.
//
// The value is v2's canvas — the same black `--ground` paints the site and
// icon.svg draws the app mark on — so the OS-painted install and splash
// chrome matches the page it opens onto. There is no theme pair to track:
// v2 has one canvas, and the light/dark near-black pair this comment used
// to name has been removed from tokens.css entirely.
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "convrtr",
		short_name: "convrtr",
		description: "Convert anything in your browser. Nothing is uploaded.",
		start_url: "/",
		display: "standalone",
		background_color: "#000000",
		theme_color: "#000000",
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
