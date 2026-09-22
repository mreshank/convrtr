import { type DstDesign, renderDstSvg } from "../dst/parser";

function s8(b: number): number {
	return b > 127 ? b - 256 : b;
}

/**
 * Parses a Janome JEF machine-embroidery file into drawable stitch blocks.
 *
 * Layout (EduTech Wiki + community tables): a ~1.4KB header with NO magic —
 * authority comes from field 0, the little-endian stitch-data offset, plus
 * a colour count — followed by 2-byte signed XY deltas (0.1 mm, ±127) and
 * 4-byte `0x80`-led commands: `0x80 0x01` colour-change/stop,
 * `0x80 0x02` jump (zero-distance doubles as trim), `0x80 0x10` end
 * (2 bytes, no payload). Jumps break runs; colour changes advance the
 * thread index used only for the legend — JEF thread colours need Janome's
 * magic-number lookup, so blocks stay honestly neutral.
 */
export function parseJef(fileBytes: Uint8Array): DstDesign {
	if (fileBytes.length < 116) {
		throw new Error("Invalid JEF file: smaller than a minimal header.");
	}
	const v = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);
	const stitchOff = v.getUint32(0, true);
	const colorCount = v.getUint32(24, true);
	if (stitchOff < 32 || stitchOff >= fileBytes.length || colorCount > 200) {
		throw new Error(
			"Not a Janome JEF file: stitch-data offset is outside the file (JEF has no magic — structure is the signature).",
		);
	}

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
	const flushBlock = () => {
		if (current.length > 1) blocks.push(current);
		current = [];
	};
	pushPoint();

	let off = stitchOff;
	let ended = false;
	while (off + 2 <= fileBytes.length && !ended) {
		const bx = fileBytes[off] ?? 0;
		const by = fileBytes[off + 1] ?? 0;
		if (bx === 0x80) {
			if (by === 0x10) {
				ended = true;
				off += 2;
			} else if (by === 0x01) {
				flushBlock();
				pushPoint();
				colorChanges++;
				off += 4;
			} else if (by === 0x02) {
				const dx = s8(fileBytes[off + 2] ?? 0);
				const dy = s8(fileBytes[off + 3] ?? 0);
				x += dx;
				y += dy;
				jumpCount++;
				flushBlock();
				pushPoint();
				off += 4;
			} else {
				off += 4; // unknown control: skip the full command
			}
			continue;
		}
		x += s8(bx);
		y += s8(by);
		stitchCount++;
		pushPoint();
		off += 2;
	}
	flushBlock();

	if (blocks.length === 0) {
		throw new Error(
			"No sewn stitches decoded: file holds only jumps/stops or is corrupt.",
		);
	}

	return {
		blocks,
		stats: {
			label: "Janome JEF design",
			declaredStitches: null,
			declaredColorChanges:
				colorCount > 0 && colorCount <= 200 ? colorCount : null,
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

export function convertJefToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Decoding stitch records...");
	const design = parseJef(new Uint8Array(input));
	onProgress?.(0.6, `Drawing ${design.stats.stitchCount} stitches...`);
	const svg = renderDstSvg(design);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(svg).buffer as ArrayBuffer;
}
