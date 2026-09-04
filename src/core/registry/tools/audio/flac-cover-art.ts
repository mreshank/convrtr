import type { Tool } from "../../types";

export const coverArtFLAC: Tool = {
	id: "audio/flac-cover-art",
	slug: "flac-cover-art",
	category: "audio",
	kind: "extract",
	accept: { mime: ["audio/flac", "audio/x-flac"], ext: ["flac"] },
	// The real type is reported by the engine once it sees the file — embedded
	// art is JPEG far more often than not, but PNG is common enough that
	// guessing would misname real files.
	output: { ext: "jpg", mime: "image/jpeg" },
	engines: ["extract:cover-flac"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Copies the artwork out exactly as it was stored. The image is not re-encoded, so it is byte-for-byte what was embedded.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Extract cover art from FLAC — free, in your browser | convrtr",
		h1: "Extract cover art from a FLAC",
		intent:
			"Pull the embedded album artwork out of a FLAC file as an image. The picture is copied out exactly as it was stored, not re-encoded. Runs entirely in your browser — the file never leaves your device.",
		faq: [
			{
				q: "Is the image re-compressed?",
				a: "No. The artwork sits inside the file's PICTURE metadata block as a complete JPEG or PNG, so extracting it means copying those bytes out unchanged. Re-encoding would visibly degrade an image you are only trying to retrieve — and would do so invisibly, which is worse.",
			},
			{
				q: "Why did I get a .png when I expected a .jpg?",
				a: "Because that is what was actually embedded. convrtr identifies the image from its own bytes rather than trusting the tag's declared type, which taggers frequently get wrong, and names the file accordingly. If the format is not one it recognises, it saves a .bin rather than guessing — the bytes are still exactly what the file held.",
			},
			{
				q: "Nothing was extracted — why?",
				a: "The file has no embedded artwork. Cover images shown in a music player often come from a folder image or an online lookup rather than from inside the file itself, so a track can display art it does not actually contain.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: [
			"audio/mp3-cover-art",
			"audio/remove-tags-flac",
			"image/png-to-webp",
		],
	},
};
