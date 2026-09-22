/**
 * Amateur Radio Log ADIF (.adi / .adif) Parser & CSV/JSON Converter.
 *
 * ADIF (Amateur Data Interchange Format) is the universal logging specification
 * used by amateur radio (ham radio) operators worldwide to record contacts (QSOs).
 *
 * File Structure:
 * - Header (optional): Arbitrary introductory text and tags, terminated by `<EOH>` or `<eoh>`.
 * - Records: Sequence of contact records, each containing tags `<FIELD_NAME:LENGTH>`
 *   followed by LENGTH characters, terminated by `<EOR>` or `<eor>`.
 *
 * Example:
 * `<CALL:4>W1AW <QSO_DATE:8>20260921 <TIME_ON:6>123000 <BAND:3>20M <MODE:2>CW <RST_SENT:3>599 <EOR>`
 */

export interface AdifRecord {
	[field: string]: string;
}

export interface AdifFile {
	headerInfo?: string;
	records: AdifRecord[];
	fields: string[];
}

export function parseAdif(text: string): AdifFile {
	let content = text;
	let headerInfo: string | undefined;

	// Split header from data at <EOH> / <eoh>
	const eohMatch = /<eoh>/i.exec(content);
	if (eohMatch) {
		const eohIndex = eohMatch.index;
		headerInfo = content.substring(0, eohIndex).trim();
		content = content.substring(eohIndex + eohMatch[0].length);
	}

	// Split records by <EOR> / <eor>
	const rawRecords = content.split(/<eor>/i);
	const records: AdifRecord[] = [];
	const fieldSet = new Set<string>();

	for (const raw of rawRecords) {
		const trimmed = raw.trim();
		if (!trimmed) continue;

		const record: AdifRecord = {};
		// Match tag pattern: <FIELD:LEN> or <FIELD:LEN:TYPE>
		const tagRegex = /<([a-zA-Z0-9_]+):(\d+)(?::[a-zA-Z0-9_]+)?>/g;
		let match: RegExpExecArray | null;

		while (true) {
			match = tagRegex.exec(trimmed);
			if (!match) break;

			const fieldName = (match[1] ?? "").toUpperCase();
			const fieldLen = Number.parseInt(match[2] ?? "0", 10);
			const valStart = match.index + match[0].length;
			const valEnd = valStart + fieldLen;
			const value = trimmed.substring(valStart, valEnd);

			record[fieldName] = value;
			fieldSet.add(fieldName);

			// Advance regex index past the field value
			tagRegex.lastIndex = valEnd;
		}

		if (Object.keys(record).length > 0) {
			records.push(record);
		}
	}

	// Order fields logically: priority columns first, followed by others
	const priorityOrder = [
		"QSO_DATE",
		"TIME_ON",
		"TIME_OFF",
		"CALL",
		"BAND",
		"MODE",
		"SUBMODE",
		"FREQ",
		"FREQ_RX",
		"RST_SENT",
		"RST_RCVD",
		"NAME",
		"QTH",
		"GRIDSQUARE",
		"STATE",
		"COUNTRY",
		"DXCC",
		"TX_PWR",
		"OPERATOR",
		"COMMENT",
	];

	const orderedFields: string[] = [];
	for (const p of priorityOrder) {
		if (fieldSet.has(p)) {
			orderedFields.push(p);
			fieldSet.delete(p);
		}
	}
	const remaining = Array.from(fieldSet).sort();
	orderedFields.push(...remaining);

	return {
		headerInfo,
		records,
		fields: orderedFields,
	};
}

export function formatAdifCsv(adif: AdifFile): string {
	if (adif.records.length === 0) {
		return `${adif.fields.join(",")}\n`;
	}

	const lines: string[] = [];
	lines.push(adif.fields.join(","));

	for (const rec of adif.records) {
		const row = adif.fields.map((f) => {
			const val = rec[f] ?? "";
			if (val.includes(",") || val.includes('"') || val.includes("\n")) {
				return `"${val.replace(/"/g, '""')}"`;
			}
			return val;
		});
		lines.push(row.join(","));
	}

	return `${lines.join("\n")}\n`;
}

export function convertAdif(
	input: ArrayBuffer,
	asJson = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading ADIF log text...");
	const text = new TextDecoder("utf-8", { fatal: false }).decode(input);

	onProgress?.(0.5, "Parsing ADIF tags and QSO records...");
	const adif = parseAdif(text);

	onProgress?.(0.8, `Exporting ${adif.records.length} records...`);
	let output = "";

	if (asJson) {
		output = JSON.stringify(adif.records, null, 2);
	} else {
		output = formatAdifCsv(adif);
	}

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(output).buffer as ArrayBuffer;
}
