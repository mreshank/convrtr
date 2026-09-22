import type { Tool } from "../../types";

export const lrvToMp4: Tool = {
	id: "video/lrv-to-mp4",
	slug: "lrv-to-mp4",
	category: "video",
	kind: "convert",
	accept: {
		mime: ["video/mp4", "application/octet-stream"],
		ext: ["lrv"],
	},
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["video:lrv->mp4"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"An .lrv is already byte-for-byte an MP4 container with an ftyp header. This tool verifies that and renames the file with no re-encoding — the output is identical to the input.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "LRV to MP4 — Open GoPro .lrv Proxy Files as MP4 | convrtr",
		h1: "Convert GoPro .lrv Proxy File to MP4",
		intent:
			"Open a GoPro .lrv proxy video on any device. GoPro cameras record a low-resolution LRV proxy alongside the 4K original so the camera app can scrub quickly. The .lrv is secretly a full MP4 with an ftyp header — this tool verifies the bytes and renames it to .mp4 so any player will open it. Runs entirely in your browser; nothing is uploaded.",
		faq: [
			{
				q: "What is an .lrv file?",
				a: "LRV stands for low-resolution video. GoPro recorders store a downscaled proxy copy of every clip alongside the original so the touchscreen and app can preview footage instantly. The proxy bytes are a standard MP4 container with an ftyp header, just under a .lrv extension.",
			},
			{
				q: "Will converting .lrv to mp4 lose video quality?",
				a: "No. The .lrv is already a complete MP4 file — this tool only verifies the container signature, then delivers the identical bytes with an .mp4 extension. No re-encoding happens, so you keep the exact low-res proxy quality GoPro wrote.",
			},
			{
				q: "Why can't my player open the .lrv file directly?",
				a: "Most players decide how to open a video from its extension. Because .lrv is not a registered video extension, players either refuse it or treat it as data. Renaming the verified container to .mp4 fixes that without touching a single frame.",
			},
		],
		related: ["video/mlw-to-mp4", "video/dav-to-mp4", "document/gpmf-to-csv"],
	},
};
