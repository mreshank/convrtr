import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	canConvert,
	convert,
	getAvailableConversions,
	getAvailableTargetFormatsForExt,
	TOOLS,
} from "../src/index";

const rootDir = resolve(__dirname, "../../..");
const binPath = resolve(__dirname, "../bin/convrtr.js");

describe("convrtr NPM Package API", () => {
	it("exposes tools catalog with 270+ tools", () => {
		expect(TOOLS.length).toBeGreaterThan(270);
	});

	it("identifies target formats for common extensions", () => {
		const heicTargets = getAvailableTargetFormatsForExt("heic");
		expect(heicTargets.length).toBeGreaterThan(0);
		expect(heicTargets.map((t) => t.ext)).toContain("jpg");

		const wavTargets = getAvailableTargetFormatsForExt("wav");
		expect(wavTargets.map((t) => t.ext)).toContain("mp3");
	});

	it("correctly identifies reachable direct and multi-hop conversions", () => {
		expect(canConvert("wav", "mp3")).toBe(true);
		expect(canConvert("flac", "mp3")).toBe(true);
		expect(canConvert("heic", "jpg")).toBe(true);
		expect(canConvert("unknownformatxyz", "jpg")).toBe(false);

		const audioConversions = getAvailableConversions("wav");
		expect(audioConversions).toContain("mp3");
	});

	it("converts SVG content via local SVGO engine", async () => {
		const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><!-- comment --><circle cx="50" cy="50" r="40" fill="red" /></svg>`;
		const encoder = new TextEncoder();
		const inputBuffer = encoder.encode(rawSvg).buffer as ArrayBuffer;

		const result = await convert(inputBuffer, {
			from: "svg",
			to: "svg",
		});

		expect(result).toBeDefined();
		expect(result.ext).toBe("svg");
		expect(result.toolId).toBe("image/optimise-svg");
		expect(result.data.length).toBeGreaterThan(0);

		const decoder = new TextDecoder();
		const outputSvg = decoder.decode(result.data);
		expect(outputSvg).toContain("<svg");
		expect(outputSvg).not.toContain("<!-- comment -->");
	});

	it("converts SRT subtitles to VTT", async () => {
		const srtText = `1\n00:00:01,000 --> 00:00:04,000\nHello World\n`;
		const encoder = new TextEncoder();
		const inputBuffer = encoder.encode(srtText).buffer as ArrayBuffer;

		const result = await convert(inputBuffer, {
			from: "srt",
			to: "vtt",
		});

		expect(result).toBeDefined();
		expect(result.ext).toBe("vtt");
		expect(result.toolId).toBe("document/srt-to-vtt");
		const decoder = new TextDecoder();
		const outputVtt = decoder.decode(result.data);
		expect(outputVtt).toContain("WEBVTT");
	});
});

describe("convrtr CLI Executable", () => {
	it("executes --help cleanly", () => {
		const stdout = execFileSync("node", [binPath, "--help"], {
			cwd: rootDir,
			encoding: "utf-8",
		});
		expect(stdout).toContain("CONVRTR // CLI FILE CONVERSION INSTRUMENT");
		expect(stdout).toContain("USAGE:");
	});

	it("executes formats command and lists extensions", () => {
		const stdout = execFileSync("node", [binPath, "formats"], {
			cwd: rootDir,
			encoding: "utf-8",
		});
		expect(stdout).toContain("SUPPORTED FORMATS");
		expect(stdout).toContain("flac");
		expect(stdout).toContain("wav");
		expect(stdout).toContain("heic");
	});

	it("executes check command for conversion path", () => {
		const stdout = execFileSync("node", [binPath, "check", "flac", "mp3"], {
			cwd: rootDir,
			encoding: "utf-8",
		});
		expect(stdout).toContain("STATUS: MULTI-HOP CONVERSION AVAILABLE");
		expect(stdout).toContain("audio/flac-to-wav");
	});

	it("executes targets command for specific extension", () => {
		const stdout = execFileSync("node", [binPath, "targets", "heic"], {
			cwd: rootDir,
			encoding: "utf-8",
		});
		expect(stdout).toContain("TARGETS FOR .HEIC");
		expect(stdout).toContain("jpg");
	});
});
