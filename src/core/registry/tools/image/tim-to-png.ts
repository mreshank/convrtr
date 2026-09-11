import type { Tool } from "../../types";

export const timToPng: Tool = {
	id: "image/tim-to-png",
	slug: "tim-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-tim",
			"image/tim",
			"application/x-tim",
			"application/octet-stream",
		],
		ext: ["tim"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:tim-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-bit RGBA PNG",
				explanation:
					"Decodes PlayStation 1 CLUT paletted or direct color textures directly into crisp 32-bit RGBA PNG with authentic STP transparency processing.",
				params: {},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "enableTransparency",
				label: "Enable STP Semi-Transparency",
				group: "Color",
				default: true,
			},
		],
	},
	seo: {
		title:
			"TIM to PNG — Convert PlayStation 1 (PSX) Texture (.tim) to PNG | convrtr",
		h1: "Convert PlayStation 1 (.tim) to PNG",
		intent:
			"Extract authentic game textures, sprites, and user interface graphics from Sony PlayStation 1 (PSX) .tim files into lossless 32-bit transparent PNG. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is a PS1 TIM file?",
				a: "A TIM file is the standard graphic texture and sprite container used across Sony PlayStation 1 (PSX) games. It packages 4-bit (16-color) or 8-bit (256-color) indexed palettes (CLUT) or 15-bit/24-bit direct color bitmaps matched directly to the original PlayStation GPU framebuffer architecture.",
			},
			{
				q: "How does convrtr handle PlayStation 1 transparency?",
				a: "On the PlayStation 1 GPU, black color with STP=0 is treated as transparent, while STP=1 marks opaque black or semi-transparent blends. convrtr accurately applies this logic to produce clean alpha channels for game modding and preservation.",
			},
			{
				q: "Are multi-palette TIM files supported?",
				a: "Yes. Many PS1 games bundle multiple palette rows inside a single TIM to support character recolors or day/night lighting. convrtr decodes the primary palette by default.",
			},
			{
				q: "Does this require uploading files to a server?",
				a: "Never. All TIM file unpacking and PNG encoding happens 100% locally in your browser memory using pure client-side TypeScript.",
			},
		],
		related: [
			"image/ico-to-png",
			"image/tga-to-png",
			"image/pcx-to-png",
			"image/dds-to-png",
		],
	},
};
