/**
 * Vector CANoe / CANalyzer ASCII Bus Trace (.asc) Parser & CSV Converter.
 *
 * Vector .asc is the de facto automotive industry standard format for logging
 * Controller Area Network (CAN, CAN-FD) vehicle bus traffic, diagnostic sessions (UDS, OBD-II),
 * and J1939 commercial vehicle telemetry.
 */

export interface CanFrame {
	timestampSec: number;
	channel: number;
	idHex: string;
	idDec: number;
	isExtended: boolean;
	direction: "Rx" | "Tx";
	dlc: number;
	payloadHex: string;
	bytes: number[];
}

export interface AscTrace {
	base: "hex" | "dec";
	timestamps: "absolute" | "relative";
	date: string;
	frames: CanFrame[];
}

export function parseAsc(ascText: string): AscTrace {
	const lines = ascText.split(/\r?\n/);
	let base: "hex" | "dec" = "hex";
	let timestamps: "absolute" | "relative" = "absolute";
	let date = "";

	const frames: CanFrame[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;

		// Metadata headers
		if (line.startsWith("date ")) {
			date = line.substring(5).trim();
			continue;
		}
		if (line.startsWith("base ")) {
			if (/dec/i.test(line)) base = "dec";
			if (/relative/i.test(line)) timestamps = "relative";
			continue;
		}
		if (
			line.startsWith("//") ||
			line.startsWith("internal events") ||
			line.startsWith("no internal events")
		) {
			continue;
		}

		// Check for CAN-FD line:
		// timestamp CANFD channel Rx/Tx ID ...
		if (/\bCANFD\b/i.test(line)) {
			const tokens = line.split(/\s+/);
			const timeVal = Number.parseFloat(tokens[0] ?? "");
			if (Number.isNaN(timeVal)) continue;

			const chan = Number.parseInt(tokens[2] ?? "1", 10);
			const dir = (tokens[3]?.toUpperCase() === "TX" ? "Tx" : "Rx") as
				| "Rx"
				| "Tx";
			const rawId = tokens[4] ?? "0";
			const isExtended = rawId.endsWith("x") || rawId.endsWith("X");
			const cleanId = rawId.replace(/[xX]$/, "");
			const idDec = Number.parseInt(cleanId, base === "hex" ? 16 : 10);

			// Find DLC and bytes
			// tokens after flags: index 7 or 8 usually starts the payload
			const hexBytes: number[] = [];
			for (let i = 7; i < tokens.length; i++) {
				const tok = tokens[i];
				if (!tok || tok.length > 2) continue;
				const b = Number.parseInt(tok, 16);
				if (!Number.isNaN(b)) hexBytes.push(b);
			}

			const payloadHex = hexBytes
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")
				.toUpperCase();

			frames.push({
				timestampSec: timeVal,
				channel: Number.isNaN(chan) ? 1 : chan,
				idHex: cleanId.toUpperCase(),
				idDec: Number.isNaN(idDec) ? 0 : idDec,
				isExtended,
				direction: dir,
				dlc: hexBytes.length,
				payloadHex,
				bytes: hexBytes,
			});
			continue;
		}

		// Standard CAN 2.0 line:
		// 0.001250 1 1A0 Rx d 8 00 12 34 56 78 9A BC DE
		const tokens = line.split(/\s+/);
		if (tokens.length < 5) continue;

		const timeVal = Number.parseFloat(tokens[0] ?? "");
		if (Number.isNaN(timeVal)) continue;

		const chan = Number.parseInt(tokens[1] ?? "1", 10);
		const rawId = tokens[2] ?? "";
		if (!rawId || rawId.toLowerCase() === "errorframe") continue;

		const isExtended = rawId.endsWith("x") || rawId.endsWith("X");
		const cleanId = rawId.replace(/[xX]$/, "");
		const idDec = Number.parseInt(cleanId, base === "hex" ? 16 : 10);
		if (Number.isNaN(idDec)) continue;

		const dir = (tokens[3]?.toUpperCase() === "TX" ? "Tx" : "Rx") as
			| "Rx"
			| "Tx";

		// Look for 'd' or number indicating DLC
		let dlcIdx = 4;
		if (tokens[4]?.toLowerCase() === "d" || tokens[4]?.toLowerCase() === "r") {
			dlcIdx = 5;
		}
		const declaredDlc = Number.parseInt(tokens[dlcIdx] ?? "0", 10);
		const dlc = Number.isNaN(declaredDlc) ? 0 : declaredDlc;

		const hexBytes: number[] = [];
		const startByteIdx = dlcIdx + 1;
		for (let i = startByteIdx; i < tokens.length; i++) {
			const tok = tokens[i];
			if (!tok || tok.length > 2) break;
			const b = Number.parseInt(tok, 16);
			if (!Number.isNaN(b)) {
				hexBytes.push(b);
			}
		}

		const payloadHex = hexBytes
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")
			.toUpperCase();

		frames.push({
			timestampSec: timeVal,
			channel: Number.isNaN(chan) ? 1 : chan,
			idHex: cleanId.toUpperCase(),
			idDec,
			isExtended,
			direction: dir,
			dlc: hexBytes.length || dlc,
			payloadHex,
			bytes: hexBytes,
		});
	}

	return {
		base,
		timestamps,
		date,
		frames,
	};
}

export function formatAscCsv(trace: AscTrace): string {
	const header =
		"timestamp_sec,channel,can_id_hex,can_id_dec,is_extended,direction,dlc,payload_hex,b0,b1,b2,b3,b4,b5,b6,b7";
	const rows: string[] = [header];

	for (const f of trace.frames) {
		const b0 =
			f.bytes[0] !== undefined
				? f.bytes[0].toString(16).padStart(2, "0").toUpperCase()
				: "";
		const b1 =
			f.bytes[1] !== undefined
				? f.bytes[1].toString(16).padStart(2, "0").toUpperCase()
				: "";
		const b2 =
			f.bytes[2] !== undefined
				? f.bytes[2].toString(16).padStart(2, "0").toUpperCase()
				: "";
		const b3 =
			f.bytes[3] !== undefined
				? f.bytes[3].toString(16).padStart(2, "0").toUpperCase()
				: "";
		const b4 =
			f.bytes[4] !== undefined
				? f.bytes[4].toString(16).padStart(2, "0").toUpperCase()
				: "";
		const b5 =
			f.bytes[5] !== undefined
				? f.bytes[5].toString(16).padStart(2, "0").toUpperCase()
				: "";
		const b6 =
			f.bytes[6] !== undefined
				? f.bytes[6].toString(16).padStart(2, "0").toUpperCase()
				: "";
		const b7 =
			f.bytes[7] !== undefined
				? f.bytes[7].toString(16).padStart(2, "0").toUpperCase()
				: "";

		rows.push(
			`${f.timestampSec.toFixed(6)},${f.channel},0x${f.idHex},${f.idDec},${f.isExtended},${f.direction},${f.dlc},${f.payloadHex},${b0},${b1},${b2},${b3},${b4},${b5},${b6},${b7}`,
		);
	}

	return `${rows.join("\n")}\n`;
}

export function convertAscToCsv(
	input: ArrayBuffer,
	asJson = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing Vector ASC bus trace frames...");
	const text = new TextDecoder("latin1").decode(input);
	const trace = parseAsc(text);

	if (trace.frames.length === 0) {
		throw new Error("No valid CAN bus frames found in .asc trace file.");
	}

	if (asJson) {
		onProgress?.(0.7, `Formatting ${trace.frames.length} frames as JSON...`);
		const jsonStr = JSON.stringify(
			{
				date: trace.date,
				base: trace.base,
				frameCount: trace.frames.length,
				frames: trace.frames.map((f) => ({
					timestamp: f.timestampSec,
					channel: f.channel,
					idHex: `0x${f.idHex}`,
					idDec: f.idDec,
					extended: f.isExtended,
					direction: f.direction,
					dlc: f.dlc,
					payload: f.payloadHex,
				})),
			},
			null,
			2,
		);
		onProgress?.(1.0, "Complete");
		return new TextEncoder().encode(jsonStr).buffer as ArrayBuffer;
	}

	onProgress?.(
		0.7,
		`Formatting ${trace.frames.length} frames as CSV spreadsheet...`,
	);
	const csv = formatAscCsv(trace);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(csv).buffer as ArrayBuffer;
}
