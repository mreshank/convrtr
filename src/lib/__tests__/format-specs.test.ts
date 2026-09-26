import { describe, expect, it } from "vitest";
import {
	getConversionBenchmark,
	getFormatSpec,
	getTechnicalFaq,
} from "../format-specs";

describe("format-specs", () => {
	it("retrieves known format specs with complete technical data", () => {
		const png = getFormatSpec("png");
		expect(png.name).toBe("Portable Network Graphics");
		expect(png.mime).toBe("image/png");
		expect(png.magicBytes).toContain("89 50 4E 47");
		expect(png.lossless).toBe(true);

		const webp = getFormatSpec("webp");
		expect(webp.name).toBe("WebP Image Format");
		expect(webp.mime).toBe("image/webp");

		const wav = getFormatSpec("wav");
		expect(wav.mime).toBe("audio/wav");
		expect(wav.container).toContain("RIFF");
	});

	it("generates heuristic specs for custom or retro extensions", () => {
		const custom = getFormatSpec("nes-chr", "image");
		expect(custom.ext).toBe("nes-chr");
		expect(custom.name).toContain("NES-CHR Graphic Raster");
		expect(custom.mime).toBe("image/nes-chr");

		const retroAudio = getFormatSpec("669", "audio");
		expect(retroAudio.mime).toBe("audio/669");
		expect(retroAudio.container).toContain("Audio Framing");
	});

	it("computes conversion benchmarks and terminal recipes", () => {
		const png = getFormatSpec("png");
		const webp = getFormatSpec("webp");
		const bench = getConversionBenchmark(png, webp, "image", ["libvips"]);

		expect(bench.typicalDelta).toContain("-25% to -35%");
		expect(bench.runtimeEngine).toContain("libvips");
		expect(bench.privacyGuarantee).toContain("0 bytes");
		expect(bench.terminalCommand).toContain("cwebp");
	});

	it("generates targeted technical FAQs for search intent", () => {
		const wav = getFormatSpec("wav");
		const mp3 = getFormatSpec("mp3");
		const faqs = getTechnicalFaq(wav, mp3, "Convert WAV to MP3");

		expect(faqs.length).toBeGreaterThanOrEqual(4);
		expect(faqs[0]?.q).toContain("Why convert from WAV to MP3?");
		expect(faqs[1]?.q).toContain("lossless or lossy");
		expect(faqs[2]?.a).toContain("zero-upload");
	});
});
