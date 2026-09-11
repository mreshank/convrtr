import { gzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { tgsToJsonEngine } from "../index";

describe("tgsToJsonEngine", () => {
	it("probes successfully", async () => {
		expect(await tgsToJsonEngine.probe()).toBe(true);
	});

	it("decompresses a valid gzipped Lottie JSON payload", async () => {
		const lottieJson = JSON.stringify({
			v: "5.5.2",
			fr: 60,
			ip: 0,
			op: 180,
			w: 512,
			h: 512,
			nm: "Sticker",
			layers: [],
		});

		const gzipped = gzipSync(new TextEncoder().encode(lottieJson));
		const output = await tgsToJsonEngine.run(
			gzipped.buffer.slice(
				gzipped.byteOffset,
				gzipped.byteOffset + gzipped.byteLength,
			),
			{},
			() => {},
		);

		const resultText = new TextDecoder().decode(output);
		expect(JSON.parse(resultText)).toEqual(JSON.parse(lottieJson));
	});

	it("rejects non-gzip files", async () => {
		const plainText = new TextEncoder().encode("not a gzip file");

		await expect(
			tgsToJsonEngine.run(plainText.buffer, {}, () => {}),
		).rejects.toThrow(/not a valid GZIP/i);
	});

	it("rejects gzip files that do not contain valid JSON", async () => {
		const gzippedBadData = gzipSync(
			new TextEncoder().encode("plain text, not json!"),
		);

		await expect(
			tgsToJsonEngine.run(gzippedBadData.buffer, {}, () => {}),
		).rejects.toThrow(/not valid Lottie JSON/i);
	});
});
