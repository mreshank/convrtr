interface CanvasNode {
	id?: string;
	type?: string;
	text?: string;
	file?: string;
	url?: string;
	label?: string;
	color?: string;
}

interface CanvasEdge {
	id?: string;
	fromNode?: string;
	toNode?: string;
	fromSide?: string;
	toSide?: string;
	label?: string;
}

export interface CanvasSummary {
	nodeCount: number;
	edgeCount: number;
	nodes: Array<{ id: string; kind: string; title: string; body: string }>;
	edges: Array<{ from: string; to: string; label: string }>;
}

/**
 * Converts an Obsidian / JSON Canvas (`.canvas`) spatial board into
 * linear Markdown.
 *
 * JSON Canvas 1.0 is `{nodes, edges}`: text/file/link/group nodes plus
 * fromNode→toNode edges with optional labels. A canvas is brilliant on
 * screen and opaque everywhere else (notes apps, search, print, screen
 * readers) — this flattens it to titled sections with a relations list,
 * so the thinking survives outside the whiteboard.
 */
export function parseCanvas(fileBytes: Uint8Array): CanvasSummary {
	const raw = new TextDecoder("utf-8").decode(fileBytes);
	let doc: unknown;
	try {
		doc = JSON.parse(raw) as unknown;
	} catch {
		throw new Error("Invalid canvas file: not valid JSON.");
	}
	if (typeof doc !== "object" || doc === null) {
		throw new Error("Invalid canvas file: expected a `{nodes, edges}` object.");
	}
	const root = doc as { nodes?: unknown; edges?: unknown };
	if (!Array.isArray(root.nodes) && !Array.isArray(root.edges)) {
		throw new Error(
			"Invalid canvas file: missing `nodes`/`edges` arrays (JSON Canvas 1.0).",
		);
	}

	const titles = new Map<string, string>();
	const nodes: CanvasSummary["nodes"] = [];
	for (const n of (root.nodes ?? []) as CanvasNode[]) {
		if (typeof n !== "object" || n === null) continue;
		const id = n.id ?? "node";
		const kind = n.type ?? "text";
		let title = id;
		let body = "";
		if (kind === "text") {
			const text = n.text ?? "";
			title = text.split("\n")[0]?.slice(0, 80) || id;
			body = text;
		} else if (kind === "file") {
			title = n.file ?? id;
			body = `![[${n.file ?? ""}]]`;
		} else if (kind === "link") {
			title = n.url ?? id;
			body = `[${n.url ?? ""}](${n.url ?? ""})`;
		} else if (kind === "group") {
			title = `Group: ${n.label ?? id}`;
			body = "";
		} else {
			body = "";
		}
		if (n.color) title = `${title}`;
		titles.set(id, title);
		nodes.push({ id, kind, title, body });
	}

	const edges: CanvasSummary["edges"] = [];
	for (const e of (root.edges ?? []) as CanvasEdge[]) {
		if (typeof e !== "object" || e === null) continue;
		if (!e.fromNode || !e.toNode) continue;
		edges.push({
			from: titles.get(e.fromNode) ?? e.fromNode,
			to: titles.get(e.toNode) ?? e.toNode,
			label: e.label ?? "",
		});
	}

	return { nodeCount: nodes.length, edgeCount: edges.length, nodes, edges };
}

function escapeMd(s: string): string {
	return s.replace(/\\/g, "\\\\");
}

export function renderCanvasMarkdown(doc: CanvasSummary): string {
	const out: string[] = [];
	out.push("# Canvas export");
	out.push("");
	out.push(`_${doc.nodeCount} nodes · ${doc.edgeCount} connections_`);
	out.push("");
	for (const n of doc.nodes) {
		out.push(`## ${escapeMd(n.title)}`);
		out.push("");
		out.push(`_${n.kind}_`);
		out.push("");
		if (n.body && n.body !== n.title) {
			out.push(escapeMd(n.body));
			out.push("");
		}
	}
	if (doc.edges.length > 0) {
		out.push("## Connections");
		out.push("");
		for (const e of doc.edges) {
			out.push(
				`- ${escapeMd(e.from)}${e.label ? ` — ${escapeMd(e.label)} —` : " →"} ${escapeMd(e.to)}`,
			);
		}
		out.push("");
	}
	out.push("_Converted locally by convrtr from JSON Canvas 1.0._");
	out.push("");
	return out.join("\n");
}

export function convertCanvasToMarkdown(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading canvas nodes...");
	const doc = parseCanvas(new Uint8Array(input));
	onProgress?.(0.6, "Flattening to Markdown...");
	const md = renderCanvasMarkdown(doc);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(md).buffer as ArrayBuffer;
}
