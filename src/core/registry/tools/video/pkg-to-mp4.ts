import type { Tool } from "../../types";

export const pkgToMp4: Tool = {
	id: "video/pkg-to-mp4",
	slug: "pkg-to-mp4",
	category: "video",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream"],
		ext: ["pkg"],
	},
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["extract:pkg-to-mp4"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Extracts the raw H.264/HEVC video stream packaged inside the Wallpaper Engine bundle with zero re-encoding.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"PKG to MP4 — Extract Video from Wallpaper Engine .pkg Files | convrtr",
		h1: "Extract MP4 Video from Wallpaper Engine .pkg",
		intent:
			"Extract the original MP4 video stream from Wallpaper Engine Steam Workshop .pkg files directly in your browser. Save and reuse animated wallpapers on Mac, Android, iPhone, or Linux with zero uploads.",
		faq: [
			{
				q: "Where do I find Wallpaper Engine .pkg files on my computer?",
				a: "Wallpaper Engine stores downloaded Steam Workshop items in your Steam folder at 'steamapps/workshop/content/431960/'. Each numbered folder corresponds to a wallpaper and contains a scene.pkg or video package.",
			},
			{
				q: "Will this extract audio as well as video?",
				a: "Yes! If the wallpaper includes background music or audio, it is embedded within the same MP4 stream and extracted intact.",
			},
			{
				q: "Does this work for 3D interactive scenes?",
				a: "This tool extracts video wallpapers. If a wallpaper was built as an interactive 3D scene (using shaders and models) rather than a video, it will not contain an MP4 stream.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. The archive index is read and sliced entirely within your web browser's memory. Your files never leave your computer.",
			},
		],
		related: ["video/procreate-to-mp4", "video/mlw-to-mp4"],
	},
};
