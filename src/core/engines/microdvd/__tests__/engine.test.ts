import { describe, expect, it } from "vitest";
import { microDvdToSrtEngine } from "../index";
import {
	cleanMicroDvdText,
	formatSrtTimestamp,
	parseMicroDvd,
} from "../parser";

describe("MicroDVD Subtitle Parser & Engine", () => {
	it("formats millisecond durations into standard SRT timestamp", () => {
		expect(formatSrtTimestamp(0)).toBe("00:00:00,000");
		expect(formatSrtTimestamp(1500)).toBe("00:00:01,500");
		expect(formatSrtTimestamp(65432)).toBe("00:01:05,432");
		expect(formatSrtTimestamp(3661123)).toBe("01:01:01,123");
	});

	it("cleans MicroDVD control tags and formats italics and newlines", () => {
		expect(cleanMicroDvdText("Hello world")).toBe("Hello world");
		expect(cleanMicroDvdText("Line one|Line two")).toBe("Line one\nLine two");
		expect(cleanMicroDvdText("{Y:i}Italic text")).toBe("<i>Italic text</i>");
		expect(cleanMicroDvdText("{Y:b}Bold text")).toBe("<b>Bold text</b>");
		expect(cleanMicroDvdText("{C:$0000FF}Colored text")).toBe("Colored text");
	});

	it("parses MicroDVD subtitles with explicit FPS header", () => {
		const microDvd = [
			"{1}{1}25.000",
			"{50}{100}Hello world!",
			"{150}{200}Second subtitle line|with two lines.",
			"{250}{300}{Y:i}Italic speech",
		].join("\n");

		const bytes = new TextEncoder().encode(microDvd);
		const result = parseMicroDvd(bytes);

		expect(result.fps).toBe(25);
		expect(result.cueCount).toBe(3);

		// Frame 50 at 25 fps = 2.000 seconds -> 00:00:02,000
		// Frame 100 at 25 fps = 4.000 seconds -> 00:00:04,000
		expect(result.srtContent).toContain("1\n00:00:02,000 --> 00:00:04,000");
		expect(result.srtContent).toContain("Hello world!");
		expect(result.srtContent).toContain(
			"Second subtitle line\nwith two lines.",
		);
		expect(result.srtContent).toContain("<i>Italic speech</i>");
	});

	it("defaults to 23.976 FPS when no header is present", () => {
		const microDvd = [
			"{100}{150}First line without header",
			"{200}{250}Second line",
		].join("\n");

		const bytes = new TextEncoder().encode(microDvd);
		const result = parseMicroDvd(bytes);

		expect(result.fps).toBe(23.976);
		expect(result.cueCount).toBe(2);
		expect(result.srtContent).toContain("00:00:04,171 --> 00:00:06,256");
	});

	it("throws an error when no valid cues are present", () => {
		const invalidText = "This is not a MicroDVD file.\nNo curly braces here.";
		const bytes = new TextEncoder().encode(invalidText);
		expect(() => parseMicroDvd(bytes)).toThrow(
			/No valid MicroDVD subtitle cues found/,
		);
	});

	it("runs conversion through microDvdToSrtEngine", async () => {
		const microDvd = "{1}{1}25\n{25}{50}Engine test cue";
		const inputBuffer = new TextEncoder().encode(microDvd).buffer;

		expect(await microDvdToSrtEngine.probe()).toBe(true);

		let progress = 0;
		const outputBuffer = await microDvdToSrtEngine.run(
			inputBuffer as ArrayBuffer,
			{},
			(p) => {
				progress = p;
			},
		);

		expect(progress).toBe(1.0);
		const outputText = new TextDecoder().decode(new Uint8Array(outputBuffer));
		expect(outputText).toContain("1\n00:00:01,000 --> 00:00:02,000");
		expect(outputText).toContain("Engine test cue");
	});
});
