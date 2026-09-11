import type { Tool } from "../../types";

export const aniToPng: Tool = {
	id: "image/ani-to-png",
	slug: "ani-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/x-navi-animation",
			"image/x-ani",
			"application/octet-stream",
		],
		ext: ["ani"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:ani-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless Frames",
				explanation:
					"Extracts all individual animation frames with transparent alpha channels and exact jiffy timing metadata.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "ANI to PNG — Extract Windows Animated Cursor Frames | convrtr",
		h1: "Extract Animation Frames from Windows Animated Cursors (.ani)",
		intent:
			"Unpack Windows Animated Cursor (.ani) files into individual transparent PNG frames, an exact frame timing JSON manifest (jiffies & milliseconds), and a CSS snippet to use custom retro mouse cursors on the web, Mac, or Linux without any server uploads.",
		faq: [
			{
				q: "What does this tool produce?",
				a: "It extracts every animation frame from the .ani RIFF ACON container into transparent PNG images, and creates an ANIMATION_METADATA.json file with exact frame delays, display rates (jiffies), and cursor hotspot coordinates bundled into a ZIP archive.",
			},
			{
				q: "Can I use these cursor frames on macOS or Linux?",
				a: "Yes! Neither macOS nor modern Linux desktop environments natively support the Windows .ani format. By extracting the frames as standard PNGs, you can use them with cursor tools like Mousecape on Mac, compile them into Linux Xcursor themes, or animate them in Discord and web apps.",
			},
			{
				q: "How do I use this cursor on a website?",
				a: "The extracted ZIP archive includes an ANI_MANIFEST.md with ready-to-use CSS cursor snippets using your frame images and precise hotspot coordinates.",
			},
			{
				q: "Are my files uploaded to any external server?",
				a: "Never. The entire RIFF parsing, DIB decoding, AND mask transparency resolution, and ZIP creation runs 100% locally in your web browser with zero server uploads.",
			},
		],
		related: ["image/icns-to-png", "image/dds-to-png"],
	},
};
