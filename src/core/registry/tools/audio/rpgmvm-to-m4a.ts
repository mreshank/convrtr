import type { Tool } from "../../types";

export const rpgmvmToM4a: Tool = {
	id: "audio/rpgmvm-to-m4a",
	slug: "rpgmvm-to-m4a",
	category: "audio",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "audio/mp4"],
		ext: ["rpgmvm"],
	},
	output: { ext: "m4a", mime: "audio/mp4" },
	engines: ["extract:rpgmvm-to-m4a"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Reverses the 16-byte XOR obfuscation using your project key. Output is bit-identical to the original unencrypted M4A audio file.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "RPGMVM to M4A — Decrypt RPG Maker Audio Files | convrtr",
		h1: "Decrypt RPG Maker .rpgmvm to M4A Audio",
		intent:
			"Decrypt encrypted .rpgmvm audio from RPG Maker MV and MZ games back to standard M4A files. 100% private in-browser decryption with zero uploads.",
		faq: [
			{
				q: "How do I decrypt .rpgmvm files?",
				a: "Enter the 16-byte hex encryption key from your game's data/System.json. If you don't have the file, decrypt an image from the same game using convrtr's RPGMVP to PNG tool to automatically deduce the key first.",
			},
			{
				q: "Is there any quality degradation?",
				a: "No. The audio stream is not re-encoded. Only the obfuscated header bytes are XOR-reversed, restoring the original M4A audio bit-for-bit.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. Decryption runs 100% locally in your browser memory.",
			},
		],
		related: ["image/rpgmvp-to-png", "audio/rpgmvo-to-ogg"],
	},
};
