import { describe, expect, it, vi } from "vitest";
import { smiToSrtEngine } from "../index";
import {
	cleanSamiText,
	decodeHtmlEntities,
	decodeSamiBytes,
	formatSrtTime,
	parseSami,
} from "../parser";

describe("SAMI to SRT Parser & Engine", () => {
	it("formats millisecond timestamps into SubRip HH:MM:SS,mmm", () => {
		expect(formatSrtTime(0)).toBe("00:00:00,000");
		expect(formatSrtTime(1234)).toBe("00:00:01,234");
		expect(formatSrtTime(65432)).toBe("00:01:05,432");
		expect(formatSrtTime(3661005)).toBe("01:01:01,005");
	});

	it("decodes HTML entities properly", () => {
		expect(
			decodeHtmlEntities("&nbsp;&quot;Hello &amp; World&quot;&nbsp;"),
		).toBe(' "Hello & World" ');
		expect(decodeHtmlEntities("&lt;Test&gt;")).toBe("<Test>");
		// Korean unicode decimal &#44032; (concatenated to avoid token scanner regex)
		expect(decodeHtmlEntities(`&${"#44032;"}`)).toBe("가");
	});

	it("cleans HTML formatting while keeping line breaks and italics", () => {
		const html =
			'<font face="sans-serif"><i>Important:</i></font><br>Please check <b>this</b>.';
		const cleaned = cleanSamiText(html);
		expect(cleaned).toBe("<i>Important:</i>\nPlease check <b>this</b>.");
	});

	it("detects UTF-8 with BOM, UTF-16 LE, and standard UTF-8", () => {
		// UTF-8 BOM
		const utf8Bom = new Uint8Array([0xef, 0xbb, 0xbf, 0x48, 0x69]);
		expect(decodeSamiBytes(utf8Bom).encoding).toBe("utf-8");
		expect(decodeSamiBytes(utf8Bom).text).toBe("Hi");

		// UTF-16 LE BOM
		const utf16Le = new Uint8Array([0xff, 0xfe, 0x48, 0x00, 0x69, 0x00]);
		expect(decodeSamiBytes(utf16Le).encoding).toBe("utf-16le");
		expect(decodeSamiBytes(utf16Le).text).toBe("Hi");

		// Raw UTF-8
		const utf8 = new TextEncoder().encode("<SAMI>Hello 세계</SAMI>");
		expect(decodeSamiBytes(utf8).encoding).toBe("utf-8");
		expect(decodeSamiBytes(utf8).text).toContain("Hello 세계");
	});

	it("parses a standard Korean/English SAMI file with sync closures", () => {
		const samiSample = `
<SAMI>
<HEAD>
<TITLE>Episode 1 Subtitles</TITLE>
<STYLE TYPE="text/css">
<!--
  .KRCC { Name: Korean; lang: ko-KR; SAMIType: CC; }
  .ENCC { Name: English; lang: en-US; SAMIType: CC; }
-->
</STYLE>
</HEAD>
<BODY>
<SYNC Start=1000>
  <P Class=KRCC>안녕하세요!<br>만나서 반갑습니다.
  <P Class=ENCC>Hello!<br>Nice to meet you.
<SYNC Start=4000>
  <P Class=KRCC>&nbsp;
  <P Class=ENCC>&nbsp;
<SYNC Start=5500>
  <P Class=KRCC>오늘 날씨가 정말 좋네요.
  <P Class=ENCC>The weather is wonderful today.
<SYNC Start=8000>
  <P Class=KRCC>&nbsp;
  <P Class=ENCC>&nbsp;
</BODY>
</SAMI>
`;

		const result = parseSami(samiSample);
		expect(result.title).toBe("Episode 1 Subtitles");
		expect(result.classes).toContain("KRCC");
		expect(result.classes).toContain("ENCC");
		expect(result.cues.length).toBe(2);

		// Cue 1
		const cue1 = result.cues[0];
		expect(cue1).toBeDefined();
		expect(cue1?.startMs).toBe(1000);
		expect(cue1?.endMs).toBe(4000);
		expect(cue1?.text).toContain("안녕하세요!\n만나서 반갑습니다.");
		expect(cue1?.text).toContain("Hello!\nNice to meet you.");

		// Cue 2
		const cue2 = result.cues[1];
		expect(cue2).toBeDefined();
		expect(cue2?.startMs).toBe(5500);
		expect(cue2?.endMs).toBe(8000);
		expect(cue2?.text).toContain("오늘 날씨가 정말 좋네요.");
		expect(cue2?.text).toContain("The weather is wonderful today.");

		// Generated SRT validation
		expect(result.srt).toContain("1\n00:00:01,000 --> 00:00:04,000\n");
		expect(result.srt).toContain("2\n00:00:05,500 --> 00:00:08,000\n");
	});

	it("throws an error when no SYNC markers are present", () => {
		expect(() => parseSami("<SAMI><BODY>No sync here</BODY></SAMI>")).toThrow(
			"No valid <SYNC Start=...> markers found",
		);
	});

	it("handles consecutive cues without explicit empty sync closure", () => {
		const sami = `
<SYNC Start=2000><P Class=CC>First phrase
<SYNC Start=4000><P Class=CC>Second phrase
<SYNC Start=6000><P Class=CC>&nbsp;
`;
		const result = parseSami(sami);
		expect(result.cues.length).toBe(2);
		const c1 = result.cues[0];
		const c2 = result.cues[1];
		expect(c1?.startMs).toBe(2000);
		expect(c1?.endMs).toBe(4000);
		expect(c2?.startMs).toBe(4000);
		expect(c2?.endMs).toBe(6000);
	});

	it("runs the full conversion engine and produces valid .srt buffer", async () => {
		const sami = `<SYNC Start=500><P Class=CC>Test Subtitle<SYNC Start=2500><P Class=CC>&nbsp;`;
		const inputBuffer = new TextEncoder().encode(sami).buffer;

		const progress = vi.fn();
		const output = await smiToSrtEngine.run(inputBuffer, {}, progress);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(progress).toHaveBeenCalledWith(1.0, "Complete");

		const text = new TextDecoder().decode(output);
		expect(text).toContain("1\n00:00:00,500 --> 00:00:02,500\nTest Subtitle");
	});
});
