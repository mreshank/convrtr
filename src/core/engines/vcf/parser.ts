/**
 * vCard (.vcf) multi-contact parser and RFC 4180 CSV serializer.
 * Supports vCard 2.1, 3.0 (RFC 2426), and 4.0 (RFC 6350).
 * Decodes unfolded lines, quoted-printable UTF-8 encodings, and complex multi-entry address books.
 */

export interface ParsedContact {
	fullName: string;
	firstName: string;
	lastName: string;
	nickname: string;
	company: string;
	jobTitle: string;
	department: string;
	mobilePhone: string;
	workPhone: string;
	homePhone: string;
	otherPhone: string;
	email1: string;
	email2: string;
	streetAddress: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	birthday: string;
	notes: string;
	website: string;
}

/**
 * Decodes quoted-printable encoded strings (RFC 2045) frequently found in vCard 2.1.
 */
function decodeQuotedPrintable(input: string): string {
	// Remove soft line breaks: "=\r\n" or "=\n"
	const normalized = input.replace(/=(?:\r\n|\r|\n)/g, "");

	// Collect byte sequence
	const bytes: number[] = [];
	let i = 0;
	while (i < normalized.length) {
		if (normalized[i] === "=" && i + 2 < normalized.length) {
			const hex = normalized.slice(i + 1, i + 3);
			if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
				bytes.push(Number.parseInt(hex, 16));
				i += 3;
				continue;
			}
		}
		bytes.push(normalized.charCodeAt(i));
		i++;
	}

	try {
		return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
	} catch {
		return normalized;
	}
}

/**
 * Unfolds folded lines in vCard text according to RFC 2425 section 5.8.1.
 * Any line beginning with space or tab is a continuation of the previous line.
 */
function unfoldVCardLines(rawText: string): string[] {
	const lines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	const unfolded: string[] = [];

	for (const line of lines) {
		if (
			(line.startsWith(" ") || line.startsWith("\t")) &&
			unfolded.length > 0
		) {
			unfolded[unfolded.length - 1] += line.slice(1);
		} else {
			unfolded.push(line);
		}
	}

	return unfolded;
}

/**
 * Parses individual field values taking encoding parameters into account.
 */
function parseField(rawLine: string): {
	key: string;
	params: Record<string, string>;
	value: string;
} {
	const colonIdx = rawLine.indexOf(":");
	if (colonIdx === -1) {
		return { key: rawLine.trim().toUpperCase(), params: {}, value: "" };
	}

	const meta = rawLine.slice(0, colonIdx);
	let value = rawLine.slice(colonIdx + 1);

	const parts = meta.split(";");
	const key = (parts[0] || "").trim().toUpperCase();
	const params: Record<string, string> = {};

	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (!part) continue;
		const eqIdx = part.indexOf("=");
		if (eqIdx !== -1) {
			const paramKey = part.slice(0, eqIdx).trim().toUpperCase();
			const paramVal = part
				.slice(eqIdx + 1)
				.trim()
				.toUpperCase();
			params[paramKey] = paramVal;
		} else {
			// e.g. TEL;WORK:123
			params[part.trim().toUpperCase()] = "TRUE";
		}
	}

	if (
		params.ENCODING === "QUOTED-PRINTABLE" ||
		params["ENCODING=QUOTED-PRINTABLE"]
	) {
		value = decodeQuotedPrintable(value);
	}

	// Unescape vCard 3.0/4.0 escaped characters (\,, \;, \\, \n, \N)
	value = value
		.replace(/\\n/gi, "\n")
		.replace(/\\,/g, ",")
		.replace(/\\;/g, ";")
		.replace(/\\\\/g, "\\");

	return { key, params, value: value.trim() };
}

/**
 * Parses raw vCard text into an array of structured contacts.
 */
export function parseVCard(rawText: string): ParsedContact[] {
	const lines = unfoldVCardLines(rawText);
	const contacts: ParsedContact[] = [];

	let current: ParsedContact | null = null;
	let inVcard = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (trimmed.toUpperCase() === "BEGIN:VCARD") {
			inVcard = true;
			current = {
				fullName: "",
				firstName: "",
				lastName: "",
				nickname: "",
				company: "",
				jobTitle: "",
				department: "",
				mobilePhone: "",
				workPhone: "",
				homePhone: "",
				otherPhone: "",
				email1: "",
				email2: "",
				streetAddress: "",
				city: "",
				state: "",
				postalCode: "",
				country: "",
				birthday: "",
				notes: "",
				website: "",
			};
			continue;
		}

		if (trimmed.toUpperCase() === "END:VCARD") {
			if (current) {
				// Fall back full name if empty
				if (!current.fullName && (current.firstName || current.lastName)) {
					current.fullName = `${current.firstName} ${current.lastName}`.trim();
				}
				contacts.push(current);
			}
			current = null;
			inVcard = false;
			continue;
		}

		if (!inVcard || !current) continue;

		const { key, params, value } = parseField(line);

		switch (key) {
			case "FN":
				current.fullName = value;
				break;

			case "N": {
				// Structure: Family Name;Given Name;Additional Names;Honorific Prefixes;Honorific Suffixes
				const nameParts = value.split(";");
				current.lastName = (nameParts[0] || "").trim();
				current.firstName = (nameParts[1] || "").trim();
				break;
			}

			case "NICKNAME":
				current.nickname = value;
				break;

			case "ORG": {
				// Structure: OrgName;Department
				const orgParts = value.split(";");
				current.company = (orgParts[0] || "").trim();
				if (orgParts.length > 1) {
					current.department = (orgParts[1] || "").trim();
				}
				break;
			}

			case "TITLE":
				current.jobTitle = value;
				break;

			case "ROLE":
				if (!current.jobTitle) {
					current.jobTitle = value;
				}
				break;

			case "TEL": {
				const paramStr = JSON.stringify(params);
				if (paramStr.includes("CELL") || paramStr.includes("MOBILE")) {
					if (!current.mobilePhone) current.mobilePhone = value;
					else if (!current.otherPhone) current.otherPhone = value;
				} else if (paramStr.includes("WORK")) {
					if (!current.workPhone) current.workPhone = value;
					else if (!current.otherPhone) current.otherPhone = value;
				} else if (paramStr.includes("HOME")) {
					if (!current.homePhone) current.homePhone = value;
					else if (!current.otherPhone) current.otherPhone = value;
				} else {
					if (!current.mobilePhone) current.mobilePhone = value;
					else if (!current.otherPhone) current.otherPhone = value;
				}
				break;
			}

			case "EMAIL": {
				if (!current.email1) {
					current.email1 = value;
				} else if (!current.email2) {
					current.email2 = value;
				}
				break;
			}

			case "ADR": {
				// Structure: PO Box;Ext Addr;Street;City;State;PostalCode;Country
				const adrParts = value.split(";");
				if (adrParts.length >= 7) {
					current.streetAddress = (adrParts[2] || "").trim();
					current.city = (adrParts[3] || "").trim();
					current.state = (adrParts[4] || "").trim();
					current.postalCode = (adrParts[5] || "").trim();
					current.country = (adrParts[6] || "").trim();
				} else {
					current.streetAddress = value.replace(/;/g, " ").trim();
				}
				break;
			}

			case "BDAY":
				current.birthday = value;
				break;

			case "NOTE":
				current.notes = current.notes ? `${current.notes}\n${value}` : value;
				break;

			case "URL":
				if (!current.website) {
					current.website = value;
				}
				break;
		}
	}

	return contacts;
}

/**
 * Escapes a single CSV field according to RFC 4180.
 */
function escapeCsvCell(cell: string): string {
	if (
		cell.includes(",") ||
		cell.includes('"') ||
		cell.includes("\n") ||
		cell.includes("\r")
	) {
		return `"${cell.replace(/"/g, '""')}"`;
	}
	return cell;
}

/**
 * Converts a list of parsed contacts into RFC 4180 CSV format with UTF-8 BOM.
 */
export function contactsToCsv(contacts: ParsedContact[]): string {
	const headers = [
		"First Name",
		"Last Name",
		"Full Name",
		"Nickname",
		"Company",
		"Job Title",
		"Department",
		"Mobile Phone",
		"Work Phone",
		"Home Phone",
		"Other Phone",
		"Email 1",
		"Email 2",
		"Street Address",
		"City",
		"State / Province",
		"Postal Code",
		"Country",
		"Birthday",
		"Notes",
		"Website",
	];

	const rows: string[] = [];
	rows.push(headers.map(escapeCsvCell).join(","));

	for (const c of contacts) {
		const row = [
			c.firstName,
			c.lastName,
			c.fullName,
			c.nickname,
			c.company,
			c.jobTitle,
			c.department,
			c.mobilePhone,
			c.workPhone,
			c.homePhone,
			c.otherPhone,
			c.email1,
			c.email2,
			c.streetAddress,
			c.city,
			c.state,
			c.postalCode,
			c.country,
			c.birthday,
			c.notes,
			c.website,
		];
		rows.push(row.map(escapeCsvCell).join(","));
	}

	// Prepend UTF-8 BOM (\uFEFF) for instant Microsoft Excel Unicode recognition
	return `\uFEFF${rows.join("\r\n")}\r\n`;
}

/**
 * Converts raw VCF binary/text into CSV text ArrayBuffer.
 */
export function convertVcfToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "READ_VCF");
	const text = new TextDecoder("utf-8").decode(input);

	if (!text.toUpperCase().includes("BEGIN:VCARD")) {
		throw new Error(
			"convertVcf: Input file is not a valid vCard format (missing BEGIN:VCARD marker)",
		);
	}

	onProgress?.(0.4, "PARSE_CONTACTS");
	const contacts = parseVCard(text);

	if (contacts.length === 0) {
		throw new Error(
			"convertVcf: No valid contact records found inside vCard file",
		);
	}

	onProgress?.(0.8, "GENERATE_CSV");
	const csvString = contactsToCsv(contacts);
	const outputBytes = new TextEncoder().encode(csvString);

	onProgress?.(1.0, "DONE");
	return outputBytes.buffer as ArrayBuffer;
}
