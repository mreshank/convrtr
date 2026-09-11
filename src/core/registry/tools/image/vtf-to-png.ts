import type { Tool } from "../../types";

export const vtfToPng: Tool = {
	id: "image/vtf-to-png",
	slug: "vtf-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-vtf",
			"image/vtf",
			"application/x-vtf",
			"application/octet-stream",
		],
		ext: ["vtf"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:vtf-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless PNG Texture",
				explanation:
					"Extracts Valve Texture Format (.vtf) game textures into standard 32-bit RGBA PNG images. Decompresses DXT1, DXT5, BGRA8888, BGR888, and RGBA8888 textures from Source Engine games like Half-Life 2, TF2, CS:GO, and Garry's Mod.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"VTF to PNG — Convert Valve Source Engine Textures (.vtf) to PNG | convrtr",
		h1: "Convert Valve VTF Textures to Lossless PNG",
		intent:
			"Convert Valve Source Engine VTF (.vtf) game textures into transparent PNG images directly in your browser. Compatible with Team Fortress 2, Counter-Strike, Portal, Half-Life 2, and Garry's Mod textures with zero server uploads.",
		faq: [
			{
				q: "What is a .vtf file?",
				a: "VTF (Valve Texture Format) is the proprietary texture file format used by Valve's Source Engine. It packages mipmaps, bump maps, and compressed texture blocks (DXT1, DXT5, or uncompressed BGRA) for high-performance 3D rendering.",
			},
			{
				q: "Does this work on Mac and Linux without VTFEdit?",
				a: "Yes! VTFEdit is an abandoned 32-bit Windows utility that cannot run natively on modern macOS or 64-bit Linux. convrtr runs 100% inside any modern web browser on macOS, Linux, Windows, and ChromeOS.",
			},
			{
				q: "Which mipmap does convrtr extract?",
				a: "convrtr locates and extracts Mip 0, which is the full-resolution master texture stored within the VTF file.",
			},
			{
				q: "Is transparency preserved from DXT5 or BGRA textures?",
				a: "Yes! If the VTF texture includes an alpha channel (such as in DXT5, RGBA8888, or BGRA8888 formats), full transparency is preserved in the resulting PNG.",
			},
			{
				q: "Are my game textures or modding assets uploaded to any server?",
				a: "Never. All parsing, DXT block decompression, and PNG synthesis occur entirely in your local browser memory.",
			},
		],
		related: ["image/tga-to-png", "image/dds-to-png", "document/bsp-to-zip"],
	},
};
