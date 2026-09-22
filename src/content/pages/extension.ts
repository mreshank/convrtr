import { CHROME_EXTENSION_URL } from "@/lib/site";
import type { SectionedPageContent } from "./types";

export const extensionContent: SectionedPageContent = {
	title: "Chrome Extension",
	updated: "22 September 2026",
	sections: [
		{
			eyebrow: "SIDE PANEL WORKFLOW",
			lead: "Dock convrtr alongside any active tab.",
			cont: "Drag and drop files without switching windows.",
			paragraphs: [
				`The convrtr Chrome Extension integrates into Chrome's native Side Panel
				dock. Open the panel alongside your active work, drop files directly into
				the converter, and monitor real-time WebAssembly progress while reading or
				editing documents in your main browser viewport.`,
				`[Install convrtr from the Chrome Web Store](${CHROME_EXTENSION_URL}) to
				enable native Side Panel conversions.`,
			],
		},
		{
			eyebrow: "CONTEXT MENU INTEGRATION",
			lead: "Right-click web media to convert instantly.",
			cont: "Extract and convert images, audio, and vector graphics.",
			paragraphs: [
				`Right-click any image, video, audio element, or linked file on any
				webpage and select 'Convert with convrtr' to stage it immediately into
				the local converter pipeline. Eliminate manual saving, renaming, and
				re-uploading workflows.`,
			],
		},
		{
			eyebrow: "VISIBLE VIEWPORT CAPTURE",
			lead: "Capture visible page regions and convert on the fly.",
			cont: "Command+Shift+S triggers instant screenshot conversion.",
			paragraphs: [
				`Press Command+Shift+S (Ctrl+Shift+S on Windows/Linux) or use the context
				menu to capture the visible portion of your current browser tab. The capture
				is staged directly into our image converter tools, ready for instant export
				to PNG, JPG, WebP, AVIF, or PDF with zero server transmission.`,
			],
		},
		{
			eyebrow: "QUICK POPUP & KEYBOARD WORKFLOW",
			lead: "Global shortcuts and Chrome address bar lookup.",
			cont: "Command+Shift+Comma and the 'cv' omnibox keyword.",
			paragraphs: [
				`Open a lightweight popup converter from any tab by pressing
				Command+Shift+Comma. To quickly convert formats from your keyboard, type 'cv'
				into Chrome's address bar followed by your target format (such as 'cv webp to png')
				to jump directly to the matched converter tool.`,
			],
		},
		{
			eyebrow: "CLIENT-SIDE WEBASSEMBLY",
			lead: "Zero server uploads, zero telemetry, full offline support.",
			cont: "All conversion logic executes inside your browser sandbox.",
			paragraphs: [
				`Like our web application, the extension compiles production codecs (MozJPEG,
				libheif, libwebp, oxipng, FFmpeg) into sandboxed WebAssembly and Web Workers.
				Files never leave your local machine, and no analytics or telemetry events
				are transmitted across the network.`,
			],
		},
		{
			eyebrow: "LEAST-PRIVILEGE PERMISSIONS",
			lead: "Strictly minimal permissions per Chrome Web Store guidelines.",
			cont: "No access to browsing history, passwords, or personal data.",
			paragraphs: [
				`The extension requires only activeTab (for user-initiated viewport captures),
				sidePanel (to display the dock), contextMenus (for right-click staging),
				scripting (to extract media on user request), and storage (ephemeral session
				coordination). We request zero host permissions and omit both tabs and
				downloads permissions.`,
			],
		},
	],
};
