import { describe, expect, it } from "vitest";
import { convertWebloc, parseWebloc } from "../parser";

describe("webloc parser", () => {
	it("parses standard Apple XML plist with URL and Title", () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Title</key>
	<string>Example Domain</string>
	<key>URL</key>
	<string>https://example.com/test?a=1&amp;b=2</string>
</dict>
</plist>`;
		const bytes = new TextEncoder().encode(xml);
		const data = parseWebloc(bytes);
		expect(data.url).toBe("https://example.com/test?a=1&b=2");
		expect(data.title).toBe("Example Domain");
	});

	it("converts XML plist to Windows .url format", () => {
		const xml = `<plist><dict><key>URL</key><string>https://convrtr.app</string></dict></plist>`;
		const buffer = new TextEncoder().encode(xml).buffer as ArrayBuffer;
		const outBuffer = convertWebloc(buffer, "url");
		const text = new TextDecoder().decode(outBuffer);
		expect(text).toContain("[InternetShortcut]\r\nURL=https://convrtr.app\r\n");
	});

	it("converts XML plist to HTML redirect format", () => {
		const xml = `<plist><dict><key>URL</key><string>https://convrtr.app</string></dict></plist>`;
		const buffer = new TextEncoder().encode(xml).buffer as ArrayBuffer;
		const outBuffer = convertWebloc(buffer, "html");
		const text = new TextDecoder().decode(outBuffer);
		expect(text).toContain(
			'<meta http-equiv="refresh" content="0; url=https://convrtr.app">',
		);
	});

	it("converts XML plist to Markdown format", () => {
		const xml = `<plist><dict><key>Title</key><string>Google</string><key>URL</key><string>https://google.com</string></dict></plist>`;
		const buffer = new TextEncoder().encode(xml).buffer as ArrayBuffer;
		const outBuffer = convertWebloc(buffer, "markdown");
		const text = new TextDecoder().decode(outBuffer);
		expect(text).toBe("[Google](https://google.com)\n");
	});

	it("parses simulated binary plist with bplist00 header", () => {
		const header = new TextEncoder().encode("bplist00\x00\x01\x02\x03");
		const urlBytes = new TextEncoder().encode("https://apple.com/macos");
		const padding = new Uint8Array(32);
		const bytes = new Uint8Array(
			header.length + urlBytes.length + padding.length,
		);
		bytes.set(header, 0);
		bytes.set(urlBytes, header.length);
		bytes.set(padding, header.length + urlBytes.length);

		const data = parseWebloc(bytes);
		expect(data.url).toBe("https://apple.com/macos");
	});

	it("throws error if no URL is present", () => {
		const xml = `<plist><dict><key>Foo</key><string>Bar</string></dict></plist>`;
		const bytes = new TextEncoder().encode(xml);
		expect(() => parseWebloc(bytes)).toThrow("Failed to find URL");
	});
});
