import type { Tool } from "../../types";

export const mp4ToGif: Tool = {
	id: "video/mp4-to-gif",
	slug: "mp4-to-gif",
	category: "video",
	kind: "convert",
	accept: { mime: ["video/mp4"], ext: ["mp4", "m4v"] },
	output: { ext: "gif", mime: "image/gif" },
	engines: ["gif:mp4"],
	quality: {
		// GIF cannot be lossless from video: 256 colours against millions. Saying
		// otherwise anywhere in this file would undermine every honest lossless
		// claim the rest of the catalogue makes.
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "balanced",
				label: "Balanced",
				explanation:
					"480px wide at 12 frames per second, with one 256-colour palette shared across the clip. Colours stay consistent between frames and the file stays a sensible size.",
				params: {
					width: 480,
					fps: 12,
					colors: 256,
					perFramePalette: false,
				},
			},
			{
				id: "smallest",
				label: "Smallest file",
				explanation:
					"320px wide at 8 frames per second with 128 colours. Noticeably coarser and choppier, but often less than half the size.",
				params: {
					width: 320,
					fps: 8,
					colors: 128,
					perFramePalette: false,
				},
			},
			{
				id: "visually-lossless",
				label: "Best colour",
				explanation:
					"640px wide at 15 frames per second, with a fresh palette for every frame. Each frame gets the best colours available — but palettes disagree between frames, so flat areas can shimmer, and the file is considerably larger.",
				params: {
					width: 640,
					fps: 15,
					colors: 256,
					perFramePalette: true,
				},
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
			{
				control: "stepper",
				key: "fps",
				label: "Frames per second",
				group: "Animation",
				min: 1,
				max: 50,
				step: 1,
				default: 12,
			},
			{
				control: "stepper",
				key: "width",
				label: "Width in pixels",
				group: "Animation",
				min: 64,
				max: 1920,
				step: 16,
				default: 480,
			},
			{
				control: "stepper",
				key: "colors",
				label: "Palette size",
				group: "Colour",
				min: 2,
				max: 256,
				step: 2,
				default: 256,
			},
			{
				control: "toggle",
				key: "perFramePalette",
				label: "A separate palette per frame (better colour, visible shimmer)",
				group: "Colour",
				default: false,
			},
		],
	},
	seo: {
		title: "Convert MP4 to GIF — free, private, in your browser | convrtr",
		h1: "Convert MP4 to GIF",
		intent:
			"Turn part of an MP4 into an animated GIF without uploading it. Choose the section, frame rate and palette; the conversion runs entirely in your browser, so the video never leaves your device.",
		faq: [
			{
				q: "Why does the GIF look worse than the video?",
				a: "Because GIF stores at most 256 colours per frame, while your video stores millions. That limit is part of the format and cannot be worked around — every GIF made from video is an approximation. convrtr's job is to spend that budget well: it builds a palette from the whole clip so colours stay consistent, rather than letting each frame pick its own and shimmer against its neighbours.",
			},
			{
				q: "Why is the GIF so much larger than the video?",
				a: "GIF compresses each frame on its own, while modern video codecs store most frames as small differences from the frames around them. A few seconds of video that occupies 200KB as MP4 can easily become several megabytes as GIF. Reducing the width, the frame rate or the palette size all help, and the Smallest file preset does all three.",
			},
			{
				q: "Why did my frame rate change slightly?",
				a: "GIF stores each frame's duration in hundredths of a second, so only certain frame rates can be expressed exactly. 12 or 20 frames per second land precisely; 15 becomes about 14.3. convrtr tells you when the rate it can store differs from the one you asked for.",
			},
			{
				q: "Should I use a video instead?",
				a: "For anything more than a few seconds, usually yes — an MP4 or WebM will look better and be far smaller. GIF earns its place where autoplay without a player matters, which is why it survives in chat apps and documentation.",
			},
		],
		related: ["video/trim-mp4", "video/frame-to-png", "video/mp4-to-webm"],
	},
};
