import type { Tool } from "../../types";

export const matToZip: Tool = {
	id: "document/mat-to-zip",
	slug: "mat-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-matlab-data", "application/octet-stream"],
		ext: ["mat"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:mat-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Per-Variable CSVs",
				explanation:
					"Reads every 2D real numeric, char and logical variable into its own CSV (column-major transposed correctly) plus a _README of anything refused. Values transfer exactly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "MAT to CSV — MATLAB Workspace Without MATLAB | convrtr",
		h1: "Convert MATLAB (.mat) Workspace to CSV",
		intent:
			"Free variables out of a MATLAB v5 (.mat) workspace into per-variable CSVs — no licence, no install. Doubles, integers (int64 exact), chars and logicals convert; sparse, complex and structs land in an honest _README instead of vanishing. Entirely in your browser.",
		faq: [
			{
				q: "I graduated / changed jobs and lost MATLAB. Is my thesis data gone?",
				a: "No — v5 .mat files are an open layout this tool reads directly: every 2D numeric, text and logical variable becomes a CSV with correct row/column orientation (MATLAB's column-major order is transposed properly).",
			},
			{
				q: "What doesn't convert?",
				a: "Sparse, complex, structs, cells, objects, N-D arrays and v7.3 (HDF5) files — each refused by name in a _README.txt packed alongside the CSVs, so you know exactly what's missing instead of guessing.",
			},
			{
				q: "Are int64 values exact?",
				a: "Yes — 64-bit integers convert via BigInt strings, never float-rounded. Doubles transfer bit-exact through the CSV text.",
			},
			{
				q: "Is my research data uploaded anywhere?",
				a: "No. Parsing and zipping run entirely inside your browser.",
			},
		],
		related: [
			"document/sqlite-to-zip",
			"document/parquet-to-csv",
			"document/arrow-to-csv",
		],
	},
};
