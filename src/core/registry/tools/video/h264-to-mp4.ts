import type { Tool } from "../../types";

export const h264ToMp4: Tool = {
	id: "video/h264-to-mp4",
	slug: "h264-to-mp4",
	category: "video",
	kind: "convert",
	accept: {
		mime: ["video/h264", "application/octet-stream"],
		ext: ["264", "h264"],
	},
	output: { ext: "mp4", mime: "video/mp4" },
	engines: ["ffmpeg:h264->mp4"],
	heavyDownloadMb: 31,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Wraps the naked H.264 video NAL units directly into an MP4 container box with standard frame timing tables, without re-encoding.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "H.264 to MP4 — Convert Raw .264 Video Streams to MP4 | convrtr",
		h1: "Convert Raw .264 Stream to MP4",
		intent:
			"Convert raw .264 and .h264 elementary video streams dumped from IP cameras and security recorders into playable MP4 videos. Fix broken seeking and player incompatibility right in your browser with zero uploads.",
		faq: [
			{
				q: "Why can't I seek or scrub through raw .264 video files?",
				a: "A .264 or .h264 file contains raw video frames (NAL units) without a container like MP4. Because there is no container header to index timestamps and keyframes, media players like VLC cannot calculate the total duration or seek smoothly.",
			},
			{
				q: "Does this re-encode the video?",
				a: "No. The raw compressed H.264 frames are multiplexed directly into the MP4 container untouched. The process completes in seconds and produces bit-for-bit identical visual quality.",
			},
			{
				q: "Can I convert security camera hard drive dumps?",
				a: "Yes. Raw stream dumps from DVR hard drives, Raspberry Pi cameras, and IP webcams can be wrapped into standard MP4 files that open on any phone, Mac, or PC.",
			},
		],
		related: ["video/dav-to-mp4", "video/mkv-to-mp4", "video/avi-to-mp4"],
	},
};
