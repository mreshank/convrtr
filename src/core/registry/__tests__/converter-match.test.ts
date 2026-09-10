import { describe, expect, it } from "vitest";
import {
	detectFileExtension,
	findToolForConversion,
	getAllTargetFormats,
	getAvailableTargetFormatsForFile,
	getCommonTargetFormats,
} from "../converter-match";

describe("converter-match", () => {
	describe("detectFileExtension", () => {
		it("extracts extension from filename correctly", () => {
			expect(detectFileExtension("photo.png")).toBe("png");
			expect(detectFileExtension("sample.photo.PNG")).toBe("png");
			expect(detectFileExtension("picture.jpeg")).toBe("jpg");
			expect(detectFileExtension("track.wav")).toBe("wav");
			expect(detectFileExtension("movie.mov")).toBe("mov");
			expect(detectFileExtension("document.pdf")).toBe("pdf");
		});

		it("falls back to MIME type if extension is missing", () => {
			const file = new File(["dummy"], "unnamed", { type: "image/png" });
			expect(detectFileExtension(file)).toBe("png");
		});

		it("returns empty string for unknown formats without extension", () => {
			const file = new File(["dummy"], "unknownfile");
			expect(detectFileExtension(file)).toBe("");
		});
	});

	describe("getAvailableTargetFormatsForFile", () => {
		it("finds multiple target formats for PNG", () => {
			const targets = getAvailableTargetFormatsForFile("test.png");
			const exts = targets.map((t) => t.ext);
			expect(exts).toContain("webp");
			expect(exts).toContain("jpg");
			expect(exts).toContain("avif");
			expect(exts).toContain("pdf");
		});

		it("finds target formats for audio like WAV", () => {
			const targets = getAvailableTargetFormatsForFile("audio.wav");
			const exts = targets.map((t) => t.ext);
			expect(exts).toContain("mp3");
			expect(exts).toContain("flac");
			expect(exts).toContain("ogg");
		});

		it("finds target formats for video like MOV", () => {
			const targets = getAvailableTargetFormatsForFile("clip.mov");
			const exts = targets.map((t) => t.ext);
			expect(exts).toContain("mp4");
		});
	});

	describe("findToolForConversion", () => {
		it("matches PNG to WEBP", () => {
			const tool = findToolForConversion("png", "webp");
			expect(tool).toBeDefined();
			expect(tool?.id).toBe("image/png-to-webp");
		});

		it("matches WAV to MP3", () => {
			const tool = findToolForConversion("wav", "mp3");
			expect(tool).toBeDefined();
			expect(tool?.id).toBe("audio/wav-to-mp3");
		});

		it("returns undefined for unsupported pairs", () => {
			const tool = findToolForConversion("mov", "mp3");
			expect(tool).toBeUndefined();
		});
	});

	describe("getCommonTargetFormats", () => {
		it("finds shared target formats between PNG and JPG", () => {
			const file1 = new File([""], "a.png", { type: "image/png" });
			const file2 = new File([""], "b.jpg", { type: "image/jpeg" });
			const common = getCommonTargetFormats([file1, file2]);
			expect(common).toContain("webp");
			expect(common).toContain("avif");
			expect(common).toContain("pdf");
		});

		it("returns empty array if mixed incompatible types have no intersection", () => {
			const file1 = new File([""], "a.mov", { type: "video/quicktime" });
			const file2 = new File([""], "b.pdf", { type: "application/pdf" });
			const common = getCommonTargetFormats([file1, file2]);
			expect(common).toEqual([]);
		});
	});

	describe("getAllTargetFormats", () => {
		it("unions target formats from different files", () => {
			const file1 = new File([""], "a.png", { type: "image/png" });
			const file2 = new File([""], "b.wav", { type: "audio/wav" });
			const all = getAllTargetFormats([file1, file2]);
			expect(all).toContain("webp");
			expect(all).toContain("mp3");
		});
	});
});
