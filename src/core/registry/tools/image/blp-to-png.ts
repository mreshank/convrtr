import type { Tool } from "../../types";

export const blpToPng: Tool = {
	id: "image/blp-to-png",
	slug: "blp-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-blp",
			"image/blp",
			"application/x-blp",
			"application/octet-stream",
		],
		ext: ["blp"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:blp-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "32-Bit RGBA PNG",
				explanation:
					"Decodes Warcraft III (BLP1) and World of Warcraft (BLP2) paletted, raw BGRA, and DXT compressed game textures into lossless 32-bit RGBA PNG.",
				params: { mipmapLevel: 0 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "mipmapLevel",
				label: "Mipmap Level (0 = Highest Resolution)",
				group: "Extraction",
				min: 0,
				max: 15,
				step: 1,
				default: 0,
			},
		],
	},
	seo: {
		title:
			"BLP to PNG — Convert Blizzard Texture (.blp) to PNG Online | convrtr",
		h1: "Convert Blizzard Texture (.blp) to PNG",
		intent:
			"Decode and convert Blizzard Texture files (.blp) from Warcraft III and World of Warcraft into transparent 32-bit RGBA PNG images directly in your browser. 100% private client-side texture extraction with zero server uploads.",
		faq: [
			{
				q: "What is a Blizzard Texture (.blp) file?",
				a: "BLP (Blizzard Picture) is the proprietary texture container format used across Blizzard Entertainment games including Warcraft III (BLP1) and World of Warcraft (BLP2). It contains game textures stored using 256-color palettes, raw uncompressed BGRA, or S3TC/DXT texture compression.",
			},
			{
				q: "Can I extract textures from both Warcraft III and WoW?",
				a: "Yes! convrtr fully supports both BLP1 (Warcraft III indexed and direct color modes with 1-bit, 4-bit, and 8-bit alpha channels) and BLP2 (World of Warcraft DXT1, DXT3, DXT5, and raw BGRA mipmapped textures).",
			},
			{
				q: "Are my game textures uploaded to an external server?",
				a: "Never. All BLP header parsing, DXT block decompression, palette color mapping, and PNG encoding occur strictly within your local browser sandbox.",
			},
		],
		related: [
			"image/dds-to-png",
			"image/vtf-to-png",
			"image/tga-to-png",
			"image/pcx-to-png",
			"image/qoi-to-png",
		],
	},
};
