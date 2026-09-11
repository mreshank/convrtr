import type { Tool } from "../../types";

export const chrToPng: Tool = {
	id: "image/chr-to-png",
	slug: "chr-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/x-nes-rom", "application/octet-stream"],
		ext: ["chr"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:chr-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 1x Sprite Sheet",
				explanation:
					"Extracts 8x8 NES 2bpp tiles into a pixel-perfect 128px wide PNG sprite sheet using authentic NES PPU 4-shade grayscale.",
				params: { scale: "1", palette: "grayscale" },
			},
			{
				id: "visually-lossless",
				label: "2x Scaled (Game Boy Green)",
				explanation:
					"Scales tiles by 2x nearest-neighbor with classic DMG-01 four-shade green phosphor tint.",
				params: { scale: "2", palette: "gameboy" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "scale",
				label: "Sprite Sheet Scale",
				group: "Display",
				default: "1",
				options: [
					{ value: "1", label: "1x Native (128 px wide)" },
					{ value: "2", label: "2x Integer Scaling (256 px wide)" },
					{ value: "4", label: "4x High DPI (512 px wide)" },
				],
			},
			{
				control: "select",
				key: "palette",
				label: "Color Palette",
				group: "Palette",
				default: "grayscale",
				options: [
					{ value: "grayscale", label: "NES PPU Grayscale (Default)" },
					{ value: "gameboy", label: "Game Boy DMG Green" },
					{ value: "mario", label: "Retro Platformer Color" },
				],
			},
		],
	},
	seo: {
		title:
			"NES CHR to PNG — Convert Nintendo CHR ROM Tiles (.chr) to PNG | convrtr",
		h1: "Convert NES CHR ROM (.chr) to PNG Sprite Sheet",
		intent:
			"Convert Nintendo NES and Famicom 2bpp CHR tile ROM files (.chr) into pixel-perfect 32-bit RGBA PNG sprite sheets directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is an NES CHR (.chr) file?",
				a: "In Nintendo Entertainment System (NES) and Famicom game cartridges, CHR (Character) ROM or CHR RAM holds the 2-bit-per-pixel (2bpp) graphical tile patterns rendered by the NES Picture Processing Unit (PPU). Standard CHR banks are 8,192 bytes (8KB) containing 512 distinct 8x8 pixel tiles.",
			},
			{
				q: "How does 2bpp NES tile decoding work?",
				a: "Each 8x8 tile is stored in 16 bytes: the first 8 bytes represent bitplane 0 (one bit per pixel across 8 rows), and the next 8 bytes represent bitplane 1. For each pixel, combining the two bits yields a 2-bit color index (0 to 3), which maps to one of four palette colors.",
			},
			{
				q: "Can I use the exported PNG in modern game engines like Unity or Godot?",
				a: "Yes! The exported file is a standard 32-bit RGBA PNG organized in a 16-tile grid (128 pixels wide). It imports directly into Unity, Godot, Aseprite, or GameMaker as a sliced sprite sheet.",
			},
			{
				q: "Are my ROM graphics uploaded to a remote server?",
				a: "Never. All bitplane reconstruction, palette mapping, and PNG encoding execute 100% locally inside your browser memory using pure TypeScript. No files or game data ever leave your device.",
			},
		],
		related: [
			"image/tim-to-png",
			"image/koa-to-png",
			"image/zx-to-png",
			"image/aseprite-to-png",
		],
	},
};
