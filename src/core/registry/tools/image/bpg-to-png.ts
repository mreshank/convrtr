import type { Tool } from "../../types";

export const bpgToPng: Tool = {
	id: "image/bpg-to-png",
	slug: "bpg-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/bpg",
			"image/x-bpg",
			"application/x-bpg",
			"application/octet-stream",
		],
		ext: ["bpg"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:bpg-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-Bit RGBA PNG",
				explanation:
					"Decodes Fabrice Bellard's Better Portable Graphics image data into standard uncompressed 32-bit RGBA PNG.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"BPG to PNG — Convert Better Portable Graphics (.bpg) to PNG Online | convrtr",
		h1: "Convert Better Portable Graphics (.bpg) to PNG",
		intent:
			"Decode and convert Better Portable Graphics files (.bpg) into standard 32-bit RGBA PNG images directly in your browser. 100% private client-side decoding with zero server uploads.",
		faq: [
			{
				q: "What is a Better Portable Graphics (.bpg) file?",
				a: "BPG (Better Portable Graphics) is an image format created by Fabrice Bellard designed as a high-efficiency replacement for JPEG. It is based on a subset of the HEVC (High Efficiency Video Coding) intra-frame video compression standard, offering superior compression ratios at equivalent quality.",
			},
			{
				q: "Why do browsers not support BPG natively?",
				a: "Despite its technical compression advantages over JPEG, BPG was not adopted natively by major web browser vendors due to HEVC patent licensing complexities. convrtr decodes BPG files purely in client-side TypeScript/WebAssembly so you can view and export them as PNG.",
			},
			{
				q: "Are my images uploaded to external servers?",
				a: "No. All BPG bitstream parsing, YCbCr color conversion, and PNG encoding occur strictly within your local browser sandbox. No image data is ever transmitted across the network.",
			},
		],
		related: [
			"image/qoi-to-png",
			"image/hdr-to-png",
			"image/png-to-webp",
			"image/jpg-to-webp",
			"image/dds-to-png",
		],
	},
};
