import type { Tool } from "../../types";

export const gbToPng: Tool = {
	id: "image/gb-to-png",
	slug: "gb-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-gameboy-rom"],
		ext: ["gb", "gbc"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:gb-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "png",
		presets: [
			{
				id: "png",
				label: "Nintendo Boot Logo PNG (.png)",
				explanation:
					"Decodes the 48-byte Nintendo scrolling boot logo into a crisp 192x32 retro monochrome PNG image.",
				params: { json: false },
			},
			{
				id: "json",
				label: "Cartridge Architecture Manifest (.json)",
				explanation:
					"Analyzes MBC chip type, ROM and RAM banking, Super Game Boy features, CGB color mode, and validates the header checksum as JSON.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"GB to PNG — Extract Game Boy Boot Logo & Cartridge Architecture | convrtr",
		h1: "Extract Game Boy ROM Boot Logos & Header Architecture",
		intent:
			"Extract the iconic Nintendo boot logo bitmap to PNG and inspect MBC mapper chip architecture, ROM/RAM banks, and header checksums from Game Boy and Game Boy Color ROM files (.gb/.gbc) directly in your browser.",
		faq: [
			{
				q: "How does the Game Boy Nintendo boot logo work?",
				a: "Every licensed Game Boy cartridge contains a 48-byte bitmap at offset 0x0104 to 0x0133. The console's internal boot ROM scrolls this graphic across the screen and validates it byte-for-byte before allowing the game code to execute.",
			},
			{
				q: "What technical cartridge parameters are extracted?",
				a: "convrtr decodes the memory bank controller (MBC1, MBC2, MBC3, MBC5, HuC1, etc.), total ROM capacity, onboard save RAM size, Super Game Boy enhancement flags, Color Game Boy compatibility, and verifies the header checksum algorithm.",
			},
			{
				q: "Are Game Boy Color (.gbc) ROMs supported?",
				a: "Yes. Both classic original Game Boy (DMG) and dual-mode or exclusive Game Boy Color (CGB) ROMs are fully supported.",
			},
		],
		related: [
			"image/nds-to-png",
			"image/vms-to-png",
			"document/gci-to-json",
			"document/mcr-to-zip",
		],
	},
};
