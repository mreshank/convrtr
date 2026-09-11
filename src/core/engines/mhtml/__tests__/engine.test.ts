import { describe, expect, it } from "vitest";
import { mhtmlToHtmlEngine } from "../index";

function buildMockMhtml(): string {
	const boundary = "----=_NextPart_000_1234";
	return [
		"From: <Saved by Web Browser>",
		"Snapshot-Content-Location: https://example.com/page",
		"Subject: Example Page",
		"Date: Thu, 10 Sep 2026 12:00:00 GMT",
		"MIME-Version: 1.0",
		`Content-Type: multipart/related; type="text/html"; boundary="${boundary}"`,
		"",
		`--${boundary}`,
		"Content-Type: text/html; charset=utf-8",
		"Content-Transfer-Encoding: quoted-printable",
		"Content-Location: https://example.com/page",
		"",
		'<!DOCTYPE html><html><body><h1>Offline Article</h1><img src=3D"cid:banner.png"><img src=3D"https://example.com/logo.jpg"></body></html>',
		"",
		`--${boundary}`,
		"Content-Type: image/png",
		"Content-Transfer-Encoding: base64",
		"Content-ID: <banner.png>",
		"",
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
		"",
		`--${boundary}`,
		"Content-Type: image/jpeg",
		"Content-Transfer-Encoding: base64",
		"Content-Location: https://example.com/logo.jpg",
		"",
		"/9j/4AAQSkZJRg==",
		"",
		`--${boundary}--`,
	].join("\r\n");
}

describe("mhtmlToHtmlEngine", () => {
	it("probes successfully", async () => {
		const supported = await mhtmlToHtmlEngine.probe();
		expect(supported).toBe(true);
	});

	it("converts MHTML into standalone HTML with inlined data URLs", async () => {
		const mockMhtml = buildMockMhtml();
		const inputBuffer = new TextEncoder().encode(mockMhtml)
			.buffer as ArrayBuffer;
		const progress: string[] = [];

		const result = await mhtmlToHtmlEngine.run(
			inputBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const htmlStr = new TextDecoder().decode(result);

		expect(htmlStr).toContain("<h1>Offline Article</h1>");
		// Check that cid: was inlined as base64 data url
		expect(htmlStr).toContain(
			'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg',
		);
		// Check that Content-Location url was inlined
		expect(htmlStr).toContain('src="data:image/jpeg;base64,/9j/4AAQSkZJRg=="');

		expect(progress).toContain("DECODE_TEXT");
		expect(progress).toContain("PARSE_PARTS");
		expect(progress).toContain("INLINE_ASSETS");
		expect(progress).toContain("DONE");
	});

	it("rejects non-MHTML files", async () => {
		const plainText = new TextEncoder().encode("Hello world not mhtml")
			.buffer as ArrayBuffer;
		await expect(
			mhtmlToHtmlEngine.run(plainText, {}, () => {}),
		).rejects.toThrow(/not a valid mhtml/i);
	});
});
