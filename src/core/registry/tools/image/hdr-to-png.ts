import type { Tool } from "../../types";

export const hdrToPng: Tool = {
	id: "image/hdr-to-png",
	slug: "hdr-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/vnd.radiance",
			"image/x-hdr",
			"image/hdr",
			"application/x-radiance-hdr",
			"application/octet-stream",
		],
		ext: ["hdr", "pic"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:hdr-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Tone-Mapped 32-Bit RGBA PNG",
				explanation:
					"Converts 32-bit floating-point RGBE high dynamic range data into viewable standard 32-bit RGBA PNG with Reinhard tone mapping and sRGB gamma curve.",
				params: {},
			},
		],
		advanced: [
			{
				control: "slider",
				key: "exposure",
				label: "Exposure Multiplier",
				group: "Color",
				default: 1.0,
				min: 0.1,
				max: 10.0,
				step: 0.1,
			},
			{
				control: "slider",
				key: "gamma",
				label: "Display Gamma",
				group: "Color",
				default: 2.2,
				min: 1.0,
				max: 3.0,
				step: 0.1,
			},
		],
	},
	seo: {
		title: "HDR to PNG — Convert Radiance RGBE (.hdr) to PNG Online | convrtr",
		h1: "Convert Radiance HDR (.hdr) to PNG",
		intent:
			"Convert Radiance RGBE (.hdr, .pic) high dynamic range environment maps and lighting textures to standard viewable 32-bit RGBA PNG images directly in your browser. 100% private client-side tone mapping with zero server uploads.",
		faq: [
			{
				q: "What is a Radiance HDR (.hdr) file?",
				a: "Radiance HDR (also known as RGBE) is a high dynamic range raster image format developed by Greg Ward at Lawrence Berkeley National Laboratory. It stores 32 bits per pixel (8 bits each for red, green, blue, and a shared common exponent), allowing scenes with extreme contrast ratios such as 360-degree environment skyboxes, game lighting, and scientific simulations.",
			},
			{
				q: "Why convert Radiance HDR to PNG?",
				a: "Standard photo viewers, websites, smartphones, and graphic software often cannot display floating-point HDR files directly. Converting to PNG applies Reinhard tone mapping and standard sRGB gamma correction, producing a rich, clear 8-bit per channel image viewable on any device.",
			},
			{
				q: "How does tone mapping work in this converter?",
				a: "The converter decodes adaptive run-length encoded (RLE) RGBE scanlines into linear radiometric floating-point values, scales them by exposure, passes them through a Reinhard tone reproduction operator (L / (1 + L)), and maps the values through an sRGB gamma 2.2 transfer curve into standard 8-bit color channels.",
			},
			{
				q: "Are my 3D assets or HDR images uploaded to a server?",
				a: "Never. All decoding, floating-point math, tone mapping, and PNG chunk generation happen 100% in your local browser using pure WebAssembly and TypeScript. Your files never leave your computer.",
			},
		],
		related: [
			"image/dds-to-png",
			"image/tga-to-png",
			"image/ppm-to-png",
			"image/qoi-to-png",
		],
	},
};
