import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const extendedEmojiRegex = /\p{Extended_Pictographic}/u;

// Standard legal typography glyphs and symbols (copyright, arrows, etc.)
const ALLOWED_CODEPOINTS = new Set([
	0x00a9, // ©
	0x00ae, // ®
	0x2122, // ™
	0x2190, // ←
	0x2191, // ↑
	0x2192, // →
	0x2193, // ↓
	0x2197, // ↗
	0x2198, // ↘
	0x2794, // ➔
]);

function scanFiles(dir: string, fileList: string[] = []): string[] {
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (
				[
					"node_modules",
					".git",
					".next",
					"dist-extension",
					"out",
					"fixtures",
				].includes(entry.name)
			) {
				continue;
			}
			scanFiles(full, fileList);
		} else if (
			entry.isFile() &&
			/\.(tsx?|jsx?|mjs|html|css|json)$/.test(entry.name)
		) {
			// Skip DOS CP437 mapping table in nfo parser
			if (full.includes("nfo/parser.ts")) continue;
			fileList.push(full);
		}
	}
	return fileList;
}

describe("product style compliance", () => {
	it("enforces strict zero-emojis policy in product code and scripts", () => {
		const files = [
			...scanFiles(join(process.cwd(), "src")),
			...scanFiles(join(process.cwd(), "scripts")),
		];

		const violations: Array<{ file: string; line: number; text: string }> = [];

		for (const file of files) {
			const content = readFileSync(file, "utf-8");
			const lines = content.split("\n");
			lines.forEach((line, idx) => {
				const chars = [...line];
				const emojis = chars.filter((c) => {
					if (!extendedEmojiRegex.test(c)) return false;
					const code = c.codePointAt(0);
					if (code && ALLOWED_CODEPOINTS.has(code)) return false;
					return true;
				});

				if (emojis.length > 0) {
					violations.push({
						file,
						line: idx + 1,
						text: line.trim(),
					});
				}
			});
		}

		expect(
			violations,
			`Found emojis in product files:\n${violations
				.map((v) => `${v.file}:${v.line} -> ${v.text}`)
				.join("\n")}`,
		).toEqual([]);
	});
});
