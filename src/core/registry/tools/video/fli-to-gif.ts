import type { Tool } from "../../types";

/**
 * FLI and FLC are the 8-bit indexed animations from Autodesk Animator and
 * Animator Pro (late 1980s / early 1990s DOS). They were the format of choice
 * for game intros, demo-scene loops and early CD-ROM menus, which means
 * millions of them sit on floppies and discs with no tool that can open them
 * today. GIF is the closest thing to a successor that still plays everywhere,
 * and — unusually for a conversion — the two formats line up so well that
 * nothing needs to be lost: both are a 256-colour palette plus per-frame
 * palette patches.
 */
export const fliToGif: Tool = {
	id: "video/fli-to-gif",
	slug: "fli-to-gif",
	category: "video",
	kind: "convert",
	accept: {
		mime: ["application/octet-stream"],
		ext: ["fli", "flc"],
	},
	output: { ext: "gif", mime: "image/gif" },
	engines: ["video:flic->gif"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Both formats are 8-bit indexed colour, so every pixel keeps its exact palette index and palette changes mid-animation are preserved. Frame timing is kept to the nearest hundredth of a second, which is the resolution GIF itself stores.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"FLI / FLC to GIF Converter — Open Autodesk Animator Files | convrtr",
		h1: "Convert FLI and FLC animations to GIF",
		intent:
			"Turn an Autodesk Animator FLI or FLC animation into an animated GIF without uploading it. Both formats are 8-bit indexed colour, so the conversion keeps every palette index exactly — nothing is re-quantised — and the animation plays in your browser on this page alone.",
		faq: [
			{
				q: "What are FLI and FLC files?",
				a: "They are the animation formats Autodesk Animator and Animator Pro saved in the late 1980s and early 1990s. FLI was the first, limited to 320×200; FLC lifted that limit. They were everywhere on early CD-ROMs and in DOS games, which is why so many survive as orphans on old discs — no modern player ships with them.",
			},
			{
				q: "Is the conversion lossless?",
				a: "Yes, in the sense that matters. FLI and FLC store a 256-colour palette and each frame as draws over the previous one — the same model GIF uses. Every palette index is copied exactly, including palette changes partway through the animation. The only rounding is frame timing (FLI stores 1/70-second ticks; GIF stores hundredths of a second).",
			},
			{
				q: "Does this run in my browser?",
				a: "Yes. The file is parsed and encoded entirely on your device using the same engine that powers every convrtr converter — nothing is uploaded, so an animation you are not even sure is legal to share stays private while you salvage it.",
			},
			{
				q: "Why would I want a FLIC animation as GIF?",
				a: "GIF is the one animation format every platform, chat app and browser opens with zero plugins — which is exactly the playback guarantee FLI and FLC lost decades ago. If you are preserving a game intro, a demo-scene loop or a presentation menu, GIF gives those frames a future without needing the original DOS software.",
			},
		],
		related: [],
	},
};
