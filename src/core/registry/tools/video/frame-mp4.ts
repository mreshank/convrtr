import type { Tool } from "../../types";

export const frameMp4: Tool = {
	id: "video/frame-to-png",
	slug: "frame-to-png",
	category: "video",
	kind: "extract",
	accept: { mime: ["video/mp4"], ext: ["mp4", "m4v"] },
	output: { ext: "png", mime: "image/png" },
	engines: ["frame:mp4"],
	quality: {
		// The PNG is an exact record of the decoded frame, which is a real
		// lossless claim about this operation — but see the FAQ: it cannot
		// recover detail the video itself never held.
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Writes the frame exactly as the decoder produced it, with lossless PNG compression. No further quality is lost.",
				params: { optimise: true },
			},
		],
		advanced: [
			{
				control: "timestamp",
				key: "time",
				label: "Frame at",
				group: "Selection",
			},
			{
				control: "toggle",
				key: "optimise",
				label: "Recompress losslessly with oxipng (smaller file, same pixels)",
				group: "Encoder",
				default: true,
			},
			{
				control: "stepper",
				key: "optimiseLevel",
				label: "oxipng effort",
				group: "Encoder",
				min: 1,
				max: 6,
				step: 1,
				default: 2,
			},
		],
	},
	seo: {
		title:
			"Extract a frame from a video as PNG — free, in your browser | convrtr",
		h1: "Extract a video frame as PNG",
		intent:
			"Save any frame of an MP4 as a lossless PNG. Pick the moment, and convrtr writes the frame exactly as it decodes — no re-compression artefacts on top of the video's own. Runs entirely in your browser; the video never leaves your device.",
		faq: [
			{
				q: "Is the PNG really lossless?",
				a: "The PNG records the frame exactly as the decoder produced it, and PNG compression itself loses nothing — so no quality is lost on top of the video. It cannot add back what the video never had, though: the frame was compressed when the video was made, so any softness or blocking already in it is part of the picture. A PNG of a frame is the best possible copy of that frame, not a better version of it.",
			},
			{
				q: "Why is the frame sometimes slightly before the moment I picked?",
				a: "A video only holds frames at discrete moments — 25 or 30 a second, typically — so there may be no frame at the exact instant you chose. convrtr takes the last frame at or before your point, which is what a video player shows at that moment. If the gap is large enough to matter, it tells you which frame it used.",
			},
			{
				q: "Should I use JPEG instead?",
				a: "Only if file size matters more than fidelity. JPEG would re-compress a picture that has already been compressed once by the video codec, and those two lossy passes compound into visible artefacts — especially on flat areas and edges. PNG avoids the second pass entirely.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while extracting — or by going offline first.",
			},
		],
		related: ["video/trim-mp4", "image/png-to-webp", "audio/mp4-to-m4a"],
	},
};
