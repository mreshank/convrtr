import type { Tool } from "../../types";

export const psuToZip: Tool = {
	id: "document/psu-to-zip",
	slug: "psu-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-ps2-save"],
		ext: ["psu"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:psu-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "zip",
		presets: [
			{
				id: "zip",
				label: "Save Directory ZIP (.zip)",
				explanation:
					"Carves and extracts all internal save files, 3D icon meshes, and system configuration files into a standard folder hierarchy in a ZIP archive.",
				params: { json: false },
			},
			{
				id: "json",
				label: "Save Manifest (.json)",
				explanation:
					"Extracts save folder identifier, internal filenames, byte sizes, and creation/modification timestamps as structured JSON.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "PSU to ZIP — Extract PS2 Memory Card Saves | convrtr",
		h1: "Extract PlayStation 2 Memory Card (.psu) Saves",
		intent:
			"Unpack PlayStation 2 save containers (.psu) created by uLaunchELF, wLaunchELF, or EMS Memory Adapters into standard save directories and raw files directly in your browser.",
		faq: [
			{
				q: "What is a PlayStation 2 .psu file?",
				a: "A .psu file is an EMS / uLaunchELF container that packages an entire PlayStation 2 memory card save folder (such as BASLUS-21441GTA containing icon.sys, icon.icn, and save.bin) while preserving PS2 filesystem permissions and timestamps.",
			},
			{
				q: "Can this unpack saves for PCSX2 and AetherSX2?",
				a: "Yes. The generated ZIP archive contains the exact folder structure required by PCSX2's Folder Memory Card format and AetherSX2 save managers.",
			},
			{
				q: "Does this require installing legacy Windows tools?",
				a: "No. Unlike legacy 32-bit Windows software like PS2 Save Builder, convrtr runs 100% locally in your web browser across Windows, macOS, Linux, iOS, and Android.",
			},
		],
		related: [
			"document/mcr-to-zip",
			"document/gci-to-json",
			"document/bup-to-zip",
			"image/vms-to-png",
		],
	},
};
