import type { Tool } from "../../types";

export const srfToPng: Tool = {
	id: "image/srf-to-png",
	slug: "srf-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-sony-srf",
			"image/x-sony-sr2",
			"image/x-sony-arw",
			"image/tiff",
			"application/octet-stream",
		],
		ext: ["srf", "sr2"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:srf-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "preview",
		presets: [
			{
				id: "preview",
				label: "High-Resolution Preview Extraction",
				explanation:
					"Extracts the high-resolution embedded preview image preserved within the Sony Alpha RAW container directly to 32-bit RGBA PNG.",
				params: { extractPreview: true },
			},
			{
				id: "full",
				label: "Standard Extraction",
				explanation:
					"Inspects TIFF IFD metadata tags and parses full image dimensions into 32-bit RGBA PNG.",
				params: { extractPreview: false },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "extractPreview",
				label: "Extract Embedded Preview",
				group: "RAW Extraction",
				default: true,
			},
		],
	},
	seo: {
		title: "SRF to PNG — Convert Sony Alpha RAW to PNG Online | convrtr",
		h1: "Convert Sony Alpha RAW (.srf) to PNG",
		intent:
			"Extract and convert Sony Alpha DSLR camera RAW image files (.srf, .sr2) into 32-bit transparent PNG format directly in your browser. Extracts lossless embedded previews 100% client-side with zero cloud uploads.",
		faq: [
			{
				q: "What is a Sony SRF (.srf) file?",
				a: "SRF (Sony Raw Format) is an early uncompressed or lossless raw image format produced by Sony Cyber-shot (e.g. DSC-R1) and early Alpha DSLR cameras (e.g. DSLR-A100) before standardizing on the ARW format. It contains raw CCD/CMOS sensor data stored inside a TIFF-based container alongside embedded preview streams.",
			},
			{
				q: "How does convrtr extract images from SRF files?",
				a: "convrtr parses the TIFF container and Image File Directory (IFD) structures to locate JPEGInterchangeFormat markers, extracts the high-resolution embedded photo preview or raw frame, and renders it directly as a standard 32-bit RGBA PNG.",
			},
			{
				q: "Are my camera photos uploaded to any external server?",
				a: "No. All raw parsing, EXIF metadata inspection, and PNG conversion run 100% locally in your web browser. Your private photos never leave your device.",
			},
		],
		related: [
			"image/fits-to-png",
			"image/dcm-to-png",
			"image/hdr-to-png",
			"image/tga-to-png",
			"image/dds-to-png",
		],
	},
};
