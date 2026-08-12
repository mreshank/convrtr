"use client";

import { useId, useState } from "react";
import { ToolTable } from "@/app/tools/ToolTable";
import type { ToolRow } from "@/app/tools/toolRow";

function searchableText(row: ToolRow): string {
	return [row.name, row.category, row.fromExt, row.toExt, row.intent]
		.join(" ")
		.toLowerCase();
}

/**
 * Ranks a row that already matched, so results read best-first: a name
 * that starts with the query outranks a name that merely contains it,
 * which outranks a match found only in the extensions/category/intent.
 */
function rank(row: ToolRow, query: string): number {
	const name = row.name.toLowerCase();
	if (name.startsWith(query)) return 0;
	if (name.includes(query)) return 1;
	return 2;
}

/**
 * Client-side, dependency-free filter over the build-time tool index.
 * Splits the query into whitespace-separated tokens and requires every
 * token to appear somewhere in the row's name, category, extensions, or
 * intent (substring match, case-insensitive) — deliberately simple so it
 * stays obviously correct rather than approximating "fuzzy."
 *
 * A pure function so the matching logic is testable without rendering
 * anything.
 */
export function filterToolRows(rows: ToolRow[], query: string): ToolRow[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return rows;

	const tokens = trimmed.split(/\s+/).filter(Boolean);
	const matches = rows.filter((row) => {
		const haystack = searchableText(row);
		return tokens.every((token) => haystack.includes(token));
	});

	return matches.slice().sort((a, b) => {
		const byRank = rank(a, trimmed) - rank(b, trimmed);
		return byRank !== 0 ? byRank : a.name.localeCompare(b.name);
	});
}

export function ToolSearch({ rows }: { rows: ToolRow[] }) {
	const inputId = useId();
	const [query, setQuery] = useState("");
	const filtered = filterToolRows(rows, query);
	const trimmedQuery = query.trim();

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<label
					htmlFor={inputId}
					className="mono text-[11px] tracking-[0.08em]"
					style={{ color: "var(--text-muted)" }}
				>
					SEARCH TOOLS
				</label>
				<input
					id={inputId}
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="png, webp, image, compress…"
					className="mono border px-3 py-2 text-[13px]"
					style={{
						background: "transparent",
						color: "var(--text-primary)",
						borderColor: "var(--hairline)",
						borderRadius: "var(--radius)",
					}}
				/>
			</div>

			<span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>
				{filtered.length} {filtered.length === 1 ? "TOOL" : "TOOLS"}
			</span>

			{filtered.length > 0 && (
				<ToolTable rows={filtered} caption="Search results" />
			)}

			{filtered.length === 0 && trimmedQuery && (
				<p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
					No tools matched {'"'}
					{trimmedQuery}
					{'"'}.
				</p>
			)}

			{filtered.length === 0 && !trimmedQuery && (
				<p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
					No tools available yet.
				</p>
			)}
		</div>
	);
}
