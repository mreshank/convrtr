import { defineVideoConversion } from "./defineVideoConversion";

export const webmToMp4 = defineVideoConversion({
	from: "webm",
	to: "mp4",
	commonlyCopies: false,
	seo: {
		title: "Convert WebM to MP4 | convrtr",
		h1: "Convert WebM to MP4",
		intent:
			"WebM usually holds VP8 or VP9 video, which MP4 either cannot carry or carries in a way many players refuse to open. So unlike our MKV and MOV conversions, this one genuinely re-encodes — and says so rather than pretending otherwise. Newer WebM files using AV1 and Opus are a different matter: those are legal in MP4 and get copied untouched. Either way it runs in your browser and nothing is uploaded.",
		faq: [
			{
				q: "Why does this one re-encode when your MKV tool does not?",
				a: "Because of what is inside. MKV normally holds H.264 and AAC, which MP4 carries natively, so those streams copy. WebM normally holds VP8 or VP9, which MP4 cannot carry usefully. If your WebM holds AV1 and Opus, they are legal in MP4 and will be copied.",
			},
			{
				q: "VP9 in MP4 is technically allowed. Why not just copy it?",
				a: "It is spec-legal, and many players still cannot decode it. A lossless copy that produces a file you cannot open is worse than an honest re-encode, so the safe path is the default. You can override it if you know your playback target handles VP9.",
			},
			{
				q: "How much quality is lost?",
				a: "Re-encoding always costs something, since the video is decompressed and compressed again. At the default settings the difference is not visible in normal viewing, but it is a real generation loss and worth avoiding if MP4 is not strictly required.",
			},
		],
		related: ["video/mkv-to-mp4", "video/mov-to-mp4", "video/mp4-to-webm"],
	},
});
