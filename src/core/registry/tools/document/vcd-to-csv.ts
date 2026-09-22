import type { Tool } from "../../types";

export const vcdToCsv: Tool = {
	id: "document/vcd-to-csv",
	slug: "vcd-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "application/octet-stream"],
		ext: ["vcd"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:vcd-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "csv",
		presets: [
			{
				id: "csv",
				label: "CSV Spreadsheet (.csv)",
				explanation:
					"Converts simulation timestamps and digital wire/register logic states into an RFC 4180 CSV spreadsheet.",
				params: { json: false },
			},
			{
				id: "json",
				label: "Waveform Data (.json)",
				explanation:
					"Extracts hierarchical module scopes, signal bit-widths, timescales, and timestamped transitions as structured JSON.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "VCD to CSV — Convert Value Change Dump Waveform to CSV | convrtr",
		h1: "Convert Value Change Dump (VCD) Waveforms to CSV",
		intent:
			"Convert IEEE 1364 Value Change Dump (VCD) digital simulation traces into clean CSV spreadsheets and JSON data entirely in your browser without uploading proprietary circuit designs.",
		faq: [
			{
				q: "What is an IEEE 1364 VCD file?",
				a: "A Value Change Dump (VCD) file is an ASCII format specified by IEEE Standard 1364 for logging signal transitions in electronic design automation (EDA) logic simulations like Verilator, Icarus Verilog, ModelSim, and Vivado.",
			},
			{
				q: "Why convert VCD to CSV?",
				a: "Hardware engineers and students often need to analyze bus behavior, power states, or clock cycles in Python, Pandas, Excel, or MATLAB. Converting VCD to an RFC 4180 CSV spreadsheet turns complex simulation dumps into tabular columns with precise timestamps.",
			},
			{
				q: "Are my circuit simulation files uploaded to a server?",
				a: "No. All parsing and conversion executes 100% locally in your web browser. Proprietary ASIC/FPGA designs and confidential coursework never leave your machine.",
			},
		],
		related: [
			"document/asc-to-csv",
			"document/arrow-to-csv",
			"document/parquet-to-csv",
		],
	},
};
