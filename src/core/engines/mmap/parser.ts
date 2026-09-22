import * as fflate from "fflate";

interface MmapTopic {
	text: string;
	notes: string[];
	link: string | null;
	done: boolean | null;
	progress: string | null;
	children: MmapTopic[];
}

/**
 * Converts a MindManager (`.mmap`) mind map into Markdown outline.
 *
 * An .mmap is a ZIP package whose `Document.xml` holds the map in
 * MindManager's schema: nested `Topic` elements under `SubTopics`, text in
 * `Text/@PlainText`, tasks in `Task` (Progress=100 → done), notes in
 * `Notes`, links in `Hyperlink/@Url`. Namespace prefixes drift between
 * versions, so parsing is local-name based and degrades gracefully —
 * unknown styling is skipped, the thinking survives.
 */
export function parseMmap(fileBytes: Uint8Array): MmapTopic {
	if (
		fileBytes.length < 4 ||
		fileBytes[0] !== 0x50 ||
		fileBytes[1] !== 0x4b ||
		fileBytes[2] !== 0x03 ||
		fileBytes[3] !== 0x04
	) {
		throw new Error(
			"Invalid MindManager file: missing ZIP container signature.",
		);
	}
	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = fflate.unzipSync(fileBytes);
	} catch (err) {
		throw new Error(
			`Failed to unpack MindManager archive: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
	const docKey = Object.keys(unzipped).find(
		(p) => p.toLowerCase() === "document.xml",
	);
	const docBytes = docKey ? unzipped[docKey] : undefined;
	if (!docBytes) {
		throw new Error("MindManager archive holds no Document.xml map.");
	}
	const xml = new TextDecoder("utf-8").decode(docBytes);
	return parseDocumentXml(xml);
}

function localTag(token: string): string {
	const clean = token.replace(/^<\/?/, "").split(/[\s/>]/)[0] ?? "";
	const parts = clean.split(":");
	return parts[parts.length - 1] ?? clean;
}

function attr(xml: string, name: string): string | null {
	const m = new RegExp(`${name}="([^"]*)"`).exec(xml);
	return m?.[1] ?? null;
}

function stripTags(s: string): string {
	return s
		.replace(/<[^>]*>/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, " ")
		.trim();
}

function parseDocumentXml(xml: string): MmapTopic {
	const root: MmapTopic = {
		text: "Mind map",
		notes: [],
		link: null,
		done: null,
		progress: null,
		children: [],
	};
	const stack: MmapTopic[] = [root];
	const tagRe = /<\/?[^>]+>/g;
	let m: RegExpExecArray | null;
	let lastIndex = 0;
	let inNotes = 0;
	let notesBuf = "";

	const current = (): MmapTopic | undefined => stack[stack.length - 1];

	// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
	while ((m = tagRe.exec(xml)) !== null) {
		const between = xml.slice(lastIndex, m.index);
		lastIndex = tagRe.lastIndex;
		if (inNotes > 0 && between.trim()) notesBuf += `${between} `;
		const token = m[0] ?? "";
		const closing = token.startsWith("</");
		const selfClosing = token.endsWith("/>");
		const name = localTag(token);

		if (!closing && name === "Topic") {
			const topic: MmapTopic = {
				text: "",
				notes: [],
				link: null,
				done: null,
				progress: null,
				children: [],
			};
			const parent = current();
			if (parent) parent.children.push(topic);
			stack.push(topic);
			if (selfClosing) stack.pop();
		} else if (closing && name === "Topic") {
			if (stack.length > 1) stack.pop();
		} else if (!closing && name === "Text") {
			const plain = attr(token, "PlainText");
			const t = current();
			if (t && !t.text) {
				if (plain !== null) {
					t.text = plain;
				} else if (!selfClosing) {
					// Rich-text variant: capture everything to the matching close.
					const rest = xml.slice(tagRe.lastIndex);
					const closeIdx = rest.search(/<\/?(?:\w+:)?Text[\s>]/);
					if (closeIdx !== -1) {
						t.text = stripTags(rest.slice(0, closeIdx));
						tagRe.lastIndex += closeIdx;
						lastIndex = tagRe.lastIndex;
					}
				}
			}
		} else if (!closing && name === "Task") {
			const t = current();
			if (t) {
				const progress = attr(token, "Progress");
				t.progress = progress;
				if (progress !== null) t.done = Number(progress) >= 100;
			}
		} else if (!closing && name === "Hyperlink") {
			const t = current();
			const url = attr(token, "Url");
			if (t && url && !t.link) t.link = url;
		} else if (!closing && name === "Notes") {
			inNotes++;
			if (selfClosing) inNotes--;
		} else if (closing && name === "Notes") {
			inNotes = Math.max(0, inNotes - 1);
			const t = current();
			const note = stripTags(notesBuf);
			if (t && note) t.notes.push(note);
			notesBuf = "";
		}
	}

	const first = root.children[0];
	if (!first) {
		throw new Error("No topics decoded from Document.xml.");
	}
	return first;
}

function escapeMd(s: string): string {
	return s.replace(/\\/g, "\\\\");
}

function renderTopic(t: MmapTopic, depth: number, out: string[]): void {
	const bullet = t.done === true ? "- [x]" : t.done === false ? "- [ ]" : "-";
	const suffix =
		t.progress !== null && t.done !== true ? ` (${t.progress}%)` : "";
	const link = t.link ? ` ([link](${t.link}))` : "";
	out.push(
		`${"  ".repeat(depth)}${bullet} ${escapeMd(t.text || "Untitled")}${suffix}${link}`,
	);
	for (const n of t.notes) {
		out.push(`${"  ".repeat(depth + 1)}> ${escapeMd(n)}`);
	}
	for (const c of t.children) renderTopic(c, depth + 1, out);
}

export function renderMmapMarkdown(root: MmapTopic): string {
	const out: string[] = [];
	out.push(`# ${escapeMd(root.text || "Mind map")}`);
	out.push("");
	for (const n of root.notes) {
		out.push(`> ${escapeMd(n)}`);
		out.push("");
	}
	for (const c of root.children) renderTopic(c, 0, out);
	out.push("");
	out.push("_Converted locally by convrtr from MindManager Document.xml._");
	out.push("");
	return out.join("\n");
}

export function convertMmapToMarkdown(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Unpacking map archive...");
	const root = parseMmap(new Uint8Array(input));
	onProgress?.(0.6, "Walking topic tree...");
	const md = renderMmapMarkdown(root);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(md).buffer as ArrayBuffer;
}
