import type { Tool } from "../../types";

export const wavToFlac: Tool = {
	id: "audio/wav-to-flac",
	slug: "wav-to-flac",
	category: "audio",
	kind: "compress",
	accept: { mime: ["audio/wav", "audio/x-wav", "audio/wave"], ext: ["wav"] },
	output: { ext: "flac", mime: "audio/flac" },
	engines: ["flac:encode"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"About half the size, and decoding it returns exactly the samples that went in. The encoder decodes its own output and compares, so this is checked rather than assumed.",
				params: { compression: 5, verify: true },
			},
			{
				id: "smallest",
				label: "Smallest file",
				explanation:
					"The highest compression setting. Still perfectly lossless — FLAC has no lossy mode — it simply works harder for a few percent more, and takes longer.",
				params: { compression: 8, verify: true },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "compression",
				label: "Compression effort (0 fastest, 8 smallest)",
				group: "Encoder",
				min: 0,
				max: 8,
				step: 1,
				default: 5,
			},
			{
				control: "toggle",
				key: "verify",
				label: "Decode the output and compare it while encoding",
				group: "Encoder",
				default: true,
			},
		],
	},
	seo: {
		title: "Convert WAV to FLAC — lossless, free, in your browser | convrtr",
		h1: "Convert WAV to FLAC",
		intent:
			"Compress WAV files to FLAC without losing a single sample. FLAC is to audio what PNG is to images: roughly half the size, and decoding it gives back exactly what went in. Runs entirely in your browser — your audio never leaves your device.",
		faq: [
			{
				q: "Is FLAC really lossless?",
				a: "Yes, and not in the loose sense of 'you cannot hear the difference'. Decoding a FLAC gives back the identical integer samples that were encoded — you can convert WAV to FLAC and back and compare the files byte for byte. convrtr goes further and has the encoder decode its own output and compare as it works, so a corrupted encode fails rather than shipping quietly.",
			},
			{
				q: "How much smaller will my file be?",
				a: "Typically 40-60% of the WAV, depending on the music. Quiet, sparse or repetitive audio compresses further; dense, loud material less. Unlike MP3 there is no quality setting that trades detail for size — the compression effort only changes how hard the encoder works to find redundancy, never what it keeps.",
			},
			{
				q: "Why would I use this instead of MP3?",
				a: "Because MP3 permanently discards audio to save space, and you cannot get it back. FLAC is for keeping — archives, masters, anything you may want to re-edit or re-encode later. MP3 and similar formats are for delivery, where the file is played and not worked on further. Converting FLAC to MP3 later is easy; the reverse is impossible.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while converting — or by going offline first.",
			},
		],
		related: ["audio/flac-to-wav", "audio/mp4-to-m4a", "image/png-to-webp"],
	},
};
