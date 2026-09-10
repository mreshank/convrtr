import { describe, expect, it } from "vitest";
import {
	formatBytes,
	formatDelta,
	formatDuration,
	formatPercent,
	parseToolTitle,
} from "../format";

describe("formatBytes", () => {
	it("uses two decimals below 10 and one above", () => {
		expect(formatBytes(1_840_000)).toBe("1.84 MB");
		expect(formatBytes(28_700_000)).toBe("28.7 MB");
	});

	it("handles bytes and kilobytes", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(2048)).toBe("2.05 KB");
	});

	it("promotes the unit when rounding crosses the threshold", () => {
		expect(formatBytes(999_970)).toBe("1.00 MB");
	});

	it("does not promote just below the rounding cliff", () => {
		expect(formatBytes(999_949)).toBe("999.9 KB");
	});

	it("drops to one decimal when rounding reaches ten", () => {
		expect(formatBytes(9_996_000)).toBe("10.0 MB");
	});
});

describe("formatDelta", () => {
	it("uses a true minus sign U+2212 when output shrank", () => {
		expect(formatDelta(1_840_000, 1_120_000)).toBe("−39%");
	});

	it("uses a plus sign when output grew", () => {
		expect(formatDelta(1_900_000, 1_940_000)).toBe("+2%");
	});

	it("reports zero change without a sign", () => {
		expect(formatDelta(1000, 1000)).toBe("0%");
	});
});

describe("formatDuration", () => {
	it("formats sub-minute durations with one decimal", () => {
		expect(formatDuration(4.23)).toBe("00:04.2");
	});

	it("formats durations past a minute", () => {
		expect(formatDuration(102)).toBe("00:01:42");
	});
});

describe("formatPercent", () => {
	it("renders a 0-1 ratio as a whole percentage", () => {
		expect(formatPercent(0.67)).toBe("67%");
	});
});

describe("parseToolTitle", () => {
	it("splits title with em dash tagline and site name", () => {
		const result = parseToolTitle(
			"Convert PNG to JPG — free, private, in your browser | convrtr",
		);
		expect(result.primary).toBe("Convert PNG to JPG");
		expect(result.secondary).toBe(
			" — free, private, in your browser | convrtr",
		);
	});

	it("splits title with pipe separator only", () => {
		const result = parseToolTitle(
			"Compress a JPG to a target file size | convrtr",
		);
		expect(result.primary).toBe("Compress a JPG to a target file size");
		expect(result.secondary).toBe(" | convrtr");
	});

	it("does not split on hyphen within words like re-encoding", () => {
		const result = parseToolTitle(
			"Convert MKV to MP4 without re-encoding | convrtr",
		);
		expect(result.primary).toBe("Convert MKV to MP4 without re-encoding");
		expect(result.secondary).toBe(" | convrtr");
	});

	it("leaves titles without separators untouched", () => {
		const result = parseToolTitle("Convert PNG to JPG");
		expect(result.primary).toBe("Convert PNG to JPG");
		expect(result.secondary).toBeUndefined();
	});
});
