import type { Tool } from "../../types";

export const rawToPng: Tool = {
	id: "image/raw-to-png",
	slug: "raw-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-raw",
			"image/x-adobe-dng",
			"image/x-canon-cr2",
			"image/x-nikon-nef",
			"image/x-sony-arw",
			"image/x-olympus-orf",
			"image/x-panasonic-raw",
			"image/raw",
			"application/octet-stream",
		],
		ext: ["raw", "dng", "cr2", "nef", "arw", "orf", "rw2", "pef", "raf"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:raw-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "preview",
		presets: [
			{
				id: "preview",
				label: "High-Resolution Preview (Fast)",
				explanation:
					"Extracts camera sensor preview or demosaics raw sensor raster into 32-bit RGBA PNG with zero quality loss.",
				params: { quality: "preview" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "quality",
				label: "Extraction Quality",
				group: "Extraction",
				options: [
					{ value: "preview", label: "High-Resolution Preview" },
					{ value: "full", label: "Direct Sensor Frame" },
				],
				default: "preview",
			},
		],
	},
	seo: {
		title:
			"RAW to PNG — Convert Camera RAW & DNG Images to PNG Online | convrtr",
		h1: "Convert Camera RAW & DNG (.raw / .dng) to PNG",
		intent:
			"Extract and convert digital camera RAW and Adobe DNG sensor files (.raw, .dng, .cr2, .nef, .arw) into high-resolution 32-bit RGBA PNG images directly in your browser. Pure client-side execution 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a Camera RAW (.raw / .dng) file?",
				a: "A Camera RAW file contains minimally processed data directly from the image sensor of a digital camera or scanner. Common RAW formats include Adobe Digital Negative (DNG), Canon CR2, Nikon NEF, Sony ARW, and generic RAW. They encapsulate uncompressed or losslessly compressed sensor samples alongside high-fidelity embedded preview streams.",
			},
			{
				q: "How does convrtr extract PNG images from RAW files?",
				a: "convrtr reads the TIFF/IFD container structure, identifies the embedded full-resolution preview stream or demosaics raw Bayer sensor rasters, and encodes the resulting pixel data into standard lossless 32-bit RGBA PNG directly in your browser.",
			},
			{
				q: "Are my high-resolution camera photos sent to remote servers?",
				a: "Never. All RAW decoding, preview extraction, and PNG compression happen locally on your computer inside the browser sandbox. No file data is ever transmitted over the network.",
			},
		],
		related: [
			"image/srf-to-png",
			"image/pcd-to-png",
			"image/mng-to-png",
			"image/tga-to-png",
			"image/pcx-to-png",
		],
	},
};
