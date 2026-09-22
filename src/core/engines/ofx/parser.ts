export interface BankTransaction {
	date: string;
	type: string;
	amount: string;
	fitId: string;
	name: string;
	memo: string;
	account: string;
}

/**
 * Converts bank/money exports (OFX/QFX SGML and QIF) into RFC 4180 CSV.
 *
 * OFX/QFX (Open Financial Exchange, used by virtually every bank's "download
 * transactions" button) nests `<STMTTRN>` blocks with TRNTYPE/DTPOSTED/TRNAMT/
 * FITID/NAME/MEMO fields; QIF (Quicken Interchange, `D`ate/`T`otal/`P`ayee/
 * `M`emo records ending in `^`) is the legacy equivalent. Both collapse to
 * the same `date,type,amount,fitid,name,memo,account` table for spreadsheets,
 * accountants and tax prep — no bank login, no upload.
 */
export function parseBankFile(fileBytes: Uint8Array): BankTransaction[] {
	const text = new TextDecoder("utf-8").decode(fileBytes);
	if (/<OFX>|OFXHEADER/i.test(text)) return parseOfx(text);
	if (/^[!DTPMC^]/m.test(text) && text.includes("^")) return parseQif(text);
	throw new Error(
		"Unrecognised bank file: expected OFX/QFX (`<OFX>`SGML) or QIF (`D`/`T`/`P` records ending in `^`).",
	);
}

function parseOfx(text: string): BankTransaction[] {
	const out: BankTransaction[] = [];
	const acct = /<ACCTID>([^<\r\n]+)/i.exec(text)?.[1]?.trim() ?? "";
	const blocks =
		text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/STMTTRNRS>|$)/gi) ?? [];
	if (blocks.length === 0) {
		throw new Error("OFX file holds no `<STMTTRN>` transactions.");
	}
	for (const b of blocks) {
		const field = (tag: string): string => {
			const m = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(b);
			return (m?.[1] ?? "").trim();
		};
		out.push({
			date: normaliseOfxDate(field("DTPOSTED")),
			type: field("TRNTYPE"),
			amount: field("TRNAMT"),
			fitId: field("FITID"),
			name: field("NAME"),
			memo: field("MEMO"),
			account: acct,
		});
	}
	return out;
}

function normaliseOfxDate(raw: string): string {
	// YYYYMMDDHHMMSS.xxx[timezone] → YYYY-MM-DD
	const m = /^(\d{4})(\d{2})(\d{2})/.exec(raw);
	return m ? `${m[1]}-${m[2]}-${m[3]}` : raw;
}

function parseQif(text: string): BankTransaction[] {
	const out: BankTransaction[] = [];
	let cur: Record<string, string> = {};
	const flush = () => {
		if (cur.amount !== undefined || cur.date !== undefined) {
			out.push({
				date: normaliseQifDate(cur.date ?? ""),
				type: "",
				amount: cur.amount ?? "",
				fitId: "",
				name: cur.payee ?? "",
				memo: cur.memo ?? "",
				account: "",
			});
		}
		cur = {};
	};
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("!")) continue;
		const code = line[0];
		const value = line.slice(1);
		if (code === "^") flush();
		else if (code === "D") cur.date = value;
		else if (code === "T") cur.amount = value.replace(/,/g, "");
		else if (code === "P") cur.payee = value;
		else if (code === "M") cur.memo = (cur.memo ? `${cur.memo} ` : "") + value;
	}
	flush();
	if (out.length === 0) {
		throw new Error("QIF file holds no `D`/`T` transaction records.");
	}
	return out;
}

function normaliseQifDate(raw: string): string {
	// MM/DD/YYYY, MM/DD'YY or MM/DD/YY → YYYY-MM-DD
	let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
	if (m) return `${m[3]}-${m[1]?.padStart(2, "0")}-${m[2]?.padStart(2, "0")}`;
	m = /^(\d{1,2})\/(\d{1,2})['’/]?(\d{2})$/.exec(raw);
	if (m) {
		const yy = Number(m[3]);
		const yyyy = yy >= 70 ? 1900 + yy : 2000 + yy;
		return `${yyyy}-${m[1]?.padStart(2, "0")}-${m[2]?.padStart(2, "0")}`;
	}
	return raw;
}

function csvCell(s: string): string {
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function renderBankCsv(rows: BankTransaction[]): string {
	const head = "date,type,amount,fitid,name,memo,account";
	const lines = rows.map((r) =>
		[r.date, r.type, r.amount, r.fitId, r.name, r.memo, r.account]
			.map(csvCell)
			.join(","),
	);
	return `\uFEFF${head}\n${lines.join("\n")}\n`;
}

export function convertBankToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading bank transactions...");
	const rows = parseBankFile(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${rows.length} rows...`);
	const csv = renderBankCsv(rows);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(csv).buffer as ArrayBuffer;
}
