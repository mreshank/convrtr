import type { Tool } from "../../types";

export const rpgmvoToOgg: Tool = {
	id: "audio/rpgmvo-to-ogg",
	slug: "rpgmvo-to-ogg",
	category: "audio",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "audio/ogg"],
		ext: ["rpgmvo"],
	},
	output: { ext: "ogg", mime: "audio/ogg" },
	engines: ["extract:rpgmvo-to-ogg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Reverses the 16-byte XOR obfuscation using your project key. Output is bit-identical to the original unencrypted OGG Vorbis audio track.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "RPGMVO to OGG — Decrypt RPG Maker Audio & BGM | convrtr",
		h1: "Decrypt RPG Maker .rpgmvo to OGG Audio",
		intent:
			"Decrypt encrypted .rpgmvo background music (BGM) and sound effects from RPG Maker MV and MZ games back to standard OGG audio. 100% private in-browser decryption with zero uploads.",
		faq: [
			{
				q: "Where do I find the encryption key for .rpgmvo audio?",
				a: "The 16-byte encryption key is stored in your game's data/System.json file under the 'encryptionKey' field. If you don't have System.json, you can also decrypt any .rpgmvp image from the same game with convrtr first — convrtr automatically deduces the key from image headers.",
			},
			{
				q: "Does this affect sound quality?",
				a: "No. Decryption is a purely mathematical reversal of the XOR operation. The resulting OGG audio stream is bit-for-bit identical to the composer's master recording.",
			},
			{
				q: "Are my audio files uploaded anywhere?",
				a: "No. The entire decryption process takes place in your local browser runtime. Your game files never leave your device.",
			},
		],
		related: ["image/rpgmvp-to-png"],
	},
};
