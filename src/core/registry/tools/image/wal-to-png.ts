import type { Tool } from "../../types";

export const walToPng: Tool = {
	id: "image/wal-to-png",
	slug: "wal-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-wal",
			"image/wal",
			"application/x-quake2-wal",
			"application/octet-stream",
		],
		ext: ["wal"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:wal-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "mip0",
		presets: [
			{
				id: "mip0",
				label: "Full Resolution (Mipmap 0)",
				explanation:
					"Decodes the full-resolution base mipmap (Level 0) using the standard Quake II 256-color palette into 32-bit RGBA PNG.",
				params: { mipmapLevel: 0 },
			},
			{
				id: "mip1",
				label: "Half Resolution (Mipmap 1)",
				explanation:
					"Decodes the half-resolution second mipmap level (Level 1) into 32-bit RGBA PNG.",
				params: { mipmapLevel: 1 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "mipmapLevel",
				label: "Mipmap Level",
				group: "Texture",
				min: 0,
				max: 3,
				step: 1,
				default: 0,
			},
		],
	},
	seo: {
		title: "WAL to PNG — Convert Quake II WAL Texture to PNG Online | convrtr",
		h1: "Convert Quake II WAL Texture to PNG",
		intent:
			"Decode and convert id Software Quake II WAL texture files into transparent 32-bit RGBA PNG images directly in your browser. Extracts mipmapped surface textures 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a Quake II WAL (.wal) texture file?",
				a: "WAL is the texture format created by id Software for Quake II (id Tech 2 engine, 1997) and games such as Heretic II, SiN, Daikatana, Kingpin: Life of Crime, and Anachronox. Each WAL file contains a 100-byte header, texture animation metadata, and four pre-generated downsampled mipmap levels indexed into the 256-color Quake II colormap.",
			},
			{
				q: "How does convrtr decode WAL textures?",
				a: "convrtr reads the 100-byte WAL header, inspects the mipmap offsets, applies the canonical Quake II 256-color colormap palette, and writes standard 32-bit RGBA PNG image frames in browser memory.",
			},
			{
				q: "Are my game textures or mod assets uploaded to external servers?",
				a: "Never. All WAL header parsing, palette indexing, and PNG compression occur 100% locally within your browser sandbox. No graphics data is ever transmitted across the internet.",
			},
		],
		related: [
			"image/pcx-to-png",
			"image/tga-to-png",
			"image/blp-to-png",
			"image/vtf-to-png",
			"image/dds-to-png",
		],
	},
};
