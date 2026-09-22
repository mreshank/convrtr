import type { Tool } from "../../types";

export const cifToJson: Tool = {
	id: "document/cif-to-json",
	slug: "cif-to-json",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "chemical/x-cif", "application/octet-stream"],
		ext: ["cif", "mmcif"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:cif-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "csv",
		presets: [
			{
				id: "csv",
				label: "Atomic Coordinates CSV (.csv)",
				explanation:
					"Converts the _atom_site table into an RFC 4180 CSV spreadsheet with atomic Cartesian coordinates (X, Y, Z), residue codes, occupancy, and B-factors.",
				params: { json: false, fasta: false },
			},
			{
				id: "fasta",
				label: "Chain Sequences FASTA (.fasta)",
				explanation:
					"Extracts primary amino acid and nucleic acid sequences per macromolecular polymer chain in standard FASTA format.",
				params: { json: false, fasta: true },
			},
			{
				id: "json",
				label: "Crystallographic Data (.json)",
				explanation:
					"Extracts unit-cell parameters (dimensions and angles), crystal title, chain sequences, and atomic coordinate records as structured JSON.",
				params: { json: true, fasta: false },
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"CIF to CSV — Convert Crystallographic mmCIF to CSV & FASTA | convrtr",
		h1: "Convert mmCIF Macromolecular Data to CSV & FASTA",
		intent:
			"Convert Macromolecular Crystallographic Information Framework (.cif/.mmcif) datasets from RCSB PDB into clean atomic coordinate CSV spreadsheets, FASTA sequences, and JSON without uploading confidential research data.",
		faq: [
			{
				q: "What is an mmCIF (.cif) file?",
				a: "mmCIF (Macromolecular Crystallographic Information Framework) is the official data standard adopted by the Worldwide Protein Data Bank (wwPDB) to represent macromolecular 3D structures, replacing the legacy 80-column PDB format for large complex structures.",
			},
			{
				q: "Can this extract sequences to FASTA format?",
				a: "Yes. Selecting the FASTA preset automatically resolves 3-letter amino acid codes into 1-letter standard sequences for every polymer chain in the structure.",
			},
			{
				q: "Are large AlphaFold and cryo-EM structures supported?",
				a: "Yes. convrtr processes mmCIF files completely client-side in your browser using fast streaming tokenization, ensuring zero upload latency and complete privacy for proprietary drug targets.",
			},
		],
		related: [
			"document/vcd-to-csv",
			"document/asc-to-csv",
			"document/fit-to-csv",
			"document/adif-to-csv",
		],
	},
};
