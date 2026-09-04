import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Tracks the migration off the three semantic colour tokens, file by file.
 *
 * The list only ever grows: a file that has been converted must stay
 * converted. Once it covers everything, Task 8 deletes the tokens outright
 * and this becomes a whole-tree sweep.
 */
const CONVERTED = [
	"src/components/instrument/FidelityScore.tsx",
	"src/components/instrument/ErrorPanel.tsx",
	"src/components/instrument/ProgressBar.tsx",
	"src/components/instrument/TimeRange.tsx",
	"src/components/instrument/DropField.tsx",
];

describe("semantic colour migration", () => {
	it.each(CONVERTED)("%s references no semantic colour token", (path) => {
		const source = readFileSync(path, "utf8");
		expect(source).not.toMatch(/var\(--(signal|lossy|error)\)/);
	});
});
