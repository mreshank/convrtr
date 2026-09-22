import { unzipSync } from "fflate";
import type { ParamValue } from "@/core/quality";
import { rtfToMarkdownEngine } from "../rtf";
import type { Engine } from "../types";

/**
 * Extracts the manuscript from a Scrivener project bundle (`.scriv`).
 *
 * ## Why this exists
 *
 * Scrivener's own help menu points users at the "compile" dialog whenever they
 * want a file someone else can open, but the scenario that actually strands
 * people is the opposite one: a trial has expired, a licence key has gone with
 * a dead laptop hard drive, or the app physically cannot run on a new OS.
 * With Scrivener gone, a year of drafts sits inside a `.scriv` bundle that no
 * other program on earth reads. Every conversion tool on the web handles
 * PDF/DOCX/ODT; none of them ever look at `.scriv`.
 *
 * ## How it works
 *
 * A Scrivener 3 project is just a ZIP package (`PK\x03\x04`, same footprint as
 * a `.docx`), and the manuscript is stored as Rich Text. The root
 * `content.rtf` is the running draft — the binder compiled in document order —
 * which is exactly what someone with a dead copy of Scrivener wants back.
 * Older 1.x/2.x projects are loose folders; when a user zips one to upload it,
 * the same `.scriv` extension applies and the RTF lives under `Files/`.
 *
 * Either way this engine is a ZIP reader plus the platform's existing RTF →
 * Markdown parser: no Scrivener, no compile step, no server.
 */
export const scrivToMarkdownEngine: Engine = {
	id: "extract:scriv-to-markdown",

	async probe() {
		// Pure ZIP inflate + a pure text parser — nothing to feature-detect.
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.15, "UNPACK");

		let files: Record<string, Uint8Array>;
		try {
			files = unzipSync(new Uint8Array(input));
		} catch {
			throw new Error(
				"This doesn't look like a Scrivener project — the file could not be opened as a ZIP package. If your project is an older Scrivener 1/2 folder, zip the whole folder first and try again.",
			);
		}

		onProgress(0.4, "LOCATE");

		// A modern Scrivener 3 project keeps the compiled manuscript in the
		// root content.rtf: one file, already in binder order.
		const manuscript = files["content.rtf"];
		if (manuscript) {
			// Some packaged projects carry the manuscript as
			// `<Project>.scriv/content.rtf` rather than at the archive root —
			// prefer the root, fall back to the first nested one.
			const nested = Object.keys(files)
				.filter((name) => name.toLowerCase().endsWith("/content.rtf"))
				.sort()
				.reduce<Uint8Array | undefined>(
					(picked, name) => picked ?? files[name],
					undefined,
				);
			const primary = nested ?? manuscript;
			onProgress(0.6, "PARSE");
			return rtfToMarkdownEngine.run(
				primary.slice().buffer,
				params,
				onProgress,
			);
		}

		// Older projects (and zipped 1.x/2.x project folders) keep each binder
		// document as its own RTF file under a `...scriv/Files/` tree. Collect
		// every manuscript RTF while skipping Scrivener's own settings,
		// statistics, search-index, QuickLook, and template metadata wherever it
		// sits in the tree, then join the rest in path order so a given binder
		// always produces the same document.
		const ignored = new Set([
			"settings",
			"stats",
			"quicklook",
			"search indexes",
			"templates",
		]);
		const names = Object.keys(files)
			.filter((name) => name.toLowerCase().endsWith(".rtf"))
			.filter((name) => {
				const segments = name.toLowerCase().split("/");
				return !segments.some((segment) => ignored.has(segment));
			})
			.sort();

		if (names.length === 0) {
			throw new Error(
				"The project contains no Rich Text manuscript, so there is nothing to extract. Scrivener stores writing as RTF, but this bundle has none.",
			);
		}

		onProgress(0.6, "PARSE");
		const parts: string[] = [];
		let index = 0;
		for (const name of names) {
			const content = files[name];
			if (content === undefined) continue;
			const markdown = await rtfToMarkdownEngine.run(
				content.slice().buffer,
				params,
				(ratio, _phase) =>
					onProgress(0.6 + (index / names.length) * ratio * 0.35, "PARSE"),
			);
			parts.push(new TextDecoder().decode(markdown));
			index += 1;
		}

		const joined = parts.join("\n\n---\n\n");
		return new TextEncoder().encode(joined).slice().buffer as ArrayBuffer;
	},
};
