import type { Tool } from "../../types";

export const thmToJpg: Tool = {
	id: "image/thm-to-jpg",
	slug: "thm-to-jpg",
	category: "image",
	kind: "convert",
	accept: {
		mime: ["image/jpeg", "application/octet-stream"],
		ext: ["thm"],
	},
	output: { ext: "jpg", mime: "image/jpeg" },
	engines: ["extract:thm-to-jpg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"A GoPro .thm is already a complete standalone JPEG beginning with the FF D8 FF SOI marker. This tool verifies that signature and renames the file with no re-encoding — pixel-identical to the input.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "THM to JPG — Open GoPro .thm Thumbnails as JPG | convrtr",
		h1: "Convert GoPro .thm Thumbnail File to JPG",
		intent:
			"Open a GoPro .thm thumbnail on any device. GoPro recordings ship with a .thm companion file that holds a tiny still, and gallery apps skip .thm because the extension is unregistered. The .thm bytes are a complete JPEG with the FF D8 FF SOI marker — this tool verifies that and renames it to .jpg so any viewer opens it. Runs entirely in your browser; nothing is uploaded.",
		faq: [
			{
				q: "What is a .thm file?",
				a: "It is a small still image companion that many cameras write next to a video clip. GoPro tags the still with a .thm extension so the camera app treats it as metadata-friendly preview, but the payload is a normal JPEG.",
			},
			{
				q: "Does converting .thm to jpg change the picture?",
				a: "No. The .thm is already a byte-for-byte JPEG beginning with the FF D8 FF SOI marker. This tool verifies the signature and returns the identical bytes under a .jpg extension — no re-encoding, no quality loss.",
			},
			{
				q: "How is a .thm different from .lrv?",
				a: "An .lrv is a low-resolution video proxy (an MP4 in disguise), while a .thm is a single still image (a JPEG in disguise). Both exist so GoPro records can be previewed quickly.",
			},
			{
				q: "Why can't my gallery show the .thm file?",
				a: "Image viewers route files by extension, and .thm is not a registered image extension. Renaming the verified JPEG to .jpg lets any viewer open it immediately.",
			},
		],
		related: ["video/lrv-to-mp4", "image/fits-to-png", "document/gpmf-to-csv"],
	},
};
