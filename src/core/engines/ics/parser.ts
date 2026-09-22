export interface IcsEvent {
	uid: string;
	start: string;
	end: string;
	summary: string;
	location: string;
	description: string;
	recurrence: string;
}

/**
 * Converts an iCalendar (`.ics`) export into a flat event table.
 *
 * The format is line-based RFC 5545 with three wrinkles handled here:
 * folded lines (continuations starting with space/tab), parameters on
 * property names (`DTSTART;TZID=…:…`), and escaped text (`\,`, `\;`, `\n`).
 * Dates pass through verbatim (UTC `Z`, floating, or TZID-qualified) so no
 * timezone is ever mis-inferred — spreadsheets sort the strings as-is.
 * Recurrence rules ride along untouched in RRULE for calendar apps to
 * interpret; attendees are counted, not enumerated.
 */
export function parseIcs(fileBytes: Uint8Array): IcsEvent[] {
	const raw = new TextDecoder("utf-8").decode(fileBytes);
	if (!raw.includes("BEGIN:VCALENDAR")) {
		throw new Error("Not an iCalendar file: missing BEGIN:VCALENDAR.");
	}

	// Unfold: lines starting with space/tab continue the previous line.
	const lines: string[] = [];
	for (const rawLine of raw.split(/\r?\n/)) {
		if (
			(rawLine.startsWith(" ") || rawLine.startsWith("\t")) &&
			lines.length > 0
		) {
			lines[lines.length - 1] += rawLine.slice(1);
		} else {
			lines.push(rawLine);
		}
	}

	const events: IcsEvent[] = [];
	let current: Record<string, string[]> | null = null;
	const push = () => {
		if (current) events.push(toEvent(current));
		current = null;
	};

	for (const line of lines) {
		if (line === "BEGIN:VEVENT") {
			push();
			current = {};
		} else if (line === "END:VEVENT") {
			push();
		} else if (current && line.includes(":")) {
			const idx = line.indexOf(":");
			const head = line.slice(0, idx);
			const prop = head.split(";")[0] ?? "";
			const value = unescapeText(line.slice(idx + 1));
			if (!prop) continue;
			const bucket = current[prop] ?? [];
			bucket.push(value);
			current[prop] = bucket;
		}
	}
	push();

	if (events.length === 0) {
		throw new Error("No VEVENTs found in this calendar.");
	}
	return events;
}

function unescapeText(s: string): string {
	return s
		.replace(/\\n/gi, "\n")
		.replace(/\\,/g, ",")
		.replace(/\\;/g, ";")
		.replace(/\\\\/g, "\\");
}

function first(props: Record<string, string[]>, key: string): string {
	return props[key]?.[0] ?? "";
}

function toEvent(props: Record<string, string[]>): IcsEvent {
	return {
		uid: first(props, "UID"),
		start: first(props, "DTSTART"),
		end: first(props, "DTEND"),
		summary: first(props, "SUMMARY"),
		location: first(props, "LOCATION"),
		description: first(props, "DESCRIPTION"),
		recurrence: first(props, "RRULE"),
	};
}

function csvCell(s: string): string {
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function renderIcsCsv(events: IcsEvent[]): string {
	const head = "uid,start,end,summary,location,description,recurrence";
	const lines = events.map((e) =>
		[e.uid, e.start, e.end, e.summary, e.location, e.description, e.recurrence]
			.map(csvCell)
			.join(","),
	);
	return `\uFEFF${head}\n${lines.join("\n")}\n`;
}

export function convertIcsToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading events...");
	const events = parseIcs(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${events.length} events...`);
	const csv = renderIcsCsv(events);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(csv).buffer as ArrayBuffer;
}
