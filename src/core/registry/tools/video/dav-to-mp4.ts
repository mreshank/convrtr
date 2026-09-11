import type { Tool } from "../../types";

export const davToMp4: Tool = {
	id: "video/dav-to-mp4",
	slug: "dav-to-mp4",
	category: "video",
	kind: "convert",
	accept: {
		mime: ["application/octet-stream", "video/x-dav"],
		ext: ["dav", "dhav"],
	},
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["ffmpeg:dav->mp4"],
	heavyDownloadMb: 31,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Extracts and copies the internal H.264/H.265 surveillance video stream directly into an MP4 container untouched. If packet timestamps require normalization, convrtr re-encodes cleanly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"DAV to MP4 — Convert Dahua & Amcrest CCTV Footage Online Free | convrtr",
		h1: "Convert CCTV .dav to MP4",
		intent:
			"Convert proprietary Dahua, Amcrest, Lorex, and Q-See security DVR .dav surveillance video files to standard MP4 in your browser. Critical for insurance claims, police reports, and court evidence — 100% private, zero server uploads.",
		faq: [
			{
				q: "Why won't standard video players open .dav files?",
				a: "DAV is a proprietary container created by Dahua security systems. It wraps standard H.264 or H.265 video frames inside custom DHAV packet headers that Windows Media Player, QuickTime, and mobile phones cannot parse. This tool removes the proprietary framing and repacks the video into standard MP4.",
			},
			{
				q: "Is it safe to convert sensitive security footage here?",
				a: "Yes, completely. Unlike other converter websites, convrtr never uploads your video to any server. FFmpeg runs directly inside your browser via WebAssembly, so your private surveillance footage never leaves your computer.",
			},
			{
				q: "Will the converted MP4 work in court or for insurance?",
				a: "Yes. MP4 is universally supported across Windows, Mac, iOS, Android, and video analysis tools used by law enforcement and insurance adjusters.",
			},
			{
				q: "Does this preserve the original video quality?",
				a: "Yes. In almost all cases, the raw video frames are copied directly into the MP4 container without re-encoding, preserving 100% of the recorded detail and timestamps.",
			},
		],
		related: ["video/mkv-to-mp4", "video/avi-to-mp4", "video/trim-mp4"],
	},
};
