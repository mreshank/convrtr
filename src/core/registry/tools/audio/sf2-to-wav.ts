import type { Tool } from "../../types";

export const sf2ToWav: Tool = {
	id: "audio/sf2-to-wav",
	slug: "sf2-to-wav",
	category: "audio",
	kind: "extract",
	accept: {
		mime: ["audio/x-soundfont", "application/octet-stream"],
		ext: ["sf2"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:sf2-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Extracts raw 16-bit linear PCM instrument sample slices and writes bit-exact standard WAV files bundled into a ZIP archive.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "SF2 to WAV — Extract Instrument Samples from SoundFonts | convrtr",
		h1: "Extract WAV Instrument Samples from a SoundFont (.sf2)",
		intent:
			"Extract all instrument samples and audio recordings from SoundFont 2 (.sf2) soundbanks as a clean ZIP archive of standard 16-bit WAV files. Sample vintage synthesizers and game soundfonts directly in your browser with zero uploads.",
		faq: [
			{
				q: "What does this tool produce?",
				a: "This tool inspects the SoundFont's sample headers (shdr) and sample data (smpl), extracts each individual instrument recording, prepends a standard 44-byte WAV header, and packages all samples into a single downloadable .zip archive.",
			},
			{
				q: "Is there any loss of audio quality?",
				a: "No. SoundFonts store audio as uncompressed 16-bit linear PCM. This tool slices those exact PCM bytes into standard WAV files without any resampling or lossy re-encoding.",
			},
			{
				q: "Can I use these WAV samples in modern DAWs?",
				a: "Yes! The extracted WAV files are standard PCM audio compatible with Ableton Live, FL Studio, Logic Pro, Reaper, MPCs, and samplers like Kontakt or Decent Sampler.",
			},
			{
				q: "Are my SoundFont files uploaded anywhere?",
				a: "No. The entire extraction and ZIP generation process takes place in your local browser memory using JavaScript. Nothing is sent to any server.",
			},
		],
		related: [],
	},
};
