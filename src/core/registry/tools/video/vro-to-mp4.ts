import type { Tool } from "../../types";

export const vroToMp4: Tool = {
	id: "video/vro-to-mp4",
	slug: "vro-to-mp4",
	category: "video",
	kind: "convert",
	accept: {
		mime: ["application/octet-stream", "video/x-vro"],
		ext: ["vro"],
	},
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["ffmpeg:vro->mp4"],
	heavyDownloadMb: 31,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Demuxes the DVD-VR program stream and copies the video and audio into an MP4 container untouched. Re-encodes only when the streams cannot be carried over as-is.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"VRO to MP4 — Convert Hitachi/Sony DVD-VR Camcorder Videos Online | convrtr",
		h1: "Convert DVD-VR (.vro) to MP4",
		intent:
			"Convert .vro recordings from DVD-VR camcorders and DVD recorders to standard MP4 in your browser. Digitize family camcorder archives and set-top-box recordings — no DVD-VR software, no server uploads.",
		faq: [
			{
				q: "What is a VRO (.vro) file?",
				a: "VRO is the extension DVD-VR-standard discs get when recorded by camcorders and DVD recorders that writing to DVD-RAM and DVD-RW media, such as Hitachi, Panasonic, and Sony models. The disc's program stream is stored as a single .vro stream that desktop players and video editors do not open.",
			},
			{
				q: "Why can't I play my .vro file normally?",
				a: "The recording only lives inside the DVD's original navigation structure — players treat the disc as a DVD, and the raw .vro stream has no index the way an MP4 or an edited recording does. Once the disc is copied to a computer the file is orphaned, and most players have no idea what it is.",
			},
			{
				q: "Is the conversion done privately?",
				a: "Yes. FFmpeg runs inside your browser via WebAssembly, so a home movie of a family event never leaves your computer.",
			},
			{
				q: "Does this preserve the original quality?",
				a: "Yes. In almost all cases the video and audio streams are copied into the MP4 container without re-encoding, preserving the original recorded fidelity.",
			},
		],
		related: ["video/mkv-to-mp4", "video/avi-to-mp4", "video/dav-to-mp4"],
	},
};
