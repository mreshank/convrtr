import { describe, expect, it } from "vitest";
import {
	convertScc,
	formatSrt,
	formatVtt,
	parseScc,
	parseSccTimecode,
} from "../parser";

describe("Scenarist SCC Parser & Converter", () => {
	const sampleScc = `Scenarist_SCC V1.0

00:00:01;00\t9420 9420 94ae 94ae c865 6c6c 6f20 576f 726c 6421 942f 942f

00:00:04;15\t942c 942c

00:00:05;00\t9420 9420 1137 1137 2053 696e 6769 6e67 2020 1137 1137 942f 942f

00:00:08;00\t942c 942c
`;

	it("parses SMPTE drop-frame and non-drop timecodes", () => {
		const dropSec = parseSccTimecode("00:01:00;02");
		expect(dropSec).toBeGreaterThan(59);
		expect(dropSec).toBeLessThan(61);

		const nonDropSec = parseSccTimecode("00:01:00:00", 30);
		expect(nonDropSec).toBe(60);
	});

	it("parses CEA-608 words and special musical note characters into cues", () => {
		const cues = parseScc(sampleScc);
		expect(cues).toHaveLength(2);

		expect(cues[0]?.text).toBe("Hello World!");
		expect(cues[0]?.startSec).toBeCloseTo(1.0, 1);
		expect(cues[0]?.endSec).toBeCloseTo(4.5, 1);

		expect(cues[1]?.text).toContain("♪");
		expect(cues[1]?.text).toContain("Singing");
	});

	it("formats standard SubRip (.srt) text", () => {
		const cues = parseScc(sampleScc);
		const srt = formatSrt(cues);

		expect(srt).toContain("1\n00:00:01,");
		expect(srt).toContain("Hello World!");
		expect(srt).toContain("2\n00:00:05,");
		expect(srt).toContain("♪");
	});

	it("formats standard WebVTT (.vtt) text", () => {
		const cues = parseScc(sampleScc);
		const vtt = formatVtt(cues);

		expect(vtt).toContain("WEBVTT");
		expect(vtt).toContain("00:00:01.");
	});

	it("converts through convertScc ArrayBuffer helper", () => {
		const buf = new TextEncoder().encode(sampleScc).buffer as ArrayBuffer;
		const outBuf = convertScc(buf, false);
		const outStr = new TextDecoder().decode(outBuf);

		expect(outStr).toContain("Hello World!");
		expect(outStr).toContain("-->");
	});
});
