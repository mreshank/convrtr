import type { Tool } from "../../types";

export const ppmToPng: Tool = {
	id: "image/ppm-to-png",
	slug: "ppm-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-portable-pixmap",
			"image/x-portable-graymap",
			"image/x-portable-bitmap",
			"image/x-portable-anymap",
			"image/ppm",
			"image/pbm",
			"image/pgm",
			"application/octet-stream",
		],
		ext: ["ppm", "pgm", "pbm", "pnm", "pam"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:ppm-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-bit RGBA PNG",
				explanation:
					"Decodes Netpbm PBM (P1/P4), PGM (P2/P5), PPM (P3/P6), and PAM (P7) images directly into lossless 32-bit RGBA PNG.",
				params: {},
			},
			{
				id: "custom",
				label: "Inverted Monochrome (PBM)",
				explanation:
					"Inverts 1-bit monochrome PBM foreground/background pixels before PNG encoding.",
				params: { invertMonochrome: true },
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"PPM to PNG — Convert Netpbm (.ppm, .pgm, .pbm, .pnm) to PNG Online Free | convrtr",
		h1: "Convert Netpbm PPM, PGM, PBM Images to PNG",
		intent:
			"Convert Netpbm images (.ppm, .pgm, .pbm, .pnm, .pam) from Linux, Unix, OpenCV, computer vision, and scientific pipelines into viewable lossless PNGs directly in your browser with zero uploads.",
		faq: [
			{
				q: "What are Netpbm format files (.ppm, .pgm, .pbm, .pnm)?",
				a: "Netpbm (PNM / Portable AnyMap) is a family of minimal graphics formats designed by Jef Poskanzer for Unix: PBM (Portable BitMap for 1-bit monochrome), PGM (Portable GrayMap for grayscale), PPM (Portable PixMap for RGB color), and PAM (Portable Arbitrary Map). They are standard outputs in OpenCV, computer vision models, ray tracers, and embedded graphics pipelines.",
			},
			{
				q: "Which Netpbm variants are supported?",
				a: "convrtr supports all standard Netpbm magic variants: P1 (ASCII monochrome), P2 (ASCII grayscale), P3 (ASCII RGB), P4 (binary packed monochrome), P5 (binary 8-bit & 16-bit grayscale), P6 (binary 8-bit & 16-bit RGB), and P7 (binary PAM with alpha channels), as well as multi-line comments and flexible whitespace separators.",
			},
			{
				q: "Why can't modern browsers display .ppm or .pgm files?",
				a: "Modern web browsers and operating systems (macOS, Windows, iOS, Android) lack native image decoders for Netpbm formats. Converting them to PNG makes them instantly viewable, shareable, and embeddable without installing GIMP, ImageMagick, or Python.",
			},
			{
				q: "Is my image data kept private?",
				a: "Yes, 100%. The Netpbm parser and PNG encoder run entirely in your local browser memory. No pixel data is ever transmitted across the network.",
			},
		],
		related: [
			"image/xbm-to-png",
			"image/xpm-to-png",
			"image/xwd-to-png",
			"image/ras-to-png",
		],
	},
};
