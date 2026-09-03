import type { Tool } from "../../types";

/**
 * Trimming is declared by hand rather than through a factory: there is one of
 * these per container today, and the differences between them are the
 * container's MIME type and its SEO copy, which a factory would only obscure.
 */
export const trimMp4: Tool = {
	id: "video/trim-mp4",
	slug: "trim-mp4",
	category: "video",
	kind: "edit",
	accept: { mime: ["video/mp4"], ext: ["mp4", "m4v"] },
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["trim:mp4"],
	// The input is a whole video, which can be far larger than memory even when
	// the clip taken out of it is short. Kept in step with the engine by
	// `streamable-parity`.
	streamable: true,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Copies the video and audio packets straight across — nothing is decoded or re-encoded, so the clip is identical to that part of the original. The cut moves back to the nearest keyframe, and convrtr says by how much.",
				params: {},
			},
		],
		advanced: [
			{
				control: "timerange",
				startKey: "start",
				endKey: "end",
				label: "Clip",
				group: "Selection",
			},
		],
	},
	seo: {
		title: "Trim a video without re-encoding — free, in your browser | convrtr",
		h1: "Trim an MP4",
		intent:
			"Cut a section out of an MP4 without re-encoding it. The video and audio packets are copied straight across, so the clip is identical to that part of the original — no quality lost, and it finishes in seconds. Runs entirely in your browser; the file never leaves your device.",
		faq: [
			{
				q: "Why did my clip start slightly earlier than I asked?",
				a: "Because video frames are not independent. Most frames are stored as differences from earlier ones and cannot be decoded on their own, so a cut that copies data has to begin at a keyframe — and keyframes are usually a few seconds apart. convrtr moves the start back to the nearest keyframe and tells you exactly where it landed. The alternative is to re-encode everything between your chosen point and the next keyframe, which is what a frame-accurate trim does and why it costs quality.",
			},
			{
				q: "Is the trimmed clip really identical to the original?",
				a: "Yes. The compressed packets are copied without being decoded, so the bytes describing the picture in your clip are the same bytes that were in the source. Only the timestamps change, because the clip now starts at zero.",
			},
			{
				q: "Why is this so much faster than other trimmers?",
				a: "Most trimmers decode every frame and encode it again, which takes minutes and loses quality. Copying packets skips both steps entirely — the work is reading and writing, not compressing, so it runs about as fast as your disk.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while trimming — or by going offline first.",
			},
		],
		related: ["video/mkv-to-mp4", "audio/mp4-to-m4a", "video/mp4-to-webm"],
	},
};
