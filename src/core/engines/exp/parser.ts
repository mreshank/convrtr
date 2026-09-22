import { type DstDesign, renderDstSvg } from "../dst/parser";

/**
 * Parses a Melco EXP machine-embroidery file into drawable stitch blocks.
 *
 * EXP is the purest stitch format (EduTech Wiki): headerless, every move a
 * signed 2's-complement XY pair in 0.1 mm from the previous needle position.
 * A pair starting with `0x80` (-128) is a control event, not a move:
 * `0x80 0x80` ends the design, `0x80 0x04` switches to jump (travel) mode,
 * `0x80 0x02` back to stitch mode, `0x80 0x01` is a colour-change/stop
 * (odd stop codes read as colour changes per community practice). Like DST,
 * EXP stores no thread colours — blocks are stops, not palettes.
 */
export function parseExp(fileBytes: Uint8Array): DstDesign {
	if (fileBytes.length < 2) {
		throw new Error("Invalid EXP file: empty.");
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
	let jumpMode = false;
	let ended = false;

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

	for (let off = 0; off + 2 <= fileBytes.length && !ended; off += 2) {
		const bx = fileBytes[off] ?? 0;
		const by = fileBytes[off + 1] ?? 0;

		if (bx === 0x80) {
			if (by === 0x80) {
				ended = true;
			} else if (by === 0x04) {
				flushBlock();
				jumpMode = true;
			} else if (by === 0x02) {
				flushBlock();
				jumpMode = false;
				pushPoint();
			} else if (by === 0x01) {
				flushBlock();
				jumpMode = false;
				pushPoint();
				colorChanges++;
			}
			// Other 0x80 codes (e.g. 0x06 trims) carry no geometry: skip.
			continue;
		}

		const dx = bx > 127 ? bx - 256 : bx;
		const dy = by > 127 ? by - 256 : by;
		x += dx;
		y += dy;
		if (jumpMode) {
			jumpCount++;
			flushBlock();
			pushPoint();
		} else {
			stitchCount++;
			pushPoint();
		}
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
			label: "Melco EXP design",
			declaredStitches: null,
			declaredColorChanges: null,
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

export function convertExpToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Decoding stitch moves...");
	const design = parseExp(new Uint8Array(input));
	onProgress?.(0.6, `Drawing ${design.stats.stitchCount} stitches...`);
	const svg = renderDstSvg(design);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(svg).buffer as ArrayBuffer;
}
