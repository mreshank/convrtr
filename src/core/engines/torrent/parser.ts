export interface TorrentInfo {
	name: string;
	announce: string | null;
	announceList: string[][];
	createdBy: string | null;
	creationDate: string | null;
	comment: string | null;
	infoHash: string;
	pieceLength: number | null;
	totalLength: number;
	fileCount: number;
	files: Array<{ path: string; length: number }>;
	isPrivate: boolean;
}

class BReader {
	off = 0;
	constructor(private readonly buf: Uint8Array) {}

	peek(): number {
		return this.buf[this.off] ?? 0;
	}

	byte(): number {
		return this.buf[this.off++] ?? 0;
	}

	number(delim: number): number {
		const start = this.off;
		while (this.off < this.buf.length && this.buf[this.off] !== delim)
			this.off++;
		const text = new TextDecoder("ascii").decode(
			this.buf.subarray(start, this.off),
		);
		this.off++; // skip delimiter
		const n = Number(text);
		if (!Number.isSafeInteger(n))
			throw new Error("Torrent integer out of safe range.");
		return n;
	}

	bytes(n: number): Uint8Array {
		const s = this.buf.subarray(this.off, this.off + n);
		this.off += n;
		return s;
	}

	value(): unknown {
		const c = this.peek();
		if (c === 0x69) {
			// i...e
			this.off++;
			return this.number(0x65);
		}
		if (c === 0x6c) {
			// l...e
			this.off++;
			const out: unknown[] = [];
			while (this.peek() !== 0x65) out.push(this.value());
			this.off++;
			return out;
		}
		if (c === 0x64) {
			// d...e
			this.off++;
			const out = new Map<string, unknown>();
			while (this.peek() !== 0x65) {
				const key = this.string();
				out.set(key, this.value());
			}
			this.off++;
			return out;
		}
		if (c >= 0x30 && c <= 0x39) {
			return this.string();
		}
		throw new Error(`Invalid bencode at offset ${this.off}.`);
	}

	string(): string {
		const len = this.number(0x3a);
		// File paths/names may be UTF-8; info-hash inputs stay byte-exact
		// because hashing re-encodes from the raw slice (see below).
		return new TextDecoder("utf-8").decode(this.bytes(len));
	}
}

async function sha1Hex(data: Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-1",
		data.buffer.slice(
			data.byteOffset,
			data.byteOffset + data.byteLength,
		) as ArrayBuffer,
	);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function asMap(v: unknown): Map<string, unknown> | null {
	return v instanceof Map ? v : null;
}

function asList(v: unknown): unknown[] | null {
	return Array.isArray(v) ? v : null;
}

function asText(v: unknown): string | null {
	return typeof v === "string" ? v : null;
}

function asNum(v: unknown): number | null {
	return typeof v === "number" ? v : null;
}

/**
 * Inspects a BitTorrent metainfo (`.torrent`) file into structured JSON.
 *
 * Bdecodes the dictionary, re-hashes the raw info-dict bytes for the
 * infohash (magnet links), and flattens single/multi-file layouts into a
 * file table with totals. Private-flag and tracker tiers surface as-is.
 * Runs on WebCrypto (SHA-1) — async, still 100% client-side.
 */
export async function parseTorrent(
	fileBytes: Uint8Array,
): Promise<TorrentInfo> {
	const reader = new BReader(fileBytes);
	const top = reader.value();
	const root = asMap(top);
	if (!root)
		throw new Error(
			"Not a torrent file: top-level bencode is not a dictionary.",
		);

	const infoRaw = ((): Uint8Array | null => {
		// The infohash must cover the raw info-dict bytes, so re-walk the
		// top dictionary and capture the value span (keys sort
		// lexicographically, but scanning needs no such assumption).
		const probe = new BReader(fileBytes);
		if (probe.peek() !== 0x64) return null;
		probe.off++;
		while (probe.peek() !== 0x65) {
			const key = probe.string();
			const valStart = probe.off;
			probe.value();
			if (key === "info") return fileBytes.subarray(valStart, probe.off);
		}
		return null;
	})();

	const info = asMap(root.get("info"));
	if (!info) throw new Error("Torrent has no info dictionary.");
	if (!infoRaw) throw new Error("Could not locate the raw info dictionary.");

	const name = asText(info.get("name")) ?? "untitled";
	const pieceLength = asNum(info.get("piece length"));
	const filesRaw = asList(info.get("files"));
	const files: Array<{ path: string; length: number }> = [];
	if (filesRaw) {
		for (const f of filesRaw) {
			const fm = asMap(f);
			const parts = asList(fm?.get("path")) ?? [];
			files.push({
				path: [name, ...parts.map((p) => asText(p) ?? "")]
					.filter(Boolean)
					.join("/"),
				length: asNum(fm?.get("length")) ?? 0,
			});
		}
	} else {
		files.push({ path: name, length: asNum(info.get("length")) ?? 0 });
	}

	const tiers = asList(root.get("announce-list")) ?? [];
	const announceList = tiers.map((tier) =>
		(asList(tier) ?? []).map((u) => asText(u) ?? "").filter(Boolean),
	);
	const created = asNum(root.get("creation date"));
	const privateFlag = asNum(info.get("private")) === 1;

	return {
		name,
		announce: asText(root.get("announce")),
		announceList,
		createdBy: asText(root.get("created by")),
		creationDate: created ? new Date(created * 1000).toISOString() : null,
		comment: asText(root.get("comment")),
		infoHash: await sha1Hex(infoRaw),
		pieceLength,
		totalLength: files.reduce((a, f) => a + f.length, 0),
		fileCount: files.length,
		files,
		isPrivate: privateFlag,
	};
}

export function magnetLink(info: TorrentInfo): string {
	const params = [
		`xt=urn:btih:${info.infoHash}`,
		`dn=${encodeURIComponent(info.name)}`,
	];
	for (const tier of info.announceList) {
		for (const tracker of tier)
			params.push(`tr=${encodeURIComponent(tracker)}`);
	}
	if (info.announce) params.push(`tr=${encodeURIComponent(info.announce)}`);
	return `magnet:?${params.join("&")}`;
}
