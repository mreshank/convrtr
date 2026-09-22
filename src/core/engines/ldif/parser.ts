export interface LdapEntry {
	dn: string;
	attributes: Array<{ name: string; values: string[] }>;
}

/**
 * Converts LDAP LDIF (`.ldif`) directory exports into a flat table.
 *
 * Handles the RFC 2849 realities: folded continuation lines, base64
 * (`attr:: value`) values (decoded to UTF-8, binary replaced with a
 * placeholder), multi-valued attributes joined with ` | `, `changetype`
 * and control lines skipped (this is an export reader, not a replication
 * engine), and `version:` headers ignored. Columns are the union of all
 * attribute names with `dn` first.
 */
export function parseLdif(fileBytes: Uint8Array): {
	columns: string[];
	rows: string[][];
} {
	const raw = new TextDecoder("utf-8").decode(fileBytes);
	if (!/(^|\n)dn:/i.test(raw)) {
		throw new Error("Not an LDIF file: no `dn:` entry headers found.");
	}

	// Unfold continuation lines.
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

	const entries: LdapEntry[] = [];
	let current: LdapEntry | null = null;
	const push = () => {
		if (current?.dn) entries.push(current);
		current = null;
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || /^version\s*:/i.test(trimmed)) {
			if (!trimmed) push();
			continue;
		}
		if (
			/^(changetype|control|add|delete|replace|deleteoldrdn|newsuperior)\s*:/i.test(
				trimmed,
			)
		) {
			continue;
		}
		const m = /^([^:]+)(::?)\s?(.*)$/.exec(line);
		if (!m?.[1]) continue;
		const name = m[1].trim();
		const b64 = m[2] === "::";
		let value = m[3] ?? "";
		if (b64) {
			try {
				const bin = Uint8Array.from(atob(value.replace(/\s+/g, "")), (c) =>
					c.charCodeAt(0),
				);
				value = new TextDecoder("utf-8", { fatal: true }).decode(bin);
			} catch {
				value = "[binary data]";
			}
		}
		if (/^dn$/i.test(name)) {
			push();
			current = { dn: value, attributes: [] };
			continue;
		}
		if (!current) continue;
		const existing = current.attributes.find(
			(a) => a.name.toLowerCase() === name.toLowerCase(),
		);
		if (existing) existing.values.push(value);
		else current.attributes.push({ name, values: [value] });
	}
	push();

	if (entries.length === 0) {
		throw new Error("No LDAP entries decoded from this LDIF.");
	}

	const columns = ["dn"];
	for (const e of entries) {
		for (const a of e.attributes) {
			if (!columns.some((c) => c.toLowerCase() === a.name.toLowerCase())) {
				columns.push(a.name);
			}
		}
	}
	const rows = entries.map((e) =>
		columns.map((c) => {
			if (c === "dn") return e.dn;
			const attr = e.attributes.find(
				(a) => a.name.toLowerCase() === c.toLowerCase(),
			);
			return attr ? attr.values.join(" | ") : "";
		}),
	);
	return { columns, rows };
}

function csvCell(s: string): string {
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function convertLdifToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading directory entries...");
	const { columns, rows } = parseLdif(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${rows.length} entries...`);
	const lines = [columns.map(csvCell).join(",")];
	for (const row of rows) lines.push(row.map(csvCell).join(","));
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(`\uFEFF${lines.join("\n")}\n`)
		.buffer as ArrayBuffer;
}
