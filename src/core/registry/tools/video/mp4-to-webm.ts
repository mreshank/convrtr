import { defineVideoConversion } from "./defineVideoConversion";

export const mp4ToWebm = defineVideoConversion({
	from: "mp4",
	to: "webm",
	commonlyCopies: false,
	seo: {
		title: "Convert MP4 to WebM | convrtr",
		h1: "Convert MP4 to WebM",
		intent:
			"WebM cannot carry H.264, which is what almost every MP4 holds, so this conversion genuinely re-encodes to VP9 and Opus. That is a real cost in both time and a generation of quality, and it is worth being sure you need WebM before paying it — every current browser plays H.264 MP4 perfectly well. Where it does help is royalty-free distribution and smaller files at the same visual quality. Runs entirely in your browser.",
		faq: [
			{
				q: "Do I actually need WebM?",
				a: "Often not. Every current browser plays H.264 MP4, so if compatibility is the goal you already have it. WebM is worth it for royalty-free codecs, or because VP9 and AV1 reach similar quality at smaller sizes — which matters if you are serving a lot of video.",
			},
			{
				q: "Why can this not copy the streams like your MKV tool?",
				a: "WebM's specification permits only VP8, VP9 and AV1 for video, and Opus or Vorbis for audio. H.264 and AAC — what MP4 almost always holds — are not on that list, so there is nothing to copy and the video must be re-encoded.",
			},
			{
				q: "How long does it take?",
				a: "Much longer than a container rewrite, because every frame is decoded and re-encoded. It uses your device's hardware encoder via WebCodecs where one is available, which is far faster than a software encoder, but it is still real work proportional to the video's length.",
			},
		],
		related: ["video/mkv-to-mp4", "video/mov-to-mp4", "video/webm-to-mp4"],
	},
});
