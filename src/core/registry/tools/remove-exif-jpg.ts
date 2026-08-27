import { defineMetadataStrip } from "./image/defineMetadataStrip";

export const removeExifJpg = defineMetadataStrip({
	format: "jpeg",
	ext: "jpg",
	extraExt: ["jpeg"],
	slug: "remove-exif-jpg",
	mime: { input: ["image/jpeg", "image/jpg"], output: "image/jpeg" },
	seo: {
		title: "Remove EXIF and GPS data from a JPG | convrtr",
		h1: "Remove EXIF data from a JPG",
		intent:
			"Photos carry hidden metadata: GPS coordinates of where they were taken, the camera's serial number, timestamps, and the software that touched them. This strips that out without re-compressing the photo — the image data is copied byte for byte, so removing your location costs you no picture quality. The colour profile is deliberately kept, because dropping it would visibly shift the colours.",
		faq: [
			{
				q: "Does this reduce my photo's quality?",
				a: "No. JPEG metadata lives in separate marker segments ahead of the compressed image data, so it can be removed by rewriting the file's structure while copying the compressed pixels untouched. Tools that decode and re-encode the photo to strip metadata do lose quality; this does not.",
			},
			{
				q: "Does it remove the GPS location?",
				a: "Yes. GPS coordinates live in the EXIF block, which is removed in full. Camera model and serial number, capture timestamps, and editing-software fingerprints go with it.",
			},
			{
				q: "What is deliberately kept?",
				a: "The ICC colour profile and the JFIF header. Removing the colour profile would visibly change how the image renders on wide-gamut displays — a degradation disguised as a privacy feature — and some older decoders expect the JFIF header to be present.",
			},
			{
				q: "Do your other conversions also strip metadata?",
				a: "Yes, as a side effect. Converting between formats decodes to raw pixels and re-encodes, and metadata does not survive that round trip. This tool exists for when you want the metadata gone but the file otherwise untouched.",
			},
		],
		related: [
			"image/remove-metadata-png",
			"image/jpg-to-webp",
			"image/resize-jpg",
		],
	},
});
