import type { Tool } from "../../types";

export const procreateToMp4: Tool = {
	id: "video/procreate-to-mp4",
	slug: "procreate-to-mp4",
	category: "video",
	kind: "extract",
	accept: {
		mime: [
			"application/x-procreate",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["procreate"],
	},
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["extract:procreate-to-mp4"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"The embedded timelapse is extracted directly from the package without re-encoding. The video comes out bit-identical to the original recording.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Procreate to MP4 — Extract Drawing Timelapse from .procreate Files | convrtr",
		h1: "Extract MP4 Timelapse from a Procreate File",
		intent:
			"Extract the full drawing timelapse video from any Procreate (.procreate) file directly in your browser. No iPad, Procreate app, or cloud upload required — pure client-side extraction.",
		faq: [
			{
				q: "Does this require an iPad or Procreate installed?",
				a: "No. A .procreate file is an archive that stores your drawing's full timelapse recording inside as a standard MP4 file. This tool extracts that video directly in your browser on Windows, Mac, Linux, Android, or Chromebook.",
			},
			{
				q: "Does the video lose quality?",
				a: "No. The video is extracted bit-for-bit from the archive with zero transcoding. It has the exact same resolution, bitrate, and framerate that Procreate recorded on the iPad.",
			},
			{
				q: "What if the extraction fails with 'no timelapse found'?",
				a: "If you disabled Time-lapse Recording in Canvas > Actions before creating the artwork, or if you purged the timelapse history to save file space, the .procreate file will not contain a video stream.",
			},
			{
				q: "Is my artwork uploaded to any server?",
				a: "No. The entire process runs locally in your web browser using client-side decompression. Your file never leaves your machine.",
			},
		],
		related: ["image/procreate-to-png"],
	},
};
