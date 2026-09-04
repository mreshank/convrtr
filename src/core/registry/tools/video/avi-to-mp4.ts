import type { Tool } from "../../types";

export const aviToMp4: Tool = {
	id: "video/avi-to-mp4",
	slug: "avi-to-mp4",
	category: "video",
	kind: "convert",
	accept: { mime: ["video/x-msvideo", "video/avi"], ext: ["avi"] },
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["ffmpeg:avi->mp4"],
	// No browser API can read AVI, so this tool needs a full copy of ffmpeg.
	// The UI asks before spending it; see `HeavyDownloadGate`.
	heavyDownloadMb: 31,
	quality: {
		// An AVI usually holds MPEG-4 video and MP3 audio, both legal in MP4, so
		// the common case really is a lossless copy. When it is not, the engine
		// says so rather than letting the preset's promise stand.
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Copies the video and audio streams into an MP4 container untouched, when the codecs allow it. If they cannot be carried across, convrtr re-encodes and tells you.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Convert AVI to MP4 — free, private, in your browser | convrtr",
		h1: "Convert AVI to MP4",
		intent:
			"Convert AVI files to MP4 without uploading them. AVI is an older format no browser can read on its own, so convrtr downloads a copy of ffmpeg once and runs it on your device — the video itself never leaves your computer.",
		faq: [
			{
				q: "Why does this one need a download when the other converters do not?",
				a: "Because browsers can read MP4, WebM and MKV natively, but nothing in a browser can read AVI. That takes a full copy of ffmpeg, compiled to WebAssembly — about 31MB. It downloads once, your browser caches it, and every conversion afterwards starts immediately. Your video is still never uploaded: the converter comes to your device, not the other way round.",
			},
			{
				q: "Will the quality drop?",
				a: "Usually not at all. Most AVI files hold MPEG-4 video and MP3 audio, both of which are legal inside an MP4 container, so the compressed streams are copied across untouched and the result is identical to the original. Where a codec genuinely cannot be carried into MP4, convrtr re-encodes at high quality and tells you it did — it does not quietly re-encode and call the result lossless.",
			},
			{
				q: "How large a file can it handle?",
				a: "This tier works in memory rather than streaming, so it is bounded by what your browser can hold — around 2GB in practice, and less on a phone. convrtr checks before starting and says up front if a file will not fit, rather than failing partway through.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. The only thing downloaded is the converter itself, and you can confirm the rest by opening your network tab during a conversion — or by converting a second file with your connection switched off.",
			},
		],
		related: ["video/mkv-to-mp4", "video/mp4-to-webm", "video/trim-mp4"],
	},
};
