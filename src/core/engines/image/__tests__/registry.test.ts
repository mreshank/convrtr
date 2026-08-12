import { describe, expect, it } from "vitest";
import {
	getDecoderFor,
	getEncoder,
	IMAGE_DECODERS,
	IMAGE_ENCODERS,
} from "../registry";

describe("image decoder registry", () => {
	it("looks up the registered PNG decoder by mime type", () => {
		expect(getDecoderFor("image/png")?.id).toBe("png");
	});

	it("returns undefined for an unknown mime type", () => {
		expect(getDecoderFor("image/does-not-exist")).toBeUndefined();
	});

	it("is keyed by decoder id", () => {
		expect(IMAGE_DECODERS.get("png")?.mime).toEqual(["image/png"]);
	});

	it("looks up the registered JPEG decoder by either of its mime types", () => {
		expect(getDecoderFor("image/jpeg")?.id).toBe("jpeg");
		expect(getDecoderFor("image/jpg")?.id).toBe("jpeg");
	});

	it("looks up the registered AVIF decoder by mime type", () => {
		expect(getDecoderFor("image/avif")?.id).toBe("avif");
	});

	it("looks up the registered JXL decoder by mime type", () => {
		expect(getDecoderFor("image/jxl")?.id).toBe("jxl");
	});

	it("looks up the registered WebP decoder by mime type", () => {
		expect(getDecoderFor("image/webp")?.id).toBe("webp");
	});

	it("looks up the registered HEIC decoder by either of its mime types", () => {
		expect(getDecoderFor("image/heic")?.id).toBe("heic");
		expect(getDecoderFor("image/heif")?.id).toBe("heic");
	});

	it("registers exactly the six decoders the image pack ships", () => {
		expect(new Set(IMAGE_DECODERS.keys())).toEqual(
			new Set(["png", "jpeg", "avif", "jxl", "webp", "heic"]),
		);
	});

	it("every registered decoder's probe() resolves to a boolean without loading WASM", async () => {
		for (const decoder of IMAGE_DECODERS.values()) {
			expect(typeof (await decoder.probe())).toBe("boolean");
		}
	});
});

describe("image encoder registry", () => {
	it("looks up the registered WebP encoder by id", () => {
		expect(getEncoder("webp")?.mime).toBe("image/webp");
	});

	it("returns undefined for an unknown encoder id", () => {
		expect(getEncoder("does-not-exist")).toBeUndefined();
	});

	it("is keyed by encoder id", () => {
		expect(IMAGE_ENCODERS.get("webp")?.id).toBe("webp");
	});

	it("looks up the registered JPEG encoder by id", () => {
		expect(getEncoder("jpeg")?.mime).toBe("image/jpeg");
	});

	it("looks up the registered PNG encoder by id", () => {
		expect(getEncoder("png")?.mime).toBe("image/png");
	});

	it("looks up the registered AVIF encoder by id", () => {
		expect(getEncoder("avif")?.mime).toBe("image/avif");
	});

	it("looks up the registered JXL encoder by id", () => {
		expect(getEncoder("jxl")?.mime).toBe("image/jxl");
	});

	it("registers exactly the five encoders the image pack ships", () => {
		expect(new Set(IMAGE_ENCODERS.keys())).toEqual(
			new Set(["webp", "jpeg", "png", "avif", "jxl"]),
		);
	});

	it("every registered encoder's probe() resolves to a boolean without loading WASM", async () => {
		for (const encoder of IMAGE_ENCODERS.values()) {
			expect(typeof (await encoder.probe())).toBe("boolean");
		}
	});
});
