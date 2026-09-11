import type { Tool } from "../../types";

export const chmToZip: Tool = {
	id: "document/chm-to-zip",
	slug: "chm-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/vnd.ms-htmlhelp",
			"application/x-chm",
			"application/chm",
			"application/octet-stream",
		],
		ext: ["chm"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:chm-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full HTML Documentation Package",
				explanation:
					"Decompiles Microsoft Compiled HTML Help (.chm) files into standard offline HTML documentation, extracting embedded articles, stylesheets, images, and tables of contents into an organized ZIP archive.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"CHM to ZIP — Decompile Microsoft Compiled HTML Help (.chm) Online | convrtr",
		h1: "Decompile Microsoft CHM to ZIP",
		intent:
			"Decompile and extract Microsoft Compiled HTML Help (.chm) manuals, ebooks, and developer documentation into standard HTML and images directly in your browser without Windows or third-party desktop tools.",
		faq: [
			{
				q: "What is a .chm file?",
				a: "A .chm (Compiled HTML Help) file is a proprietary archive format developed by Microsoft in 1997 based on the Info-Tech Storage Format (ITSF). It was the standard format for Windows software documentation, ebooks, and software SDK references.",
			},
			{
				q: "Why can't I open .chm files on Mac or Linux?",
				a: "Compiled HTML Help relies on Windows-specific ActiveX controls and the Microsoft HTML Help Viewer (hh.exe). Modern macOS, Linux, iOS, and Android systems have no built-in viewer for CHM archives, and Windows 10/11 frequently blocks CHM files downloaded from the internet with security errors.",
			},
			{
				q: "What does this decompiler extract?",
				a: "convrtr extracts all embedded HTML articles, images (.gif, .jpg, .png), CSS stylesheets, and table of contents files (.hhc/.hhk), bundling them into a standard ZIP archive that can be opened in any web browser.",
			},
			{
				q: "Do I need 7-Zip, SumatraPDF, or command-line tools installed?",
				a: "No! All parsing of ITSF headers, directory chunks, and asset extraction occurs 100% locally in your web browser using pure TypeScript and WebAssembly.",
			},
			{
				q: "Are my CHM documents uploaded to any server?",
				a: "Never. All decompression and ZIP bundling occur completely inside your browser's local memory. No files or private technical documents ever leave your computer.",
			},
		],
		related: [
			"document/mhtml-to-html",
			"document/webarchive-to-html",
			"document/xmind-to-markdown",
		],
	},
};
