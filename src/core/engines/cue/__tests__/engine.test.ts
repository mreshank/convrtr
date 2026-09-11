import { describe, expect, it } from "vitest";
import { cueToJsonEngine } from "../index";
import { parseCue, parseCueTimestamp } from "../parser";

describe("CUE Sheet Parser & Engine", () => {
	it("parses CD-DA timestamps accurately at 75 frames per second", () => {
		// 00:00:00 -> 0 ms
		expect(parseCueTimestamp("00:00:00")).toEqual({
			time: "00:00:00",
			frames: 0,
			seconds: 0,
			milliseconds: 0,
			formatted: "00:00.000",
		});

		// 00:01:00 -> 75 frames, 1000 ms, 1.0 s
		expect(parseCueTimestamp("00:01:00")).toEqual({
			time: "00:01:00",
			frames: 75,
			seconds: 1,
			milliseconds: 1000,
			formatted: "00:01.000",
		});

		// 02:30:37 -> 2*4500 + 30*75 + 37 = 9000 + 2250 + 37 = 11287 frames
		// 11287 / 75 = 150.49333... seconds -> ~150493 ms
		const ts = parseCueTimestamp("02:30:37");
		expect(ts.frames).toBe(11287);
		expect(ts.seconds).toBeCloseTo(150.493, 2);
		expect(ts.milliseconds).toBe(150493);
		expect(ts.formatted).toBe("02:30.493");
	});

	it("parses a complete single-file audio CUE sheet", () => {
		const cueText = `
REM GENRE "Electronic / Ambient"
REM DATE 1996
PERFORMER "Aphex Twin"
TITLE "Selected Ambient Works"
FILE "Selected_Ambient_Works.flac" WAVE
  TRACK 01 AUDIO
    TITLE "Xtal"
    PERFORMER "Aphex Twin"
    FLAGS DCP
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    TITLE "Tha"
    PERFORMER "Aphex Twin"
    INDEX 00 04:54:25
    INDEX 01 04:56:00
`.trim();

		const result = parseCue(cueText);

		expect(result.performer).toBe("Aphex Twin");
		expect(result.title).toBe("Selected Ambient Works");
		expect(result.comments.GENRE).toBe("Electronic / Ambient");
		expect(result.comments.DATE).toBe("1996");
		expect(result.files).toHaveLength(1);
		expect(result.totalTracks).toBe(2);

		const file = result.files[0];
		expect(file).toBeDefined();
		if (!file) return;
		expect(file.fileName).toBe("Selected_Ambient_Works.flac");
		expect(file.fileType).toBe("WAVE");
		expect(file.tracks).toHaveLength(2);

		const t1 = file.tracks[0];
		expect(t1).toBeDefined();
		if (!t1) return;
		expect(t1.number).toBe(1);
		expect(t1.title).toBe("Xtal");
		expect(t1.flags).toEqual(["DCP"]);
		expect(t1.indices).toHaveLength(1);
		expect(t1.indices[0]?.number).toBe(1);
		expect(t1.indices[0]?.timestamp.time).toBe("00:00:00");

		const t2 = file.tracks[1];
		expect(t2).toBeDefined();
		if (!t2) return;
		expect(t2.number).toBe(2);
		expect(t2.title).toBe("Tha");
		expect(t2.indices).toHaveLength(2);
		expect(t2.indices[0]?.number).toBe(0);
		expect(t2.indices[0]?.timestamp.time).toBe("04:54:25");
		expect(t2.indices[1]?.number).toBe(1);
		expect(t2.indices[1]?.timestamp.time).toBe("04:56:00");
	});

	it("handles UTF-8 BOM, CATALOG, ISRC, and PREGAP directives", () => {
		const cueText = `\uFEFFCATALOG 1234567890123
TITLE "Album with Gaps"
FILE "disc.bin" BINARY
  TRACK 01 AUDIO
    ISRC USPR37300012
    PREGAP 00:02:00
    INDEX 01 00:02:00
`.trim();

		const result = parseCue(cueText);
		expect(result.catalog).toBe("1234567890123");
		expect(result.title).toBe("Album with Gaps");

		const track = result.files[0]?.tracks[0];
		expect(track?.isrc).toBe("USPR37300012");
		expect(track?.pregap?.time).toBe("00:02:00");
		expect(track?.pregap?.seconds).toBe(2);
		expect(track?.pregap?.milliseconds).toBe(2000);
	});

	it("converts CUE sheet to valid JSON via cueToJsonEngine", async () => {
		const cueText = `
TITLE "Test CD"
FILE "audio.wav" WAVE
  TRACK 01 AUDIO
    TITLE "Intro"
    INDEX 01 00:00:00
`;
		const encoder = new TextEncoder();
		const inputBuf = encoder.encode(cueText).buffer as ArrayBuffer;

		const result = await cueToJsonEngine.run(inputBuf, {}, () => {});
		const decoder = new TextDecoder("utf-8");
		const jsonStr = decoder.decode(result);

		const parsed = JSON.parse(jsonStr);
		expect(parsed.title).toBe("Test CD");
		expect(parsed.files[0]?.fileName).toBe("audio.wav");
		expect(parsed.files[0]?.tracks[0]?.title).toBe("Intro");
	});
});
