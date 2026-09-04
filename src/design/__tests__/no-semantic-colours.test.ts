import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(root: string, extensions: string[]): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(root)) {
		const full = join(root, entry);
		if (statSync(full).isDirectory()) {
			out.push(...collectSourceFiles(full, extensions));
			continue;
		}
		if (extensions.some((ext) => entry.endsWith(ext))) out.push(full);
	}
	return out;
}

describe("semantic colour tokens", () => {
	it("are referenced nowhere in src", () => {
		// State is carried by stroke continuity, fill and the mono label —
		// see the spec's §4.5. A reintroduced --signal would mean a hue had
		// quietly become load-bearing again.
		const offenders = collectSourceFiles("src", [".tsx", ".ts", ".css"])
			.filter((path) => !path.includes("__tests__"))
			.filter((path) =>
				/var\(--(signal|lossy|error)\)/.test(readFileSync(path, "utf8")),
			);
		expect(offenders).toEqual([]);
	});
});
