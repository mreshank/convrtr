/**
 * IEEE 1364 Value Change Dump (VCD) Parser & Tabular Converter
 *
 * Parses hardware simulation waveform dumps from EDA suites (Verilator, Icarus
 * Verilog, ModelSim, QuestaSim) into structured tabular CSV spreadsheets and JSON.
 *
 * Compliant with IEEE 1364-2001 / IEEE 1364-2005 specifications.
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

export interface VcdSignal {
	id: string; // Identifier code (e.g. "!", "#", "a")
	name: string; // Full hierarchical name (e.g. "top.clk", "cpu.alu.result[7:0]")
	type: string; // wire, reg, integer, parameter, etc.
	size: number; // Bit width
	scope: string; // Enclosing module scope
}

export interface VcdSnapshot {
	time: number;
	values: Record<string, string>; // signal.name -> value
}

export interface VcdParseResult {
	date: string;
	version: string;
	timescale: string;
	signals: VcdSignal[];
	snapshots: VcdSnapshot[];
}

export function parseVcd(text: string): VcdParseResult {
	const lines = text.split(/\r?\n/);
	let date = "";
	let version = "";
	let timescale = "";
	const signals: VcdSignal[] = [];
	const idToSignal = new Map<string, VcdSignal>();
	const scopeStack: string[] = [];

	let inDefinitions = true;
	let i = 0;

	// 1. Parse header definitions
	while (i < lines.length && inDefinitions) {
		const line = lines[i]?.trim() ?? "";
		i++;
		if (!line) continue;

		if (line.startsWith("$date")) {
			const endIdx = line.indexOf("$end");
			if (endIdx !== -1) {
				date = line.slice(5, endIdx).trim();
			} else {
				const parts: string[] = [];
				while (i < lines.length && !lines[i]?.includes("$end")) {
					const cur = lines[i]?.trim();
					if (cur) parts.push(cur);
					i++;
				}
				if (i < lines.length) i++; // skip $end line
				date = parts.join(" ");
			}
		} else if (line.startsWith("$version")) {
			const endIdx = line.indexOf("$end");
			if (endIdx !== -1) {
				version = line.slice(8, endIdx).trim();
			} else {
				const parts: string[] = [];
				while (i < lines.length && !lines[i]?.includes("$end")) {
					const cur = lines[i]?.trim();
					if (cur) parts.push(cur);
					i++;
				}
				if (i < lines.length) i++;
				version = parts.join(" ");
			}
		} else if (line.startsWith("$timescale")) {
			const endIdx = line.indexOf("$end");
			if (endIdx !== -1) {
				timescale = line.slice(10, endIdx).trim();
			} else {
				if (i < lines.length && !lines[i]?.includes("$end")) {
					timescale = lines[i]?.trim() ?? "";
					i++;
				}
				while (i < lines.length && !lines[i]?.includes("$end")) i++;
				if (i < lines.length) i++;
			}
		} else if (line.startsWith("$scope")) {
			// Format: $scope <type> <name> $end
			const parts = line.split(/\s+/);
			const scName = parts[2];
			if (scName) {
				scopeStack.push(scName);
			}
		} else if (line.startsWith("$upscope")) {
			scopeStack.pop();
		} else if (line.startsWith("$var")) {
			// Format: $var <var_type> <size> <id_code> <reference_name> [bit_range] $end
			const parts = line.split(/\s+/);
			const type = parts[1];
			const sizeStr = parts[2];
			const id = parts[3];
			if (type && sizeStr && id && parts.length >= 5) {
				const size = Number.parseInt(sizeStr, 10) || 1;
				const rawName = parts.slice(4, parts.length - 1).join(" ");
				const currentScope = scopeStack.join(".");
				const fullName = currentScope ? `${currentScope}.${rawName}` : rawName;

				const sig: VcdSignal = {
					id,
					name: fullName,
					type,
					size,
					scope: currentScope,
				};
				signals.push(sig);
				idToSignal.set(id, sig);
			}
		} else if (line.startsWith("$enddefinitions")) {
			inDefinitions = false;
			break;
		}
	}

	// 2. Parse simulation waveform records
	const snapshots: VcdSnapshot[] = [];
	let currentTime = 0;
	const currentValues: Record<string, string> = {};

	for (const sig of signals) {
		currentValues[sig.name] = "x";
	}

	while (i < lines.length) {
		const rawLine = lines[i]?.trim() ?? "";
		i++;
		if (!rawLine) continue;

		if (rawLine.startsWith("#")) {
			// Timestamp line: time marker
			const t = Number.parseInt(rawLine.slice(1), 10);
			if (!Number.isNaN(t)) {
				const lastSnap = snapshots[snapshots.length - 1];
				if (lastSnap && lastSnap.time === currentTime) {
					Object.assign(lastSnap.values, currentValues);
				}
				currentTime = t;
			}
		} else if (
			rawLine.startsWith("$dumpvars") ||
			rawLine.startsWith("$dumpall")
		) {
		} else if (rawLine === "$end") {
		} else {
			// Value changes
			const tokens = rawLine.split(/\s+/);
			let tIdx = 0;
			while (tIdx < tokens.length) {
				const token = tokens[tIdx];
				tIdx++;
				if (!token || token === "$end") continue;

				if (token.startsWith("b") || token.startsWith("B")) {
					// Vector change: b0101 ID
					const val = token.slice(1);
					const id = tokens[tIdx];
					tIdx++;
					if (id) {
						const sig = idToSignal.get(id);
						if (sig) {
							currentValues[sig.name] = val;
						}
					}
				} else if (token.startsWith("r") || token.startsWith("R")) {
					// Real float change: r1.234 ID
					const val = token.slice(1);
					const id = tokens[tIdx];
					tIdx++;
					if (id) {
						const sig = idToSignal.get(id);
						if (sig) {
							currentValues[sig.name] = val;
						}
					}
				} else {
					// Scalar change: 0ID, 1ID, xID, zID
					const val = token[0] ?? "x";
					const id = token.slice(1);
					const sig = idToSignal.get(id);
					if (sig) {
						currentValues[sig.name] = val;
					}
				}
			}

			// Store snapshot
			const lastSnap = snapshots[snapshots.length - 1];
			if (!lastSnap || lastSnap.time !== currentTime) {
				snapshots.push({
					time: currentTime,
					values: { ...currentValues },
				});
			} else {
				Object.assign(lastSnap.values, currentValues);
			}
		}
	}

	return {
		date,
		version,
		timescale,
		signals,
		snapshots,
	};
}

export function formatVcdCsv(parsed: VcdParseResult): string {
	const headers = ["time", ...parsed.signals.map((s) => s.name)];
	const rows: string[] = [headers.map(escapeCsv).join(",")];

	for (const snap of parsed.snapshots) {
		const row = [
			String(snap.time),
			...parsed.signals.map((s) => escapeCsv(snap.values[s.name] ?? "x")),
		];
		rows.push(row.join(","));
	}

	return rows.join("\r\n");
}

export function formatVcdJson(parsed: VcdParseResult): string {
	return JSON.stringify(
		{
			date: parsed.date,
			version: parsed.version,
			timescale: parsed.timescale,
			signals: parsed.signals.map((s) => ({
				name: s.name,
				type: s.type,
				size: s.size,
				scope: s.scope,
			})),
			snapshotsCount: parsed.snapshots.length,
			snapshots: parsed.snapshots,
		},
		null,
		2,
	);
}

function escapeCsv(val: string): string {
	if (
		val.includes(",") ||
		val.includes('"') ||
		val.includes("\n") ||
		val.includes("\r")
	) {
		return `"${val.replace(/"/g, '""')}"`;
	}
	return val;
}

export function convertVcd(text: string, options?: { json?: boolean }): string {
	const parsed = parseVcd(text);
	if (options?.json) {
		return formatVcdJson(parsed);
	}
	return formatVcdCsv(parsed);
}
