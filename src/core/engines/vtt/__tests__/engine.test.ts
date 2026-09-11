import { describe, expect, it } from "vitest";
import { convertVttToSrt, formatSrtTimestamp, parseVtt } from "../parser";

describe("WebVTT Engine", () => {
	it("formats timestamps with padding and comma milliseconds", () => {
		expect(formatSrtTimestamp("01:23.456")).toBe("00:01:23,456");
		expect(formatSrtTimestamp("1:02:03.4")).toBe("01:02:03,400");
		expect(formatSrtTimestamp("00:00:00.000")).toBe("00:00:00,000");
	});

	it("parses standard WebVTT cues and converts to SRT", () => {
		const vtt = `WEBVTT - Title: Sample Transcript

1
00:00:01.000 --> 00:00:04.000
Welcome to the presentation.

2
00:00:05.500 --> 00:00:08.250
Today we discuss client-side privacy.
`;

		const result = convertVttToSrt(vtt);
		expect(result.cueCount).toBe(2);
		expect(result.srtText).toContain(
			"1\n00:00:01,000 --> 00:00:04,000\nWelcome to the presentation.",
		);
		expect(result.srtText).toContain(
			"2\n00:00:05,500 --> 00:00:08,250\nToday we discuss client-side privacy.",
		);
	});

	it("handles short MM:SS.mmm timestamps, cue settings, and NOTE comments", () => {
		const vtt = `WEBVTT

NOTE
This is an introductory comment block.
Multi-line note.

01:15.200 --> 01:18.900 line:0% position:50% align:center
Top aligned dialogue.

NOTE Another inline note

02:00.000 --> 02:05.100
Bottom dialogue.
`;

		const cues = parseVtt(vtt);
		expect(cues.length).toBe(2);
		expect(cues[0]?.startRaw).toBe("01:15.200");
		expect(cues[0]?.settings).toBe("line:0% position:50% align:center");

		const result = convertVttToSrt(vtt);
		expect(result.srtText).toContain("00:01:15,200 --> 00:01:18,900");
		expect(result.srtText).toContain("00:02:00,000 --> 00:02:05,100");
	});

	it("strips WebVTT voice and class tags while preserving standard HTML tags", () => {
		const vtt = `WEBVTT

00:00:10.000 --> 00:00:14.000
<v Narrator><c.yellow>Look at</c> this <i>italicized</i> and <b>bold</b> text.</v>
`;

		const result = convertVttToSrt(vtt);
		expect(result.srtText).toContain(
			"Look at this <i>italicized</i> and <b>bold</b> text.",
		);
	});

	it("supports preserving voice tag as speaker prefix", () => {
		const vtt = `WEBVTT

00:00:10.000 --> 00:00:14.000
<v Alice>Hello Bob!</v>
`;

		const result = convertVttToSrt(vtt, { preserveVoiceAsPrefix: true });
		expect(result.srtText).toContain("Alice: Hello Bob!");
	});

	it("throws when WEBVTT header signature is missing", () => {
		const invalid =
			"Just some subtitle text without header\n00:01.000 --> 00:04.000\nHello";
		expect(() => convertVttToSrt(invalid)).toThrow(
			/Missing 'WEBVTT' signature/,
		);
	});
});
