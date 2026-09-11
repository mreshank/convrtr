import { describe, expect, it } from "vitest";
import { convertVttToSrt } from "../../vtt";
import {
	convertSrtToVtt,
	formatVttTimestamp,
	parseSrt,
	srtToVttEngine,
} from "../index";

describe("SRT to WebVTT Subtitle Engine", () => {
	it("formats SRT timestamps to WebVTT format correctly", () => {
		expect(formatVttTimestamp("00:01:23,456")).toBe("00:01:23.456");
		expect(formatVttTimestamp("1:02:03,040")).toBe("01:02:03.040");
		expect(formatVttTimestamp("05:12,800")).toBe("00:05:12.800");
	});

	it("parses and converts standard SRT into WebVTT", () => {
		const srtContent = `1
00:00:01,000 --> 00:00:04,500
Welcome to this online lecture!

2
00:00:05,200 --> 00:00:08,900
Today we are discussing <i>distributed systems</i>.
Please take notes.
`;

		const result = convertSrtToVtt(srtContent);
		expect(result.cueCount).toBe(2);
		expect(result.vttText).toContain("WEBVTT");
		expect(result.vttText).toContain("00:00:01.000 --> 00:00:04.500");
		expect(result.vttText).toContain("Welcome to this online lecture!");
		expect(result.vttText).toContain("00:00:05.200 --> 00:00:08.900");
		expect(result.vttText).toContain(
			"Today we are discussing <i>distributed systems</i>.\nPlease take notes.",
		);
	});

	it("cleans obsolete font tags when requested", () => {
		const srtWithFont = `1
00:01:00,000 --> 00:01:05,000
<font color="#ff0000"><b>Warning:</b></font> System overload!
`;

		const result = convertSrtToVtt(srtWithFont, { cleanFontTags: true });
		expect(result.vttText).toContain("<b>Warning:</b> System overload!");
		expect(result.vttText).not.toContain("<font");
	});

	it("handles UTF-8 BOM properly", () => {
		const srtWithBom = `\uFEFF1
00:00:10,000 --> 00:00:15,000
Hello with BOM!
`;
		const cues = parseSrt(srtWithBom);
		expect(cues.length).toBe(1);
		expect(cues[0]?.text).toBe("Hello with BOM!");
	});

	it("converts through srtToVttEngine interface", async () => {
		const srtContent = `1
00:00:02,000 --> 00:00:05,000
Testing engine wrapper
`;
		const input = new TextEncoder().encode(srtContent).buffer;
		const output = await srtToVttEngine.run(input, {}, () => {});
		const vttText = new TextDecoder().decode(output);
		expect(vttText.startsWith("WEBVTT")).toBe(true);
	});

	it("throws error when no valid cues are found", () => {
		const emptySrt = "Random text that does not contain timestamps";
		expect(() => convertSrtToVtt(emptySrt)).toThrow(
			/No valid SubRip \(\.srt\) subtitle cues found/,
		);
	});

	it("verifies round-trip fidelity between SRT and WebVTT", () => {
		const initialSrt = `1
00:01:10,500 --> 00:01:15,250
Round-trip subtitle verification.
`;

		const vtt = convertSrtToVtt(initialSrt, { includeNoteHeader: false });
		const backToSrt = convertVttToSrt(vtt.vttText);

		expect(backToSrt.cueCount).toBe(1);
		expect(backToSrt.srtText).toContain("00:01:10,500 --> 00:01:15,250");
		expect(backToSrt.srtText).toContain("Round-trip subtitle verification.");
	});
});
