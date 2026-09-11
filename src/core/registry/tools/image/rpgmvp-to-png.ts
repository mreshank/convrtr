import type { Tool } from "../../types";

export const rpgmvpToPng: Tool = {
	id: "image/rpgmvp-to-png",
	slug: "rpgmvp-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream"],
		ext: ["rpgmvp"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:rpgmvp-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless (Auto Key Recovery)",
				explanation:
					"Automatically recovers the 16-byte XOR key from the standard PNG signature. The decrypted image comes out bit-identical to the original artwork.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "RPGMVP to PNG — Decrypt RPG Maker MV/MZ Images Online | convrtr",
		h1: "Decrypt RPG Maker .rpgmvp to PNG",
		intent:
			"Decrypt encrypted .rpgmvp game images from RPG Maker MV and MZ games back to standard PNG files. Automatically deduces the XOR encryption key with zero configuration needed. 100% private in-browser decryption.",
		faq: [
			{
				q: "Do I need the System.json encryption key to decrypt?",
				a: "No! All PNG files start with the exact same standard 16-byte signature. Because RPG Maker uses simple XOR obfuscation on the first 16 bytes, convrtr automatically calculates the exact encryption key from the image itself without needing System.json.",
			},
			{
				q: "Does this work for both RPG Maker MV and MZ?",
				a: "Yes. Both RPG Maker MV and MZ use the same container structure with the 'RPGMV' header and 16-byte XOR key.",
			},
			{
				q: "Is any quality lost during decryption?",
				a: "No. Decryption is a purely mathematical reversal of the XOR operation. The resulting PNG is byte-for-byte identical to the developer's original image before export.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. The decryption algorithm runs entirely inside your browser's JavaScript engine. No images are sent to any remote server.",
			},
		],
		related: ["image/png-to-webp", "image/png-to-jpg"],
	},
};
