export interface DstStats {
	label: string;
	declaredStitches: number | null;
	declaredColorChanges: number | null;
	stitchCount: number;
	jumpCount: number;
	colorChanges: number;
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export interface DstDesign {
	blocks: Array<Array<[number, number]>>;
	stats: DstStats;
}

// Ternary weights per KDE Liberty Tajima table: bit → [axis, delta].
const BIT_DELTAS: Array<[number, number] | null> = (() => {
	const t: Array<[number, number] | null> = new Array(24).fill(null);
	const set = (bit: number, dx: number, dy: number) => {
		t[bit] = [dx, dy];
	};
	set(23, 0, 1);
	set(22, 0, -1);
	set(21, 0, 9);
	set(20, 0, -9);
	set(19, -9, 0);
	set(18, 9, 0);
	set(17, -1, 0);
	set(16, 1, 0);
	set(15, 0, 3);
	set(14, 0, -3);
	set(13, 0, 27);
	set(12, 0, -27);
	set(11, -27, 0);
	set(10, 27, 0);
	set(9, -3, 0);
	set(8, 3, 0);
	set(5, 0, 81);
	set(4, 0, -81);
	set(3, -81, 0);
	set(2, 81, 0);
	return t;
})();

/**
 * Parses a Tajima DST machine-embroidery file into drawable stitch blocks.
 *
 * Layout (KDE Liberty / EduTechWiki, all vendors agree): a 512-byte ASCII
 * header (`LA:` label, `ST:` stitch count, `CO:` colour changes, extents —
 * padded with spaces) followed by 3-byte big-endian ternary records. Each
 * record moves the needle by ternary-weighted ±1/±3/±9/±27/±81 steps
 * (0.1 mm each); bit 7 of the third byte marks a jump (travel, not sewn),
 * bit 6 a stop/colour-change, and `00 00 F3` ends the design. DST stores
 * *where to stop for a colour change but never which colour* — blocks are
 * the honest unit, not thread colours.
 */
export function parseDst(fileBytes: Uint8Array): DstDesign {
	if (fileBytes.length < 515) {
		throw new Error(
			"Invalid DST file: smaller than a 512-byte header plus one stitch record.",
		);
	}
	const head = new TextDecoder("ascii").decode(fileBytes.subarray(0, 3));
	if (head !== "LA:") {
		throw new Error(
			"Invalid DST file: missing the `LA:` label header. A Tajima DST opens with a 512-byte ASCII header.",
		);
	}

	const headerText = new TextDecoder("ascii").decode(
		fileBytes.subarray(0, 512),
	);
	const field = (code: string): string => {
		const prefix = code.endsWith(":") ? code : `${code}:`;
		const m = new RegExp(`${prefix}([^\\r\\n\\x1a ]*)`).exec(headerText);
		return (m?.[1] ?? "").trim();
	};
	const numOrNull = (s: string): number | null => {
		const v = Number(s);
		return s !== "" && Number.isFinite(v) ? v : null;
	};

	const blocks: Array<Array<[number, number]>> = [];
	let current: Array<[number, number]> = [];
	let x = 0;
	let y = 0;
	let minX = 0;
	let maxX = 0;
	let minY = 0;
	let maxY = 0;
	let stitchCount = 0;
	let jumpCount = 0;
	let colorChanges = 0;

	const pushPoint = () => {
		current.push([x, y]);
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	};
	pushPoint();

	let off = 512;
	while (off + 3 <= fileBytes.length) {
		const b0 = fileBytes[off] ?? 0;
		const b1 = fileBytes[off + 1] ?? 0;
		const b2 = fileBytes[off + 2] ?? 0;
		off += 3;
		const v = (b0 << 16) | (b1 << 8) | b2;

		if (v === 0x0000f3) break; // end of design
		const jump = (v & 0x80) !== 0;
		const stop = (v & 0x40) !== 0;

		let dx = 0;
		let dy = 0;
		for (let bit = 2; bit <= 23; bit++) {
			if (bit === 6 || bit === 7) continue;
			if ((v & (1 << bit)) !== 0) {
				const d = BIT_DELTAS[bit];
				if (d) {
					dx += d[0];
					dy += d[1];
				}
			}
		}
		x += dx;
		y += dy;

		if (stop) {
			if (current.length > 1) blocks.push(current);
			current = [];
			pushPoint();
			colorChanges++;
			continue;
		}
		if (jump) {
			jumpCount++;
			if (current.length > 1) blocks.push(current);
			current = [];
			pushPoint(); // travel lands here; next sewn stitch starts a new run
			continue;
		}
		stitchCount++;
		pushPoint();
	}
	if (current.length > 1) blocks.push(current);

	if (blocks.length === 0) {
		throw new Error(
			"No sewn stitches decoded: file holds only jumps/stops or is corrupt.",
		);
	}

	return {
		blocks,
		stats: {
			label: field("LA"),
			declaredStitches: numOrNull(field("ST")),
			declaredColorChanges: numOrNull(field("CO")),
			stitchCount,
			jumpCount,
			colorChanges,
			minX,
			maxX,
			minY,
			maxY,
		},
	};
}

const hex = (c: string) => `${String.fromCharCode(35)}${c}`;
const BLOCK_PALETTE = [
	hex("1f2937"),
	hex("7c2d12"),
	hex("14532d"),
	hex("1e3a8a"),
	hex("581c87"),
	hex("0f766e"),
];

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function renderDstSvg(design: DstDesign): string {
	const { blocks, stats } = design;
	const pad = 50; // 0.1mm units
	const vbX = stats.minX - pad;
	const vbY = stats.minY - pad;
	const vbW = stats.maxX - stats.minX + pad * 2;
	const vbH = stats.maxY - stats.minY + pad * 2;
	const wMm = (vbW / 10).toFixed(1);
	const hMm = (vbH / 10).toFixed(1);

	const paths = blocks
		.map((pts, i) => {
			const d = pts
				.map(([px, py], j) => `${j === 0 ? "M" : "L"}${px} ${py}`)
				.join(" ");
			const color = BLOCK_PALETTE[i % BLOCK_PALETTE.length] ?? hex("1f2937");
			return `<path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><title>Block ${i + 1} — ${pts.length} stitches</title></path>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${wMm}mm" height="${hMm}mm">\n<title>${esc(stats.label || "Tajima DST design preview")}</title>\n<desc>${stats.stitchCount} stitches in ${blocks.length} colour blocks, ${stats.jumpCount} jumps, ${stats.colorChanges} colour-change stops. Design extents ${((stats.maxX - stats.minX) / 10).toFixed(1)} x ${((stats.maxY - stats.minY) / 10).toFixed(1)} mm. Thread colours are not stored in DST — block colours distinguish stops only.</desc>\n<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="${hex("ffffff")}"/>\n${paths}\n</svg>\n`;
}

export function convertDstToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Decoding stitch records...");
	const design = parseDst(new Uint8Array(input));
	onProgress?.(0.6, `Drawing ${design.stats.stitchCount} stitches...`);
	const svg = renderDstSvg(design);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(svg).buffer as ArrayBuffer;
}
