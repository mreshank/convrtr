"use client";

import { useId, useMemo, useState } from "react";
import { ToolTable } from "@/app/tools/ToolTable";
import type { ToolRow } from "@/app/tools/toolRow";

export type ToolFilterOptions = {
	category?: string;
	kind?: string;
	sort?: "relevance" | "name-asc" | "name-desc" | "category";
};

/** Computes Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	let prev = new Array<number>(n + 1);
	let curr = new Array<number>(n + 1);

	for (let j = 0; j <= n; j++) prev[j] = j;

	for (let i = 1; i <= m; i++) {
		curr[0] = i;
		const charA = a[i - 1];
		for (let j = 1; j <= n; j++) {
			const cost = charA === b[j - 1] ? 0 : 1;
			const del = (prev[j] ?? 0) + 1;
			const ins = (curr[j - 1] ?? 0) + 1;
			const sub = (prev[j - 1] ?? 0) + cost;
			curr[j] = Math.min(del, ins, sub);
		}
		const temp = prev;
		prev = curr;
		curr = temp;
	}
	return prev[n] ?? 0;
}

/** Scores how well a search token matches a candidate word (0 = no match). */
function scoreWordMatch(token: string, target: string): number {
	if (target === token) return 100;
	if (target.startsWith(token)) return 85;
	if (target.includes(token)) return 70;
	// Handle typos with Levenshtein edit distance:
	// If both words are short (<= 4 chars) and same length (e.g. webp vs webm, mp3 vs mp4),
	// they are distinct formats and should not match. But if there is an insertion/deletion typo
	// or the word is >= 5 letters, match it!
	if (token.length >= 4 && target.length >= 4) {
		const dist = levenshtein(token, target);
		if (dist <= 1) {
			if (
				token.length >= 5 ||
				target.length >= 5 ||
				Math.abs(token.length - target.length) === 1
			) {
				return 40;
			}
		}
		if (token.length >= 7 && dist <= 2) return 30;
	}
	return 0;
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

/** Fuzzy scores a tool row across its name, extensions, category, and intent. */
function scoreToolRow(row: ToolRow, tokens: string[]): number {
	if (tokens.length === 0) return 1;

	const nameWords = row.name.toLowerCase().split(/\W+/).filter(Boolean);
	const fromExt = row.fromExt.toLowerCase();
	const toExt = row.toExt.toLowerCase();
	const category = row.category.toLowerCase();
	const intentWords = (row.intent || "")
		.toLowerCase()
		.split(/\W+/)
		.filter(Boolean);
	const descWords = (row.description || "")
		.toLowerCase()
		.split(/\W+/)
		.filter(Boolean);

	let totalScore = 0;

	for (const token of tokens) {
		let tokenBest = 0;

		// Exact prefix or substring matches on primary properties
		if (row.name.toLowerCase().startsWith(token)) {
			tokenBest = Math.max(tokenBest, 150);
		} else if (row.name.toLowerCase().includes(token)) {
			tokenBest = Math.max(tokenBest, 120);
		}

		if (fromExt === token || toExt === token) {
			tokenBest = Math.max(tokenBest, 140);
		} else if (fromExt.startsWith(token) || toExt.startsWith(token)) {
			tokenBest = Math.max(tokenBest, 100);
		}

		if (category === token) {
			tokenBest = Math.max(tokenBest, 110);
		} else if (category.includes(token)) {
			tokenBest = Math.max(tokenBest, 80);
		}

		if (row.intent?.toLowerCase().includes(token)) {
			tokenBest = Math.max(tokenBest, 70);
		}
		if (row.description?.toLowerCase().includes(token)) {
			tokenBest = Math.max(tokenBest, 50);
		}

		// Word-level fuzzy matches
		for (const nw of nameWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, nw) * 1.4);
		}
		tokenBest = Math.max(tokenBest, scoreWordMatch(token, fromExt) * 1.3);
		tokenBest = Math.max(tokenBest, scoreWordMatch(token, toExt) * 1.3);
		tokenBest = Math.max(tokenBest, scoreWordMatch(token, category) * 1.2);
		for (const iw of intentWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, iw));
		}
		for (const dw of descWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, dw) * 0.9);
		}

		if (tokenBest === 0) return 0; // Every token must match
		totalScore += tokenBest;
	}

	return totalScore;
}

/**
 * Client-side filter over the build-time tool index.
 * Combines multi-token fuzzy search with category and kind filtration and sorting.
 */
export function filterToolRows(
	rows: ToolRow[],
	query: string,
	options: ToolFilterOptions = {},
): ToolRow[] {
	const trimmed = query.trim().toLowerCase();
	const tokens = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
	const { category = "all", kind = "all", sort = "relevance" } = options;

	if (tokens.length === 0) {
		const base = rows.filter((row) => {
			if (
				category !== "all" &&
				row.category.toLowerCase() !== category.toLowerCase()
			) {
				return false;
			}
			if (kind !== "all") {
				const rowKind = (row.id.split("/")[1] ?? "").toLowerCase();
				return (
					row.intent?.toLowerCase().includes(kind.toLowerCase()) ||
					row.name?.toLowerCase().includes(kind.toLowerCase()) ||
					rowKind.includes(kind.toLowerCase())
				);
			}
			return true;
		});

		if (sort === "name-asc") {
			return base.slice().sort((a, b) => a.name.localeCompare(b.name));
		}
		if (sort === "name-desc") {
			return base.slice().sort((a, b) => b.name.localeCompare(a.name));
		}
		if (sort === "category") {
			return base.slice().sort((a, b) => {
				const diff = a.category.localeCompare(b.category);
				return diff !== 0 ? diff : a.name.localeCompare(b.name);
			});
		}
		return base;
	}

	const filtered: { row: ToolRow; score: number }[] = [];

	for (const row of rows) {
		// Category filter
		if (
			category !== "all" &&
			row.category.toLowerCase() !== category.toLowerCase()
		) {
			continue;
		}

		// Kind filter (convert, compress, edit, metadata)
		if (kind !== "all") {
			const rowKind = (row.id.split("/")[1] ?? "").toLowerCase();
			const matchesKind =
				row.intent?.toLowerCase().includes(kind.toLowerCase()) ||
				row.name?.toLowerCase().includes(kind.toLowerCase()) ||
				rowKind.includes(kind.toLowerCase());
			if (!matchesKind) continue;
		}

		const score = scoreToolRow(row, tokens);
		if (score > 0) {
			filtered.push({ row, score });
		}
	}

	filtered.sort((a, b) => {
		if (trimmed && sort === "relevance") {
			const rankDiff = rank(a.row, trimmed) - rank(b.row, trimmed);
			if (rankDiff !== 0) return rankDiff;
			const scoreDiff = b.score - a.score;
			if (scoreDiff !== 0) return scoreDiff;
		}
		if (sort === "name-asc") {
			return a.row.name.localeCompare(b.row.name);
		}
		if (sort === "name-desc") {
			return b.row.name.localeCompare(a.row.name);
		}
		if (sort === "category") {
			const catDiff = a.row.category.localeCompare(b.row.category);
			if (catDiff !== 0) return catDiff;
			return a.row.name.localeCompare(b.row.name);
		}
		return a.row.name.localeCompare(b.row.name);
	});

	return filtered.map((f) => f.row);
}

const POPULAR_FORMAT_SHORTCUTS = [
	"PNG",
	"JPG",
	"WEBP",
	"AVIF",
	"MP4",
	"WEBM",
	"WAV",
	"MP3",
	"FLAC",
	"PDF",
];

export function ToolSearch({ rows }: { rows: ToolRow[] }) {
	const inputId = useId();
	const categoryId = useId();
	const kindId = useId();
	const sortId = useId();

	const [query, setQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [selectedKind, setSelectedKind] = useState("all");
	const [sort, setSort] = useState<
		"relevance" | "name-asc" | "name-desc" | "category"
	>("relevance");

	const filtered = useMemo(() => {
		return filterToolRows(rows, query, {
			category: selectedCategory,
			kind: selectedKind,
			sort,
		});
	}, [rows, query, selectedCategory, selectedKind, sort]);

	const isFiltered =
		query.trim().length > 0 ||
		selectedCategory !== "all" ||
		selectedKind !== "all";

	const resetFilters = () => {
		setQuery("");
		setSelectedCategory("all");
		setSelectedKind("all");
		setSort("relevance");
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Search Row + Right-Aligned Filters */}
			<div
				className="flex flex-col gap-3 border p-4"
				style={{
					background: "var(--surface)",
					borderColor: "var(--rule)",
					borderRadius: "var(--radius)",
				}}
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					{/* Search input on the left */}
					<div className="relative flex-1 min-w-64">
						<label htmlFor={inputId} className="sr-only">
							Search tools
						</label>
						<input
							id={inputId}
							type="search"
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								if (event.target.value.trim() && sort !== "relevance") {
									setSort("relevance");
								}
							}}
							placeholder="Fuzzy search formats, codecs, tasks (e.g. wav, webp, compress)…"
							className="mono border px-3 py-2 text-[13px] w-full"
							style={{
								background: "var(--ground)",
								color: "var(--ink)",
								borderColor: "var(--rule-strong)",
								borderRadius: "var(--radius)",
								outline: "none",
							}}
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery("")}
								aria-label="Clear query"
								className="mono absolute right-3 top-1/2 -translate-y-1/2 text-[13px]"
								style={{
									background: "transparent",
									border: "none",
									color: "var(--ink-muted)",
									cursor: "pointer",
								}}
							>
								✕
							</button>
						)}
					</div>

					{/* Right-aligned filters toolbar */}
					<div className="flex flex-wrap items-center gap-2">
						{/* Category Selector */}
						<div className="flex items-center gap-1">
							<label htmlFor={categoryId} className="sr-only">
								Filter by Category
							</label>
							<select
								id={categoryId}
								value={selectedCategory}
								onChange={(e) => setSelectedCategory(e.target.value)}
								aria-label="Filter by Category"
								className="mono border px-3 py-2 text-[13px]"
								style={{
									background: "var(--ground)",
									color: "var(--ink)",
									borderColor: "var(--rule-strong)",
									borderRadius: "var(--radius)",
									cursor: "pointer",
								}}
							>
								<option value="all">All Categories</option>
								<option value="image">Image</option>
								<option value="video">Video</option>
								<option value="audio">Audio</option>
								<option value="document">Document</option>
							</select>
						</div>

						{/* Task / Kind Selector */}
						<div className="flex items-center gap-1">
							<label htmlFor={kindId} className="sr-only">
								Filter by Task
							</label>
							<select
								id={kindId}
								value={selectedKind}
								onChange={(e) => setSelectedKind(e.target.value)}
								aria-label="Filter by Task"
								className="mono border px-3 py-2 text-[13px]"
								style={{
									background: "var(--ground)",
									color: "var(--ink)",
									borderColor: "var(--rule-strong)",
									borderRadius: "var(--radius)",
									cursor: "pointer",
								}}
							>
								<option value="all">All Tasks</option>
								<option value="convert">Convert</option>
								<option value="compress">Compress</option>
								<option value="edit">Edit / Trim</option>
								<option value="metadata">Metadata</option>
							</select>
						</div>

						{/* Sort Selector */}
						<div className="flex items-center gap-1">
							<label htmlFor={sortId} className="sr-only">
								Sort tools
							</label>
							<select
								id={sortId}
								value={sort}
								onChange={(e) =>
									setSort(
										e.target.value as
											| "relevance"
											| "name-asc"
											| "name-desc"
											| "category",
									)
								}
								aria-label="Sort tools"
								className="mono border px-3 py-2 text-[13px]"
								style={{
									background: "var(--ground)",
									color: "var(--ink)",
									borderColor: "var(--rule-strong)",
									borderRadius: "var(--radius)",
									cursor: "pointer",
								}}
							>
								<option value="relevance">Relevance</option>
								<option value="name-asc">Name A → Z</option>
								<option value="name-desc">Name Z → A</option>
								<option value="category">By Category</option>
							</select>
						</div>
					</div>
				</div>

				{/* Quick Format Shortcuts */}
				<div className="flex flex-wrap items-center gap-2 pt-1">
					<span
						className="meta text-[11px]"
						style={{
							color: "var(--ink-muted)",
							marginRight: "var(--space-base)",
						}}
					>
						QUICK FORMATS:
					</span>
					{POPULAR_FORMAT_SHORTCUTS.map((fmt) => {
						const isActive = query.trim().toLowerCase() === fmt.toLowerCase();
						return (
							<button
								key={fmt}
								type="button"
								onClick={() => setQuery(isActive ? "" : fmt.toLowerCase())}
								className="mono border px-2 py-0.5 text-[11px]"
								style={{
									background: isActive ? "var(--ink)" : "var(--ground)",
									color: isActive ? "var(--ground)" : "var(--ink-muted)",
									borderColor: isActive ? "var(--ink)" : "var(--rule)",
									borderRadius: "var(--radius)",
									cursor: "pointer",
									fontWeight: isActive ? 600 : 400,
								}}
							>
								{fmt}
							</button>
						);
					})}

					{isFiltered && (
						<button
							type="button"
							onClick={resetFilters}
							className="mono text-[11px] underline"
							style={{
								background: "transparent",
								border: "none",
								color: "var(--accent)",
								cursor: "pointer",
								marginLeft: "auto",
							}}
						>
							Reset filters
						</button>
					)}
				</div>
			</div>

			{/* Status Bar */}
			<div className="flex items-center justify-between">
				<span
					className="mono text-[11px]"
					style={{ color: "var(--ink-muted)" }}
				>
					{isFiltered
						? `SHOWING ${filtered.length} OF ${rows.length} TOOLS`
						: `${rows.length} TOOLS AVAILABLE`}
				</span>
			</div>

			{/* Tool Table */}
			{filtered.length > 0 && (
				<ToolTable rows={filtered} caption="Search results" />
			)}

			{filtered.length === 0 && (
				<div
					className="border p-8 text-center flex flex-col items-center gap-2"
					style={{
						background: "var(--surface)",
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
					}}
				>
					<span className="mono text-[12px]" style={{ color: "var(--accent)" }}>
						[NO_TOOLS_MATCH]
					</span>
					<p className="text-[13px] m-0" style={{ color: "var(--ink)" }}>
						No tools matched your filter criteria.
					</p>
					<button
						type="button"
						onClick={resetFilters}
						className="mono border px-4 py-1 text-[12px] mt-2"
						style={{
							background: "var(--ink)",
							color: "var(--ground)",
							borderColor: "var(--ink)",
							borderRadius: "var(--radius)",
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						Clear filters
					</button>
				</div>
			)}
		</div>
	);
}
