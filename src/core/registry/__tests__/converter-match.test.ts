import { describe, expect, it } from "vitest";
import {
	detectFileExtension,
	findConversionRoute,
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

	describe("findConversionRoute", () => {
		it("resolves direct route for direct tool", () => {
			const routeInfo = findConversionRoute("png", "webp");
			expect(routeInfo).toBeDefined();
			expect(routeInfo?.route).toHaveLength(1);
			expect(routeInfo?.tool.id).toBe("image/png-to-webp");
		});

		it("resolves multi-hop route for clip -> pdf (via PNG)", () => {
			const routeInfo = findConversionRoute("clip", "pdf");
			expect(routeInfo).toBeDefined();
			if (!routeInfo) return;
			expect(routeInfo.route.length).toBeGreaterThanOrEqual(2);
			expect(routeInfo.route[0]?.accept.ext).toContain("clip");
			expect(routeInfo.route[routeInfo.route.length - 1]?.output.ext).toBe(
				"pdf",
			);
			expect(routeInfo.intermediateSteps).toContain("PNG");
		});

		it("resolves multi-hop route for tracker audio xm -> mp3 (via WAV)", () => {
			const routeInfo = findConversionRoute("xm", "mp3");
			expect(routeInfo).toBeDefined();
			if (!routeInfo) return;
			expect(routeInfo.route.length).toBeGreaterThanOrEqual(2);
			expect(routeInfo.route[0]?.accept.ext).toContain("xm");
			expect(routeInfo.route[routeInfo.route.length - 1]?.output.ext).toBe(
				"mp3",
			);
			expect(routeInfo.intermediateSteps).toContain("WAV");
		});

		it("resolves multi-hop route for mov -> gif (via MP4)", () => {
			const routeInfo = findConversionRoute("mov", "gif");
			expect(routeInfo).toBeDefined();
			if (!routeInfo) return;
			expect(routeInfo.route.length).toBeGreaterThanOrEqual(2);
			expect(routeInfo.route[0]?.accept.ext).toContain("mov");
			expect(routeInfo.route[routeInfo.route.length - 1]?.output.ext).toBe(
				"gif",
			);
			expect(routeInfo.intermediateSteps).toContain("MP4");
		});

		it("resolves a direct route for a FLIC animation to GIF", () => {
			for (const ext of ["fli", "flc"]) {
				const routeInfo = findConversionRoute(ext, "gif");
				expect(routeInfo).toBeDefined();
				expect(routeInfo?.tool.id).toBe("video/fli-to-gif");
				expect(routeInfo?.route).toHaveLength(1);
			}
		});

		it("resolves a direct route for an SVG sprite-sheet", () => {
			const routeInfo = findConversionRoute("svg", "image/svg-sprite-sheet");
			expect(routeInfo).toBeDefined();
			expect(routeInfo?.tool.id).toBe("image/svg-sprite-sheet");
			expect(routeInfo?.route).toHaveLength(1);
		});

		it("resolves direct routes for Apple iWork preview extraction", () => {
			for (const [ext, toolId] of [
				["pages", "document/pages-to-zip"],
				["key", "document/key-to-zip"],
			] as const) {
				const routeInfo = findConversionRoute(ext, toolId);
				expect(routeInfo, ext).toBeDefined();
				expect(routeInfo?.tool.id).toBe(toolId);
				expect(routeInfo?.route).toHaveLength(1);
			}
		});

		it("resolves direct routes for GoPro proxy rename-and-verify", () => {
			for (const [ext, toolId] of [
				["lrv", "video/lrv-to-mp4"],
				["thm", "image/thm-to-jpg"],
			] as const) {
				const routeInfo = findConversionRoute(ext, toolId);
				expect(routeInfo, ext).toBeDefined();
				expect(routeInfo?.tool.id).toBe(toolId);
				expect(routeInfo?.route).toHaveLength(1);
			}
		});

		it("resolves a direct route for ISO disc image extraction", () => {
			const routeInfo = findConversionRoute("iso", "document/iso-to-zip");
			expect(routeInfo).toBeDefined();
			expect(routeInfo?.tool.id).toBe("document/iso-to-zip");
			expect(routeInfo?.route).toHaveLength(1);
		});

		it("resolves a direct route for drawio diagram to SVG", () => {
			const routeInfo = findConversionRoute("drawio", "image/drawio-to-svg");
			expect(routeInfo).toBeDefined();
			expect(routeInfo?.tool.id).toBe("image/drawio-to-svg");
			expect(routeInfo?.route).toHaveLength(1);
		});

		it("resolves operation disambiguation by specific tool ID", () => {
			const compressRoute = findConversionRoute("jpg", "image/compress-jpg");
			expect(compressRoute).toBeDefined();
			expect(compressRoute?.tool.id).toBe("image/compress-jpg");

			const resizeRoute = findConversionRoute("jpg", "image/resize-jpg");
			expect(resizeRoute).toBeDefined();
			expect(resizeRoute?.tool.id).toBe("image/resize-jpg");
		});
	});

	describe("operation disambiguation and multi-hop in getAvailableTargetFormatsForFile", () => {
		it("includes disambiguated same-format operations for JPG", () => {
			const targets = getAvailableTargetFormatsForFile("sample.jpg");
			const labels = targets.map((t) => t.label);
			expect(labels.some((l) => l.includes("COMPRESS"))).toBe(true);
			expect(labels.some((l) => l.includes("RESIZE"))).toBe(true);
			expect(labels.some((l) => l.includes("STRIP METADATA"))).toBe(true);
		});

		it("includes multi-hop options for Clip Studio .clip file", () => {
			const targets = getAvailableTargetFormatsForFile("artwork.clip");
			const exts = targets.map((t) => t.ext);
			// Direct is PNG
			expect(exts).toContain("png");
			// Multi-hop reaches PDF, WEBP, JPG, AVIF
			expect(exts).toContain("pdf");
			expect(exts).toContain("webp");
			expect(exts).toContain("jpg");
		});
	});
});
