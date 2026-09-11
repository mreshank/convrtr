import type { Tool } from "../../types";

export const fitsToPng: Tool = {
	id: "image/fits-to-png",
	slug: "fits-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/fits",
			"application/fits",
			"image/x-fits",
			"application/octet-stream",
		],
		ext: ["fits", "fit", "fts"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:fits-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Auto-Stretched 32-bit RGBA PNG",
				explanation:
					"Decodes NASA/ESA FITS astronomical images (8, 16, 32-bit integer or 32/64-bit float) into lossless PNG with contrast auto-stretching.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"FITS to PNG — Convert Astronomical FITS (.fits, .fit, .fts) to PNG | convrtr",
		h1: "Convert Astronomical FITS Images to PNG",
		intent:
			"Convert scientific FITS astronomical image data (.fits, .fit, .fts) from NASA, ESA, Hubble, James Webb Space Telescope (JWST), and astrophotography rigs into viewable lossless PNGs in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a FITS (.fits, .fit, .fts) file?",
				a: "FITS (Flexible Image Transport System) is the standard astronomical digital file format endorsed by the IAU (International Astronomical Union) and NASA. It stores high-dynamic-range scientific telescope data, CCD captures, and celestial coordinates alongside 2880-byte metadata header blocks.",
			},
			{
				q: "How does astronomical contrast stretching work?",
				a: "Raw telescope sensors capture linear photon counts with huge dynamic ranges (often 16-bit or 32-bit floating point), where faint nebulae and galaxies would appear pitch black without processing. convrtr applies smart percentile contrast auto-stretching and astronomical coordinate orientation to reveal deep-sky details in standard 8-bit per channel PNGs.",
			},
			{
				q: "Which FITS data types are supported?",
				a: "convrtr supports all standard BITPIX formats: 8-bit unsigned integers, 16-bit and 32-bit signed big-endian integers (with BZERO and BSCALE physical value transformation), 64-bit integers, and single-precision (-32) and double-precision (-64) IEEE 754 floating point arrays, as well as 3D RGB datacubes.",
			},
			{
				q: "Are my scientific captures uploaded anywhere?",
				a: "Never. All 2880-byte card parsing, pixel scaling, auto-stretch normalization, and PNG compression happen strictly inside your browser memory.",
			},
		],
		related: [
			"image/sgi-to-png",
			"image/xwd-to-png",
			"image/ras-to-png",
			"document/kmz-to-geojson",
		],
	},
};
