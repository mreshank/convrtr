import { describe, expect, it } from "vitest";
import { assToSrtEngine } from "../index";
import { cleanAssText, parseAss, parseAssTimestamp } from "../parser";

describe("Advanced SubStation Alpha (ASS/SSA) Parser & Engine", () => {
	it("parses ASS timestamps into milliseconds accurately", () => {
		expect(parseAssTimestamp("0:00:00.00")).toBe(0);
		expect(parseAssTimestamp("0:01:23.45")).toBe(83450);
		expect(parseAssTimestamp("1:02:03.04")).toBe(3723040);
	});

	it("cleans override tags and preserves formatting", () => {
		expect(cleanAssText("Normal text")).toBe("Normal text");
		expect(cleanAssText("{\\pos(192,200)}Positioned text")).toBe(
			"Positioned text",
		);
		expect(cleanAssText("{\\an8}Top-aligned text")).toBe("Top-aligned text");
		expect(cleanAssText("{\\i1}Italic line{\\i0}")).toBe("<i>Italic line</i>");
		expect(cleanAssText("{\\b1}Bold line{\\b0}")).toBe("<b>Bold line</b>");
		expect(cleanAssText("First line\\NSecond line")).toBe(
			"First line\nSecond line",
		);
		expect(cleanAssText("Karaoke {\\k20}word {\\k30}two")).toBe(
			"Karaoke word two",
		);
		// Vector drawing should be completely removed
		expect(
			cleanAssText("{\\p1}m 0 0 l 100 0 100 100 0 100{\\p0}Text after shape"),
		).toBe("Text after shape");
	});

	it("parses full ASS anime subtitle document with styles and dialogues", () => {
		const assContent = [
			"[Script Info]",
			"Title: Sample Anime Episode",
			"ScriptType: v4.00+",
			"PlayResX: 1920",
			"PlayResY: 1080",
			"",
			"[V4+ Styles]",
			"Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
			"Style: Default,Arial,55,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,2,2,10,10,10,1",
			"",
			"[Events]",
			"Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
			"Comment: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,Intro commentary to ignore",
			"Dialogue: 0,0:00:02.50,0:00:06.00,Default,Protagonist,0,0,0,,I won't let you get away with this!",
			"Dialogue: 0,0:00:06.50,0:00:09.20,Default,Antagonist,0,0,0,,{\\i1}Is that so?{\\i0}\\NYou are too late.",
			"Dialogue: 1,0:00:10.00,0:00:12.00,Default,,0,0,0,,{\\p1}m 0 0 l 10 10{\\p0}", // Pure drawing cue, should be omitted
		].join("\n");

		const bytes = new TextEncoder().encode(assContent);
		const result = parseAss(bytes);

		expect(result.title).toBe("Sample Anime Episode");
		expect(result.scriptType).toBe("v4.00+");
		expect(result.cueCount).toBe(2);

		// Cue 1
		expect(result.srtContent).toContain("1\n00:00:02,500 --> 00:00:06,000");
		expect(result.srtContent).toContain("I won't let you get away with this!");

		// Cue 2
		expect(result.srtContent).toContain("2\n00:00:06,500 --> 00:00:09,200");
		expect(result.srtContent).toContain(
			"<i>Is that so?</i>\nYou are too late.",
		);
	});

	it("throws an error when no valid dialogue lines are present", () => {
		const emptyAss =
			"[Script Info]\nTitle: Empty\n[Events]\nFormat: Layer, Start, End, Text\n";
		const bytes = new TextEncoder().encode(emptyAss);
		expect(() => parseAss(bytes)).toThrow(/No valid dialogue lines found/);
	});

	it("runs conversion through assToSrtEngine", async () => {
		const assContent = [
			"[Events]",
			"Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
			"Dialogue: 0,0:01:00.00,0:01:05.00,Default,,0,0,0,,Engine test dialogue",
		].join("\n");

		const inputBuffer = new TextEncoder().encode(assContent).buffer;
		expect(await assToSrtEngine.probe()).toBe(true);

		let progress = 0;
		const outputBuffer = await assToSrtEngine.run(
			inputBuffer as ArrayBuffer,
			{},
			(p) => {
				progress = p;
			},
		);

		expect(progress).toBe(1.0);
		const outputText = new TextDecoder().decode(new Uint8Array(outputBuffer));
		expect(outputText).toContain("1\n00:01:00,000 --> 00:01:05,000");
		expect(outputText).toContain("Engine test dialogue");
	});
});
