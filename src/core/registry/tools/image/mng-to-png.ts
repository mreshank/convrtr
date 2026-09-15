import type { Tool } from "../../types";

export const mngToPng: Tool = {
	id: "image/mng-to-png",
	slug: "mng-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"video/x-mng",
			"image/x-mng",
			"image/mng",
			"application/octet-stream",
		],
		ext: ["mng"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:mng-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "first",
		presets: [
			{
				id: "first",
				label: "First Frame (Frame 0)",
				explanation:
					"Extracts the initial primary frame of the MNG animation sequence into lossless 32-bit RGBA PNG.",
				params: { frameIndex: 0 },
			},
			{
				id: "second",
				label: "Second Frame (Frame 1)",
				explanation:
					"Extracts the second frame of the MNG animation into lossless 32-bit RGBA PNG.",
				params: { frameIndex: 1 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "frameIndex",
				label: "Animation Frame Index",
				group: "Animation",
				min: 0,
				max: 200,
				step: 1,
				default: 0,
			},
		],
	},
	seo: {
		title:
			"MNG to PNG — Convert Multiple-image Network Graphics to PNG Online | convrtr",
		h1: "Convert Multiple-image Network Graphics (.mng) to PNG",
		intent:
			"Extract and convert Multiple-image Network Graphics animation files (.mng) into high-resolution 32-bit RGBA PNG images directly in your browser. Complete client-side frame extraction with zero server uploads.",
		faq: [
			{
				q: "What is an MNG (.mng) animation file?",
				a: "MNG (Multiple-image Network Graphics) is an open-source animated graphics file format published in 2001 by the PNG Development Group. Designed as an extensible animated alternative to GIF with full 24-bit RGB/RGBA color and alpha transparency, it encapsulates multiple PNG-like chunk streams within a single file.",
			},
			{
				q: "How does convrtr extract PNG frames from MNG files?",
				a: "convrtr parses the MNG chunk stream (including MHDR, IHDR, PLTE, IDAT, and MEND chunks), extracts the requested frame's raster data, reassembles standard PNG chunk headers with verified CRCs, and exports standard 32-bit RGBA PNG images.",
			},
			{
				q: "Are my animation frames uploaded to remote servers?",
				a: "Never. All MNG chunk parsing, frame extraction, and PNG encoding execute locally inside your browser sandbox. Your media files are never transferred across any network.",
			},
		],
		related: [
			"image/gif-to-frames",
			"image/tga-to-png",
			"image/pcx-to-png",
			"image/wal-to-png",
			"image/blp-to-png",
		],
	},
};
