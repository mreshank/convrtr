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
});
