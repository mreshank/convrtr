import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { scormToZipEngine } from "../index";

function buildMockScormZip(): Uint8Array {
	const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.course1" version="1.3">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
    <lom:title>
      <lom:string>Cybersecurity Essentials 101</lom:string>
    </lom:title>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>Cybersecurity Essentials 101</title>
      <item identifier="item1" identifierref="res1">
        <title>Module 1</title>
      </item>
    </organization>
  </organizations>
</manifest>`;

	const files: Record<string, Uint8Array> = {
		"imsmanifest.xml": new TextEncoder().encode(manifestXml),
		"story_content/video_lecture.mp4": new Uint8Array([
			0, 0, 0, 32, 102, 116, 121, 112, 105, 115, 111, 109,
		]),
		"story_content/narration_01.mp3": new Uint8Array([
			0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00,
		]),
		"scormcontent/assets/diagram.png": new Uint8Array(2000).fill(0x89),
		"documents/handout.pdf": new TextEncoder().encode("%PDF-1.4 Mock PDF"),
		"player/scormdriver.js": new TextEncoder().encode(
			"function SCORM_Init() {}",
		),
	};

	return zipSync(files);
}

describe("scormToZipEngine", () => {
	it("probes successfully", async () => {
		const supported = await scormToZipEngine.probe();
		expect(supported).toBe(true);
	});

	it("extracts and organizes all media from a SCORM package", async () => {
		const mockZip = buildMockScormZip();
		const progress: string[] = [];

		const result = await scormToZipEngine.run(
			mockZip.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const extracted = unzipSync(new Uint8Array(result));
		const keys = Object.keys(extracted);

		expect(keys).toContain("videos/video_lecture.mp4");
		expect(keys).toContain("audio/narration_01.mp3");
		expect(keys).toContain("images/diagram.png");
		expect(keys).toContain("documents/handout.pdf");
		expect(keys).toContain("COURSE_SUMMARY.md");

		// Should not extract player js scripts into output
		expect(keys).not.toContain("player/scormdriver.js");

		const summary = new TextDecoder().decode(extracted["COURSE_SUMMARY.md"]);
		expect(summary).toContain("Cybersecurity Essentials 101");
		expect(summary).toContain("**Extracted Videos:** 1");
		expect(summary).toContain("**Extracted Audio Clips:** 1");

		expect(progress).toContain("UNZIP");
		expect(progress).toContain("COLLECT_MEDIA");
		expect(progress).toContain("DONE");
	});

	it("rejects non-SCORM or corrupt zip archives", async () => {
		const tooSmall = new Uint8Array([1, 2, 3]);
		await expect(
			scormToZipEngine.run(tooSmall.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/invalid or corrupted/i);

		const regularZip = zipSync({
			"random_note.txt": new TextEncoder().encode("just a note"),
		});
		await expect(
			scormToZipEngine.run(regularZip.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/no scorm manifest/i);
	});
});
