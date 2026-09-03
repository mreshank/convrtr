import { defineVideoConversion } from "./defineVideoConversion";

export const movToMp4 = defineVideoConversion({
	from: "mov",
	to: "mp4",
	commonlyCopies: true,
	seo: {
		title: "Convert MOV to MP4 without re-encoding | convrtr",
		h1: "Convert MOV to MP4",
		intent:
			"MOV and MP4 are both built on the same underlying format (ISOBMFF), and a MOV from an iPhone or a camera almost always holds H.264 or HEVC video that MP4 carries natively. That makes this a container rewrite rather than a conversion: the streams are copied untouched, the video is bit-identical, and it takes seconds. Runs entirely in your browser.",
		faq: [
			{
				q: "Why is MOV to MP4 usually instant here?",
				a: "The two formats are close relatives — both are ISOBMFF containers — and the codecs inside are typically identical. So there is genuinely nothing to convert except the container's headers.",
			},
			{
				q: "My MOV is from an iPhone. Will it work?",
				a: "Yes. iPhones record H.264 or HEVC, both of which MP4 carries natively, so the streams copy directly. Note that HEVC in MP4 plays on Apple devices and modern Windows but not everywhere — re-encode to H.264 if you need maximum compatibility.",
			},
			{
				q: "Does it lose quality?",
				a: "No, when the streams copy — nothing is decoded, so nothing is degraded. If a re-encode is genuinely required the tool says so rather than doing it quietly.",
			},
		],
		related: ["video/mkv-to-mp4", "video/webm-to-mp4", "video/mp4-to-webm"],
	},
});
