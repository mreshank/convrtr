#!/usr/bin/env node

/**
 * convrtr — CLI Interface
 *
 * Dieter Rams-inspired brutalist technical command line instrument.
 * Zero emojis, uppercase monospace status blocks, minimalist geometric indicators.
 */

import { existsSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import {
	canConvert,
	convert,
	findConversionRoute,
	findToolForConversion,
	getAvailableConversions,
	supportedFormats,
	TOOLS,
} from "./index";

const VERSION = "0.1.0";

function printBanner() {
	console.log("CONVRTR // CLI FILE CONVERSION INSTRUMENT");
	console.log(`VERSION: ${VERSION}`);
	console.log("PRIVACY: 100% LOCAL // ZERO DATA TRANSMISSION");
	console.log("--------------------------------------------------");
}

function printHelp() {
	printBanner();
	console.log("USAGE:");
	console.log("  convrtr <input-file> --to <target-format> [options]");
	console.log("  convrtr formats");
	console.log("  convrtr list [category]");
	console.log("  convrtr check <from-format> <to-format>");
	console.log("  convrtr targets <format>");
	console.log("");
	console.log("OPTIONS:");
	console.log(
		"  --to, -t <ext>       Target output format (e.g. webp, mp3, pdf)",
	);
	console.log("  --output, -o <path>  Destination file path");
	console.log("  --help, -h           Show command reference");
	console.log("  --version, -v        Display package version");
	console.log("");
	console.log("EXAMPLES:");
	console.log("  convrtr photo.heic --to jpg");
	console.log("  convrtr speech.wav --to mp3 --output ./dist/speech.mp3");
	console.log("  convrtr check flac mp3");
	console.log("  convrtr formats");
}

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	if (args.includes("--version") || args.includes("-v")) {
		console.log(VERSION);
		process.exit(0);
	}

	const command = args[0];

	if (command === "formats") {
		const formats = supportedFormats();
		console.log(`SUPPORTED FORMATS [${formats.length} TOTAL]:`);
		const columns = 8;
		for (let i = 0; i < formats.length; i += columns) {
			const row = formats
				.slice(i, i + columns)
				.map((f) => f.padEnd(8))
				.join(" ");
			console.log(`  ${row}`);
		}
		process.exit(0);
	}

	if (command === "check") {
		const from = args[1]?.toLowerCase().replace(/^\./, "");
		const to = args[2]?.toLowerCase().replace(/^\./, "");
		if (!from || !to) {
			console.error("ERROR: Missing arguments. Use: convrtr check <from> <to>");
			process.exit(1);
		}
		const possible = canConvert(from, to);
		if (possible) {
			const direct = findToolForConversion(from, to);
			if (direct) {
				console.log(
					`STATUS: DIRECT CONVERSION AVAILABLE [${from.toUpperCase()} ➔ ${to.toUpperCase()}]`,
				);
				console.log(`TOOL:   ${direct.id}`);
			} else {
				const route = findConversionRoute(from, to);
				console.log(
					`STATUS: MULTI-HOP CONVERSION AVAILABLE [${from.toUpperCase()} ➔ ${to.toUpperCase()}]`,
				);
				if (route) {
					console.log(`ROUTE:  ${route.route.map((t) => t.id).join(" ➔ ")}`);
				}
			}
		} else {
			console.log(
				`STATUS: UNSUPPORTED [NO ROUTE FROM ${from.toUpperCase()} TO ${to.toUpperCase()}]`,
			);
		}
		process.exit(possible ? 0 : 1);
	}

	if (command === "targets") {
		const format = args[1]?.toLowerCase().replace(/^\./, "");
		if (!format) {
			console.error(
				"ERROR: Missing format argument. Use: convrtr targets <format>",
			);
			process.exit(1);
		}
		const targets = getAvailableConversions(format);
		console.log(
			`TARGETS FOR .${format.toUpperCase()} [${targets.length} AVAILABLE]:`,
		);
		console.log(`  ${targets.join(", ")}`);
		process.exit(0);
	}

	if (command === "list") {
		const categoryFilter = args[1]?.toLowerCase();
		let tools = TOOLS;
		if (categoryFilter) {
			tools = tools.filter((t) => t.category === categoryFilter);
		}
		console.log(`REGISTERED TOOLS [${tools.length} MATCHING]:`);
		for (const t of tools) {
			const fromExts = t.accept.ext.join("/");
			console.log(
				`  ${t.id.padEnd(35)} [${fromExts.toUpperCase()} ➔ ${t.output.ext.toUpperCase()}]`,
			);
		}
		process.exit(0);
	}

	// Default: conversion command
	const inputFile = command;
	if (!inputFile || !existsSync(inputFile)) {
		console.error(
			`ERROR: Input file not found: ${inputFile || "(unspecified)"}`,
		);
		process.exit(1);
	}

	let targetFormat = "";
	let outputPath = "";

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--to" || arg === "-t") {
			targetFormat = args[++i] || "";
		} else if (arg === "--output" || arg === "-o") {
			outputPath = args[++i] || "";
		}
	}

	if (!targetFormat) {
		console.error("ERROR: Target format not specified. Provide --to <ext>");
		process.exit(1);
	}

	targetFormat = targetFormat.toLowerCase().replace(/^\./, "");
	const inputStat = statSync(inputFile);
	const inputSizeKb = (inputStat.size / 1024).toFixed(1);
	const inExt = extname(inputFile).replace(/^\./, "").toLowerCase();

	if (!outputPath) {
		const base = basename(inputFile, extname(inputFile));
		outputPath = resolve(process.cwd(), `${base}.${targetFormat}`);
	}

	printBanner();
	console.log(
		`INPUT:   ${inputFile} [${inExt.toUpperCase()}, ${inputSizeKb} KB]`,
	);
	console.log(`TARGET:  ${targetFormat.toUpperCase()}`);
	console.log(`OUTPUT:  ${outputPath}`);
	console.log("--------------------------------------------------");

	const startTime = Date.now();

	try {
		const result = await convert.toFile(inputFile, outputPath, {
			to: targetFormat,
			onProgress: (ratio, phase) => {
				const pct = Math.round(ratio * 100);
				process.stdout.write(`\rPROGRESS: [${pct}%] ${phase}`.padEnd(60));
			},
			onNotice: (msg) => {
				console.log(`\nNOTICE: ${msg}`);
			},
		});

		const durationMs = Date.now() - startTime;
		const outSizeKb = (result.data.byteLength / 1024).toFixed(1);

		process.stdout.write(`\r${"".padEnd(60)}\r`);
		console.log("STATUS:  CONVERSION COMPLETE ➔");
		console.log(`SAVED:   ${outputPath} [${outSizeKb} KB]`);
		console.log(`TOOL:    ${result.toolId}`);
		console.log(`TIME:    ${durationMs}ms`);
		console.log("--------------------------------------------------");
	} catch (err: unknown) {
		process.stdout.write(`\r${"".padEnd(60)}\r`);
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`ERROR:   CONVERSION FAILED ➔ ${msg}`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("UNCAUGHT EXCEPTION:", err);
	process.exit(1);
});
