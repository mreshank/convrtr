import type { Tool } from "../../types";

export const wavToOpus: Tool = {
	id: "audio/wav-to-opus",
	slug: "wav-to-opus",
	category: "audio",
	kind: "convert",
	accept: { mime: ["audio/wav", "audio/x-wav", "audio/wave"], ext: ["wav"] },
	output: { ext: "ogg", mime: "audio/ogg" },
	engines: ["opus:encode"],
	quality: {
		// Lossy, like MP3. Better at the same bitrate, but still lossy — and the
		// distinction this catalogue depends on is lossless versus not.
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "visually-lossless",
				label: "Best quality",
				explanation:
					"160kbps. Beyond the point most listeners can distinguish from the original, on most equipment and material.",
				params: { bitrate: 160_000 },
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation:
					"96kbps, and broadly comparable to a 192kbps MP3. The usual choice for music.",
				params: { bitrate: 96_000 },
			},
			{
				id: "smallest",
				label: "Smallest file",
				explanation:
					"48kbps. Still very good for speech and podcasts; audibly compressed on dense music.",
				params: { bitrate: 48_000 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "bitrate",
				label: "Bitrate (bits per second)",
				group: "Encoder",
				min: 32_000,
				max: 320_000,
				step: 8_000,
				default: 96_000,
			},
		],
	},
	seo: {
		title: "Convert WAV to Opus — free, private, in your browser | convrtr",
		h1: "Convert WAV to Opus",
		intent:
			"Convert WAV files to Opus in an Ogg container, without uploading them. Opus reaches the quality of an MP3 at roughly half the bitrate, and your browser encodes it directly — nothing leaves your device.",
		faq: [
			{
				q: "Should I use Opus or MP3?",
				a: "Opus, unless something you need cannot play it. At the same file size it sounds better — 96kbps Opus is broadly comparable to a 192kbps MP3 — and it handles speech as well as music, where MP3 struggles. MP3's advantage is that it plays on absolutely everything, including car stereos and hardware from the 2000s. Opus is supported by every current browser, phone and desktop player.",
			},
			{
				q: "Is Opus lossless?",
				a: "No. Opus discards audio permanently, exactly as MP3 does — it is simply much better at choosing what to discard. If you want a smaller file with nothing lost, FLAC is the answer: about half the size of WAV, and every sample preserved.",
			},
			{
				q: "Why is the file a .ogg?",
				a: "Opus is the audio codec; it has to sit inside a container, and Ogg is its most widely supported one. The file holds Opus audio regardless of the extension. Some players label these files 'Ogg Opus' to distinguish them from older Ogg Vorbis.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. This conversion uses your browser's own audio encoder, so there is not even a codec to download — you can confirm the whole thing by converting with your network tab open, or offline.",
			},
		],
		related: ["audio/wav-to-mp3", "audio/wav-to-flac", "audio/flac-to-wav"],
	},
};
