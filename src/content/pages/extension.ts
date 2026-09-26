import { CHROME_EXTENSION_URL } from "@/lib/site";
import type { SectionedPageContent } from "./types";

export const extensionContent: SectionedPageContent = {
	title: "Chrome Extension",
	updated: "26 September 2026",
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
			cont: "Stage and convert images, audio, video, links, and code.",
			paragraphs: [
				`Right-click any image, video, audio element, link, or text snippet on any
				webpage and select 'Convert with convrtr' to stage it immediately into
				the local converter pipeline. Eliminate manual saving, renaming, and
				re-uploading workflows.`,
			],
		},
		{
			eyebrow: "ADAPTIVE 3-WAY WORKSPACE",
			lead: "Docked Side Panel, Quick Popup, or Full Tab Studio.",
			cont: "Command+Shift+O triggers the full technical studio workspace.",
			paragraphs: [
				`Work your way with three coordinated surfaces: the native Side Panel beside
				your browsing (Command+Shift+C), a compact floating Quick Popup (Command+Shift+Comma),
				or an expanded Full Tab Studio (Command+Shift+O). Switching views automatically preserves
				your active conversion queue and parameters across surfaces via local storage.`,
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
				`The extension requires only activeTab (for user-initiated context menu staging),
				sidePanel (to display the dock), contextMenus (for right-click staging),
				scripting (to stage media or text snippets on user request), and storage (ephemeral session
				coordination). We request zero host permissions and omit both tabs and
				downloads permissions.`,
			],
		},
	],
};
