import type { Tool } from "../../types";

export const pcdToPng: Tool = {
	id: "image/pcd-to-png",
	slug: "pcd-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-photo-cd",
			"image/x-pcd",
			"image/pcd",
			"application/octet-stream",
		],
		ext: ["pcd"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:pcd-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "base",
		presets: [
			{
				id: "base",
				label: "Base Resolution (768×512)",
				explanation:
					"Decodes the standard Base resolution Image Pac plane into 32-bit RGBA PNG with full PhotoYCC to sRGB conversion.",
				params: { resolution: "base" },
			},
			{
				id: "base4",
				label: "Base/4 Preview (384×256)",
				explanation:
					"Extracts medium preview resolution (Base/4) for fast viewing and thumbnails.",
				params: { resolution: "base4" },
			},
			{
				id: "base16",
				label: "Base/16 Thumbnail (192×128)",
				explanation: "Extracts contact-sheet thumbnail resolution (Base/16).",
				params: { resolution: "base16" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "resolution",
				label: "Target Resolution",
				group: "Extraction",
				options: [
					{ value: "base", label: "Base (768×512)" },
					{ value: "base4", label: "Base/4 (384×256)" },
					{ value: "base16", label: "Base/16 (192×128)" },
				],
				default: "base",
			},
		],
	},
	seo: {
		title: "PCD to PNG — Convert Kodak Photo CD Images to PNG Online | convrtr",
		h1: "Convert Kodak Photo CD (.pcd) to PNG",
		intent:
			"Extract and convert vintage Kodak Photo CD Image Pac archives (.pcd) into high-resolution 32-bit RGBA PNG images directly in your browser. Accurate PhotoYCC color space translation 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a Kodak Photo CD (.pcd) file?",
				a: "Kodak Photo CD is a digital imaging format introduced by Eastman Kodak in 1992 for archiving 35mm film negatives and slides onto CD-ROMs. Each PCD file contains an 'Image Pac' storing multiple hierarchical resolution planes encoded in Kodak's proprietary PhotoYCC color space.",
			},
			{
				q: "How does convrtr decode Kodak Photo CD files?",
				a: "convrtr reads the Image Pac header, parses the 4:2:0 subsampled luma and chroma channel planes (Base, Base/4, or Base/16), applies the Kodak PhotoYCC to standard sRGB color matrix transformation, and encodes the output into 32-bit RGBA PNG directly in your browser.",
			},
			{
				q: "Are my scanned photographs uploaded to remote servers?",
				a: "Never. All Kodak Photo CD parsing, PhotoYCC matrix transformations, and PNG generation happen locally on your computer with zero network traffic.",
			},
		],
		related: [
			"image/srf-to-png",
			"image/mng-to-png",
			"image/tga-to-png",
			"image/pcx-to-png",
			"image/wal-to-png",
		],
	},
};
