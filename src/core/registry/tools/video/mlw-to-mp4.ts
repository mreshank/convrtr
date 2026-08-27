import type { Tool } from "../../types";

/**
 * MLW is a proprietary screen-recording/course-app container: a "Root\0"-
 * marked filename block wrapping an AES-GCM-encrypted MP4. There is no
 * quality dial because there is no re-encode — the MP4 inside comes out
 * bit-identical to what was recorded.
 */
export const mlwToMp4: Tool = {
	id: "video/mlw-to-mp4",
	slug: "mlw-to-mp4",
	category: "video",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream"],
		ext: ["mlw"],
	},
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["extract:mlw-to-mp4"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"The MP4 is decrypted, not re-encoded. The video comes out bit-identical to what was recorded.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "MLW to MP4 Converter — Extract Video from .mlw Files | convrtr",
		h1: "Extract MP4 video from an MLW file",
		intent:
			"MLW files come from screen-recording and course-authoring apps that wrap a normal MP4 in a lightly encrypted container — not real DRM, just AES-GCM with a key baked into every install of the app. This finds the filename marker, reads the IV, and decrypts the video straight back to a playable MP4, entirely in your browser. Nothing is uploaded.",
		faq: [
			{
				q: "Is this breaking DRM?",
				a: "No. The MLW format uses a single fixed encryption key shared across every installation of the app that produces it, not a per-user or per-session key. That is obfuscation, not access control — this tool reads a file you already have full access to and reverses that obfuscation locally.",
			},
			{
				q: "Does my file get uploaded anywhere?",
				a: "No. Reading and decrypting the file happens entirely in your browser using the Web Crypto API. The file never leaves your device.",
			},
			{
				q: "Will this work on any .mlw file?",
				a: "It works on files produced with the key and container layout this tool was built against. If a future version of the source app changes its key or format, extraction will fail with a clear error rather than producing a corrupted file — AES-GCM's built-in authentication check catches that automatically.",
			},
			{
				q: "Does the video lose quality?",
				a: "No. This only decrypts; it never decodes or re-encodes the video, so the MP4 that comes out is byte-for-byte what was recorded.",
			},
		],
		related: [],
	},
};
