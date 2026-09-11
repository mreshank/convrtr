import type { Tool } from "../../types";

export const ddsToPng: Tool = {
	id: "image/dds-to-png",
	slug: "dds-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-dds",
			"image/dds",
			"application/x-dds",
			"application/dds",
			"application/octet-stream",
		],
		ext: ["dds"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:dds-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Direct Texture Decompression",
				explanation:
					"Decodes DXT1 (BC1), DXT3 (BC2), DXT5 (BC3), BC5 normal maps, and uncompressed RGBA/BGRA game textures into standard lossless PNG images with full alpha channel preservation.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"DDS to PNG — Convert DirectDraw Surface Textures to PNG Online | convrtr",
		h1: "Convert DDS Textures to PNG",
		intent:
			"Convert DirectDraw Surface game textures (.dds) into transparent PNG images directly in your browser. Decode Skyrim, Fallout, Unreal, Unity, GTA, and flight simulator textures without installing Photoshop plugins or command-line tools.",
		faq: [
			{
				q: "Which DDS compression formats are supported?",
				a: "This converter supports DXT1 (BC1 with 1-bit or no alpha), DXT3 (BC2 explicit alpha), DXT5 (BC3 interpolated alpha), BC5 / ATI2 (tangent space normal maps with blue channel reconstruction), and uncompressed 32-bit and 24-bit RGBA / BGRA formats.",
			},
			{
				q: "Do I need DirectXTex, texconv, or Photoshop plugins installed?",
				a: "No! All block decompression (BC1/BC2/BC3/BC5) and PNG encoding executes in pure TypeScript inside your browser. You can convert textures instantly on Windows, macOS, Linux, Chromebooks, or mobile devices.",
			},
			{
				q: "Does this preserve transparency and normal maps?",
				a: "Yes. Textures with alpha transparency (like foliage, decals, and UI sprites) retain their full 8-bit alpha channels. BC5 normal maps are decompressed into standard RGB normal map images ready for 3D modeling programs.",
			},
			{
				q: "Are my game textures or 3D art files uploaded anywhere?",
				a: "No. Everything runs 100% locally in your browser's memory with zero server uploads. Your game assets and unreleased mods remain strictly confidential.",
			},
		],
		related: ["image/clip-to-png", "image/icns-to-png"],
	},
};
