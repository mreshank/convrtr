import { describe, expect, it } from "vitest";
import { convertLrcToSrt, lrcToSrtEngine } from "../index";
import { formatSrtTimestamp, parseLrc } from "../parser";

const LRC = `[ti:Midnight Run]
[ar:The Night Owls]
[offset:+500]
[00:10.00]Headlights on the highway
[00:15.50][00:45.00]Running all night long
[01:00]Last call
`;

function bytes(s: string = LRC): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("LRC lyrics Parser & Engine", () => {
	it("fans out timestamps, applies offset and chains ends", () => {
		const cues = parseLrc(bytes());
		expect(cues).toHaveLength(4);
		expect(cues[0]?.startMs).toBe(10500);
		expect(cues[0]?.endMs).toBe(16000);
		expect(cues[0]?.text).toBe("Headlights on the highway");
		expect(cues[1]?.startMs).toBe(16000);
		expect(cues[2]?.startMs).toBe(45500);
		expect(cues[1]?.text).toBe(cues[2]?.text);
		const last = cues[cues.length - 1];
		if (!last) throw new Error("expected a final cue");
		expect(last.endMs).toBe(last.startMs + 2000);
	});

	it("formats SRT timestamps with comma millis", () => {
		expect(formatSrtTimestamp(61000)).toBe("00:01:01,000");
		expect(formatSrtTimestamp(10500)).toBe("00:00:10,500");
	});

	it("emits numbered SRT end-to-end through the engine", async () => {
		expect(await lrcToSrtEngine.probe()).toBe(true);
		const out = await convertLrcToSrt(
			bytes().buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const srt = new TextDecoder().decode(out);
		expect(srt).toContain(
			"1\n00:00:10,500 --> 00:00:16,000\nHeadlights on the highway",
		);
		expect(srt).not.toContain("Midnight Run"); // headers must not leak into cues
		expect(srt).not.toContain("[ti:");
	});

	it("throws when no timestamps exist", () => {
		expect(() => parseLrc(bytes("no timestamps here\nat all"))).toThrow(
			"No lyric timestamps",
		);
	});
});
