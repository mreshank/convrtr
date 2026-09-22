import type { Tool } from "../../types";

export const isoToZip: Tool = {
	id: "document/iso-to-zip",
	slug: "iso-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-iso9660-image", "application/octet-stream"],
		ext: ["iso"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:iso-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Extract Files",
				explanation:
					"Walks the ISO 9660 (and Joliet when present) directory tree and copies each file out of its sectors bit-exact — no conversion, no loss. You get the original bytes for every file on the volume.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "ISO to ZIP — Extract Files From an ISO 9660 Image | convrtr",
		h1: "Extract ISO Disc Image to ZIP",
		intent:
			"Pull the actual files out of an ISO 9660 disc image without mounting it or installing anything — 20-year-old software discs, game rip tool downloads, FreeBSD and Debian release ISO contents. This tool reads the volume descriptor, walks the directory tree (Joliet long names included) and re-zips every file bit-exact, entirely in your browser.",
		faq: [
			{
				q: "Why would I extract an ISO instead of mounting it?",
				a: "You might not have mount rights on a locked-down machine, be on Android or iOS where ISO mounting needs an app, or just want individual files out of a large disc image — games, drivers, installers — without downloading 700MB for one 10KB file.",
			},
			{
				q: "Does this support Joliet long file names?",
				a: "Yes. When the image carries a Joliet Supplementary Volume Descriptor (escape sequence %/@), the whole tree is read with UCS-2 long names. Plain 9660 images use their 8.3 d-character names.",
			},
			{
				q: "Is this lossless?",
				a: "Every file byte is copied from its sector unchanged, so extracted files are bit-identical to what would come off the mounted disc. Nothing is transcoded.",
			},
			{
				q: "What about UDF or Blu-ray images?",
				a: "UDF images are refused with a clear message — they use a different filesystem and are out of scope for this tool. ISO 9660 is the target.",
			},
			{
				q: "Is my disc image uploaded anywhere?",
				a: "No. Sector reading and zipping run entirely inside your browser.",
			},
		],
		related: [
			"document/mat-to-zip",
			"document/pak-to-zip",
			"document/cb7-to-pdf",
		],
	},
};
