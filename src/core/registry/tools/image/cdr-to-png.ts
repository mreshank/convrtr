import type { Tool } from "../../types";

export const cdrToPng: Tool = {
	id: "image/cdr-to-png",
	slug: "cdr-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/cdr",
			"application/x-cdr",
			"image/x-cdr",
			"application/coreldraw",
			"application/octet-stream",
		],
		ext: ["cdr"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:cdr-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full-Resolution Artwork Preview",
				explanation:
					"Extracts the full-resolution composite artwork preview PNG embedded inside CorelDRAW (.cdr) files. Compatible with CorelDRAW X4 through 2024 ZIP containers and legacy RIFF files, with zero server uploads.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "CDR to PNG — Extract CorelDRAW Artwork Preview Online | convrtr",
		h1: "Convert CorelDRAW (.cdr) to PNG",
		intent:
			"Open and extract full-resolution raster preview images from CorelDRAW (.cdr) files on Mac, Windows, Linux, and mobile devices without paying for CorelDRAW or uploading files to remote servers.",
		faq: [
			{
				q: "Why can't I open .cdr files on Mac or in Adobe Illustrator?",
				a: "CorelDRAW is a Windows-centric vector graphics suite. Adobe removed native .cdr import support from Adobe Illustrator starting with Creative Cloud / CS6, and macOS has no built-in viewer for CorelDRAW files. Freelancers and print shops frequently receive .cdr files from clients without having access to CorelDRAW.",
			},
			{
				q: "How does convrtr extract images from .cdr files without CorelDRAW?",
				a: "Modern CorelDRAW files (version X4 through CorelDRAW 2024) are packaged as ZIP containers containing high-resolution raster composite previews (such as previews/thumbnail.png). convrtr inspects the container, extracts the exact artwork bitmap, and provides an instant lossless PNG image.",
			},
			{
				q: "Does this support older legacy CorelDRAW files?",
				a: "Yes! In addition to modern PKZIP-based .cdr files, convrtr scans legacy RIFF-based CorelDRAW containers (versions 1 through 13) to locate and extract embedded bitmap and PNG preview streams.",
			},
			{
				q: "What resolution will the extracted PNG be?",
				a: "The resolution matches the embedded composite thumbnail generated when the designer saved the file in CorelDRAW, often ranging from high-definition 1024x1024 up to full print-resolution page composites.",
			},
			{
				q: "Are my confidential client designs uploaded to any cloud server?",
				a: "No. All container inspection, decompression, and PNG extraction occur 100% locally inside your web browser. Your vectors, brand graphics, and client documents never leave your computer.",
			},
		],
		related: [
			"image/studio3-to-svg",
			"image/clip-to-png",
			"image/procreate-to-png",
		],
	},
};
