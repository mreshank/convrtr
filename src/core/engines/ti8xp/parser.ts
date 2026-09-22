/**
 * Texas Instruments TI-83 / TI-84 Plus Program (.8xp) Parser & De-tokenizer.
 *
 * .8xp is the standard program file format for TI-83 Plus, TI-84 Plus,
 * and TI-84 Plus CE graphing calculators. Millions of students and developers
 * have .8xp files but cannot view them without TI Connect software or hardware.
 *
 * File Structure:
 * - 0x00 - 0x07 (8 bytes): Signature "**TI83F*"
 * - 0x08 - 0x0A (3 bytes): 0x1A 0x0A 0x00
 * - 0x0B - 0x34 (42 bytes): Descriptive comment
 * - 0x35 - 0x36 (2 bytes): Data section length (16-bit LE)
 * - Data section:
 *   - 0x00 - 0x01: 0x0B 0x00 or 0x0D 0x00
 *   - 0x02 - 0x03: Variable data length (16-bit LE)
 *   - 0x04: Type ID (0x05 = Program, 0x06 = Protected Program)
 *   - 0x05 - 0x0C (8 bytes): Variable Name
 *   - 0x0D: Version
 *   - 0x0E: Flags
 *   - 0x0F - 0x10: Expression length (16-bit LE)
 *   - 0x11 onwards: Tokenized bytecode stream
 * - Last 2 bytes: Checksum (16-bit sum of data section bytes modulo 65536)
 */

export interface Ti8xpProgram {
	comment: string;
	name: string;
	isProtected: boolean;
	code: string;
	checksumValid: boolean;
}

const SINGLE_BYTE_TOKENS: Record<number, string> = {
	4: "⁻¹",
	5: "²",
	6: "^",
	7: "³",
	16: "0",
	17: "1",
	18: "2",
	19: "3",
	20: "4",
	21: "5",
	22: "6",
	23: "7",
	24: "8",
	25: "9",
	26: ".",
	27: "ᴇ",
	40: "(",
	41: ")",
	42: '"',
	43: ",",
	58: "[",
	59: "]",
	60: "→",
	61: " ",
	62: ":",
	63: "\n",
	106: "+",
	107: "-",
	108: "*",
	109: "/",
	172: "π",
	176: "ClrHome",
	177: "ClrDraw",
	188: "√( ",
	189: "³√( ",
	190: "ln( ",
	191: "e^( ",
	192: "log( ",
	193: "10^( ",
	194: "sin( ",
	195: "sin⁻¹( ",
	196: "cos( ",
	197: "cos⁻¹( ",
	198: "tan( ",
	199: "tan⁻¹( ",
	206: "Prompt ",
	208: "Disp ",
	209: "Input ",
	210: "Then",
	211: "Else",
	212: "While ",
	213: "Repeat ",
	214: "For( ",
	215: "Return",
	216: "End",
	217: "Lbl ",
	218: "Goto ",
	219: "Pause ",
	220: "If ",
	221: "IS>( ",
	222: "Stop",
	223: "DelVar ",
	224: "GraphStyle( ",
	225: "OpenLib( ",
	226: "ExecLib( ",
};

// Fill A-Z into single-byte tokens (0x41 through 0x5A)
for (let c = 65; c <= 90; c++) {
	SINGLE_BYTE_TOKENS[c] = String.fromCharCode(c);
}
// Fill theta
SINGLE_BYTE_TOKENS[91] = "θ";

const BB_PREFIX_TOKENS: Record<number, string> = {
	0: "npv(",
	1: "irr(",
	2: "bal(",
	62: ">",
	63: "<",
	106: "≤",
	107: "≥",
	108: "≠",
	109: "=",
	110: " and ",
	111: " or ",
	112: " xor ",
	113: "not(",
	172: "ClockOff",
	173: "ClockOn",
	179: "archive ",
	180: "unarchive ",
};

export function parse8xp(fileBytes: Uint8Array): Ti8xpProgram {
	if (fileBytes.length < 57) {
		throw new Error("Invalid .8xp file: file is too small.");
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	// 1. Validate signature: "**TI83F*"
	const sig = new TextDecoder("ascii").decode(fileBytes.subarray(0, 8));
	if (sig !== "**TI83F*") {
		throw new Error(
			`Invalid .8xp header: expected "**TI83F*", received "${sig}".`,
		);
	}

	// 2. Read comment (bytes 11-52)
	const commentRaw = new TextDecoder("ascii").decode(
		fileBytes.subarray(11, 53),
	);
	const comment = commentRaw.replace(/\0+$/, "").trim();

	// 3. Read data section length
	const dataLen = view.getUint16(53, true);
	const dataStart = 55;
	const dataEnd = dataStart + dataLen;

	if (fileBytes.length < dataEnd + 2) {
		throw new Error(
			"Corrupt .8xp file: declared data length exceeds file size.",
		);
	}

	// 4. Verify checksum (sum of bytes in data section modulo 65536)
	let sum = 0;
	for (let i = dataStart; i < dataEnd; i++) {
		sum = (sum + view.getUint8(i)) & 0xffff;
	}
	const fileChecksum = view.getUint16(dataEnd, true);
	const checksumValid = sum === fileChecksum;

	// 5. Parse variable header
	const typeId = view.getUint8(dataStart + 4);
	const isProtected = typeId === 0x06;

	// Name: dataStart + 5 to dataStart + 12 (8 bytes)
	const nameRaw = new TextDecoder("ascii").decode(
		fileBytes.subarray(dataStart + 5, dataStart + 13),
	);
	const name = nameRaw.replace(/\0+$/, "").trim() || "PROGRAM";

	// Expression length at dataStart + 15..16
	const exprLen = view.getUint16(dataStart + 15, true);
	const tokenStart = dataStart + 17;
	const tokenEnd = Math.min(tokenStart + exprLen, dataEnd);

	// 6. Detokenize bytecode
	let code = "";
	let i = tokenStart;

	while (i < tokenEnd) {
		const b = view.getUint8(i++);

		if (b === 0xbb && i < tokenEnd) {
			const sub = view.getUint8(i++);
			code +=
				BB_PREFIX_TOKENS[sub] ?? `[BB:${sub.toString(16).padStart(2, "0")}]`;
			continue;
		}

		if (b === 0xef && i < tokenEnd) {
			const sub = view.getUint8(i++);
			code += `[EF:${sub.toString(16).padStart(2, "0")}]`;
			continue;
		}

		if (b === 0x7e && i < tokenEnd) {
			const sub = view.getUint8(i++);
			code += `[7E:${sub.toString(16).padStart(2, "0")}]`;
			continue;
		}

		const tok = SINGLE_BYTE_TOKENS[b];
		if (tok !== undefined) {
			code += tok;
		} else if (b >= 0x20 && b <= 0x7e) {
			code += String.fromCharCode(b);
		} else {
			code += `[${b.toString(16).padStart(2, "0")}]`;
		}
	}

	return {
		comment,
		name,
		isProtected,
		code: cleanTiBasic(code),
		checksumValid,
	};
}

function cleanTiBasic(code: string): string {
	// Format TI-BASIC lines with clean indenting and formatting
	const lines = code.split("\n");
	let indent = 0;
	const formatted: string[] = [];

	for (const raw of lines) {
		const line = raw.trim();
		if (!line) {
			formatted.push("");
			continue;
		}

		// Decrease indent on End/Else
		if (/^(End|Else)\b/i.test(line)) {
			indent = Math.max(0, indent - 1);
		}

		const prefix = "  ".repeat(indent);
		formatted.push(prefix + line);

		// Increase indent after Then/While/For/Repeat
		if (/\bThen$/i.test(line) || /^(While|For|Repeat)\b/i.test(line)) {
			indent++;
		}
	}

	return formatted.join("\n").trim();
}

export function convert8xpToText(
	input: ArrayBuffer,
	asMarkdown = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing .8xp calculator header...");
	const prog = parse8xp(new Uint8Array(input));

	onProgress?.(0.7, "Detokenizing TI-BASIC program...");
	let output = "";

	if (asMarkdown) {
		output = `# ${prog.name}\n\n`;
		if (prog.comment) {
			output += `> ${prog.comment}\n\n`;
		}
		output += `- **Type:** ${prog.isProtected ? "Protected Program" : "Standard TI-BASIC Program"}\n`;
		output += `- **Checksum:** ${prog.checksumValid ? "Valid" : "Warning: Mismatch"}\n\n`;
		output += `\`\`\`basic\n${prog.code}\n\`\`\`\n`;
	} else {
		output = `// PROGRAM: ${prog.name}\n`;
		if (prog.comment) output += `// ${prog.comment}\n`;
		output += `// Type: ${prog.isProtected ? "Protected" : "Standard"}\n\n`;
		output += `${prog.code}\n`;
	}

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(output).buffer as ArrayBuffer;
}
