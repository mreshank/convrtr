"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

export type BlogGridItem = {
	slug: string;
	title: string;
	description: string;
	publishedAt: string;
	dateline: string;
	readingTime?: string;
	tags: string[];
	relatedTools?: { id: string; name: string; href: string }[];
};

type Props = {
	posts: BlogGridItem[];
};

type SortOption =
	| "newest"
	| "oldest"
	| "title-asc"
	| "title-desc"
	| "relevance";

/** Computes Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () =>
		new Array(n + 1).fill(0),
	);
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(
				dp[i - 1][j] + 1,
				dp[i][j - 1] + 1,
				dp[i - 1][j - 1] + cost,
			);
		}
	}
	return dp[m][n];
}

/** Checks whether sub is an ordered subsequence of str. */
function isSubsequence(sub: string, str: string): boolean {
	let i = 0;
	let j = 0;
	while (i < sub.length && j < str.length) {
		if (sub[i] === str[j]) i++;
		j++;
	}
	return i === sub.length;
}

/** Scores how well a search token matches a candidate word (0 = no match). */
function scoreWordMatch(token: string, target: string): number {
	if (target === token) return 100;
	if (target.startsWith(token)) return 85;
	if (target.includes(token)) return 70;
	if (token.length >= 3 && isSubsequence(token, target)) return 50;
	if (token.length >= 4) {
		const maxDist = token.length > 6 ? 2 : 1;
		const dist = levenshtein(token, target);
		if (dist <= maxDist) return 40 - dist * 10;
	}
	return 0;
}

/**
 * Fuzzy scores a post across title, tags, tools, slug, and description.
 * Returns 0 if any query token fails to match at all.
 */
function scorePostFuzzy(post: BlogGridItem, tokens: string[]): number {
	if (tokens.length === 0) return 1;

	const titleWords = post.title.toLowerCase().split(/\W+/).filter(Boolean);
	const tagWords = post.tags.map((t) => t.toLowerCase());
	const toolWords = (post.relatedTools ?? []).flatMap((t) =>
		`${t.id} ${t.name}`.toLowerCase().split(/\W+/).filter(Boolean),
	);
	const descWords = post.description.toLowerCase().split(/\W+/).filter(Boolean);
	const slugWords = post.slug.toLowerCase().split(/[-_]+/).filter(Boolean);

	let totalScore = 0;

	for (const token of tokens) {
		let tokenBest = 0;

		// Substring matches on full fields
		if (post.title.toLowerCase().includes(token)) {
			tokenBest = Math.max(tokenBest, 120);
		}
		if (post.tags.some((t) => t.toLowerCase().includes(token))) {
			tokenBest = Math.max(tokenBest, 90);
		}
		if (post.description.toLowerCase().includes(token)) {
			tokenBest = Math.max(tokenBest, 60);
		}

		// Word-level fuzzy matches with weighting
		for (const tw of titleWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, tw) * 1.5);
		}
		for (const tag of tagWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, tag) * 1.3);
		}
		for (const tool of toolWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, tool) * 1.2);
		}
		for (const sw of slugWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, sw) * 1.1);
		}
		for (const dw of descWords) {
			tokenBest = Math.max(tokenBest, scoreWordMatch(token, dw));
		}

		if (tokenBest === 0) return 0; // Every token must match something
		totalScore += tokenBest;
	}

	return totalScore;
}

export function BlogGrid({ posts }: Props) {
	const searchId = useId();
	const sortId = useId();
	const [query, setQuery] = useState("");
	const [selectedTag, setSelectedTag] = useState<string>("all");
	const [sort, setSort] = useState<SortOption>("newest");

	// Extract unique tags and count frequencies
	const { tagsWithCount } = useMemo(() => {
		const counts = new Map<string, number>();
		for (const post of posts) {
			for (const tag of post.tags) {
				const lower = tag.toLowerCase();
				counts.set(lower, (counts.get(lower) ?? 0) + 1);
			}
		}
		const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
		return {
			tagsWithCount: sorted,
		};
	}, [posts]);

	// Filter and sort posts with fuzzy search scores
	const filteredPosts = useMemo(() => {
		const trimmed = query.trim().toLowerCase();
		const tokens = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

		// Filter by tag and compute fuzzy match scores
		const scored: { post: BlogGridItem; score: number }[] = [];
		for (const post of posts) {
			if (selectedTag !== "all") {
				const hasTag = post.tags.some(
					(t) => t.toLowerCase() === selectedTag.toLowerCase(),
				);
				if (!hasTag) continue;
			}

			const score = scorePostFuzzy(post, tokens);
			if (score > 0) {
				scored.push({ post, score });
			}
		}

		// Sort
		scored.sort((a, b) => {
			if (sort === "relevance" && tokens.length > 0) {
				const diff = b.score - a.score;
				if (diff !== 0) return diff;
			}
			if (sort === "oldest") {
				return a.post.publishedAt.localeCompare(b.post.publishedAt);
			}
			if (sort === "title-asc") {
				return a.post.title.localeCompare(b.post.title);
			}
			if (sort === "title-desc") {
				return b.post.title.localeCompare(a.post.title);
			}
			// Default newest
			return b.post.publishedAt.localeCompare(a.post.publishedAt);
		});

		return scored.map((s) => s.post);
	}, [posts, query, selectedTag, sort]);

	const isFiltered = query.trim().length > 0 || selectedTag !== "all";

	const resetFilters = () => {
		setQuery("");
		setSelectedTag("all");
		setSort("newest");
	};

	return (
		<div
			data-blog-grid
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			{/* Search & Filter Toolbar */}
			<div
				data-blog-toolbar
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
					border: "var(--rule-width) solid var(--rule)",
					background: "var(--surface)",
					padding: "var(--gap-md)",
				}}
			>
				{/* Search Row */}
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "var(--gap-sm)",
					}}
				>
					<div
						style={{
							position: "relative",
							flex: "1 1 300px",
							display: "flex",
							alignItems: "center",
						}}
					>
						<label htmlFor={searchId} className="sr-only">
							Search articles
						</label>
						<input
							id={searchId}
							type="search"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								if (e.target.value.trim() && sort === "newest") {
									setSort("relevance");
								} else if (!e.target.value.trim() && sort === "relevance") {
									setSort("newest");
								}
							}}
							placeholder="Fuzzy search titles, tags, encryption, formats…"
							className="mono"
							style={{
								width: "100%",
								background: "var(--ground)",
								border: "var(--rule-width) solid var(--rule)",
								color: "var(--ink)",
								fontSize: "var(--mono-size)",
								padding: "var(--space-base) var(--gap-sm)",
								borderRadius: "var(--radius)",
								outline: "none",
							}}
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery("")}
								aria-label="Clear search query"
								className="mono"
								style={{
									position: "absolute",
									right: "var(--space-base)",
									background: "transparent",
									border: "none",
									color: "var(--ink-muted)",
									cursor: "pointer",
									fontSize: "var(--mono-size)",
									padding: "0 var(--space-base)",
								}}
							>
								✕
							</button>
						)}
					</div>

					{/* Sort Selector */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "var(--space-base)",
						}}
					>
						<label
							htmlFor={sortId}
							className="meta"
							style={{ color: "var(--ink-muted)" }}
						>
							SORT
						</label>
						<select
							id={sortId}
							value={sort}
							onChange={(e) => setSort(e.target.value as SortOption)}
							className="mono"
							style={{
								background: "var(--ground)",
								border: "var(--rule-width) solid var(--rule)",
								color: "var(--ink)",
								fontSize: "var(--mono-size)",
								padding: "var(--space-base) var(--gap-sm)",
								borderRadius: "var(--radius)",
								cursor: "pointer",
							}}
						>
							<option value="newest">Newest First</option>
							<option value="oldest">Oldest First</option>
							<option value="title-asc">Title A → Z</option>
							<option value="title-desc">Title Z → A</option>
							{query.trim() && <option value="relevance">Relevance</option>}
						</select>
					</div>
				</div>

				{/* Tag Filter Pills */}
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						gap: "var(--space-base)",
					}}
				>
					<span
						className="meta"
						style={{
							color: "var(--ink-muted)",
							marginRight: "var(--space-base)",
						}}
					>
						TAGS
					</span>

					<button
						type="button"
						onClick={() => setSelectedTag("all")}
						className="mono"
						style={{
							background:
								selectedTag === "all" ? "var(--ink)" : "var(--ground)",
							color:
								selectedTag === "all" ? "var(--ground)" : "var(--ink-muted)",
							border: "var(--rule-width) solid var(--rule)",
							fontSize: "var(--mono-size)",
							padding: "0 14px",
							height: "23px",
							cursor: "pointer",
							borderRadius: "var(--radius)",
							fontWeight: selectedTag === "all" ? 600 : 400,
							transition: "all var(--dur-hover) var(--ease)",
						}}
					>
						{`ALL (${posts.length})`}
					</button>

					{tagsWithCount.map(([tag, count]) => {
						const isSelected = selectedTag === tag;
						return (
							<button
								key={tag}
								type="button"
								onClick={() => setSelectedTag(isSelected ? "all" : tag)}
								className="mono"
								style={{
									background: isSelected ? "var(--ink)" : "var(--ground)",
									color: isSelected ? "var(--ground)" : "var(--ink-muted)",
									border: "var(--rule-width) solid var(--rule)",
									fontSize: "var(--mono-size)",
									padding: "0 14px",
									height: "23px",
									cursor: "pointer",
									borderRadius: "var(--radius)",
									fontWeight: isSelected ? 600 : 400,
									transition: "all var(--dur-hover) var(--ease)",
								}}
							>
								{`#${tag.toUpperCase()} (${count})`}
							</button>
						);
					})}

					{isFiltered && (
						<button
							type="button"
							onClick={resetFilters}
							className="mono"
							style={{
								background: "transparent",
								border: "none",
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
								cursor: "pointer",
								textDecoration: "underline",
								textUnderlineOffset: "3px",
								marginLeft: "auto",
							}}
						>
							Reset filters
						</button>
					)}
				</div>
			</div>

			{/* Status Bar */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "var(--gap-sm)",
				}}
			>
				<p
					data-count
					className="mono"
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--mono-size)",
						margin: 0,
					}}
				>
					{isFiltered
						? `SHOWING ${filteredPosts.length} OF ${posts.length} ARTICLES`
						: `${posts.length} ARTICLES IN ARCHIVE`}
				</p>
			</div>

			{/* Cards Grid */}
			{filteredPosts.length > 0 ? (
				<div
					data-blog-cards
					style={{
						gap: "var(--gap-md)",
						width: "100%",
					}}
				>
					{filteredPosts.map((post) => (
						<article
							key={post.slug}
							data-blog-card
							style={{
								background: "var(--surface)",
								border: "var(--rule-width) solid var(--rule)",
								padding: "var(--gap-md)",
								display: "flex",
								flexDirection: "column",
								gap: "var(--gap-sm)",
								borderRadius: "var(--radius)",
								position: "relative",
								transition: "border-color var(--dur-hover) var(--ease)",
							}}
						>
							{/* Top Bar: Date & Reading Time */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "var(--gap-sm)",
								}}
							>
								<span
									className="mono"
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--mono-size)",
									}}
								>
									{post.dateline}
								</span>

								{post.readingTime && (
									<span
										className="meta"
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "var(--space-base)",
											color: "var(--accent)",
											fontSize: "var(--mono-size)",
										}}
									>
										<span aria-hidden="true">●</span>
										{post.readingTime.toUpperCase()}
									</span>
								)}
							</div>

							{/* Title */}
							<h2
								style={{
									fontSize: "var(--label-size)",
									fontWeight: "var(--label-weight)",
									letterSpacing: "var(--label-tracking)",
									lineHeight: "var(--display-leading)",
									margin: 0,
								}}
							>
								<Link
									href={`/blog/${post.slug}`}
									style={{
										color: "var(--ink)",
										textDecoration: "none",
										display: "inline-flex",
										alignItems: "baseline",
										gap: "var(--space-base)",
									}}
								>
									<span>{post.title}</span>
									<ArrowUpRight size={14} />
								</Link>
							</h2>

							{/* Description */}
							<p
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--body-size)",
									lineHeight: "var(--body-leading)",
									margin: 0,
									flexGrow: 1,
								}}
							>
								{post.description}
							</p>

							{/* Tags & Related Tool Links */}
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "var(--space-base)",
									borderTop: "var(--rule-width) solid var(--rule)",
									paddingTop: "var(--gap-sm)",
									marginTop: "auto",
								}}
							>
								{/* Clickable Tag Chips */}
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: "var(--space-base)",
									}}
								>
									{post.tags.map((tag) => (
										<button
											key={tag}
											type="button"
											onClick={(e) => {
												e.preventDefault();
												setSelectedTag(tag.toLowerCase());
											}}
											className="mono"
											style={{
												background: "var(--ground)",
												border: "var(--rule-width) solid var(--rule)",
												color: "var(--ink-muted)",
												fontSize: "var(--mono-size)",
												padding: "1px var(--space-base)",
												cursor: "pointer",
												borderRadius: "var(--radius)",
											}}
										>
											{`#${tag}`}
										</button>
									))}
								</div>

								{/* Associated Tool Link */}
								{post.relatedTools && post.relatedTools.length > 0 && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "var(--space-base)",
										}}
									>
										{post.relatedTools.map((tool) => (
											<Link
												key={tool.id}
												href={tool.href}
												className="mono"
												style={{
													color: "var(--accent)",
													fontSize: "var(--mono-size)",
													textDecoration: "none",
													border: "var(--rule-width) solid var(--rule)",
													padding: "1px var(--space-base)",
													background: "var(--ground)",
													borderRadius: "var(--radius)",
												}}
											>
												{`TOOL: ${tool.id}`}
											</Link>
										))}
									</div>
								)}
							</div>
						</article>
					))}
				</div>
			) : (
				<div
					style={{
						border: "var(--rule-width) solid var(--rule)",
						background: "var(--surface)",
						padding: "var(--gap-lg) var(--gap-md)",
						textAlign: "center",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "var(--gap-sm)",
					}}
				>
					<p
						className="mono"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
						}}
					>
						[NO_MATCH]
					</p>
					<p style={{ color: "var(--ink)", margin: 0 }}>
						No articles matched the filter criteria.
					</p>
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--body-size)",
							margin: 0,
						}}
					>
						Try changing your search query or selecting a different topic tag.
					</p>
					<button
						type="button"
						onClick={resetFilters}
						className="mono"
						style={{
							marginTop: "var(--gap-sm)",
							background: "var(--ink)",
							color: "var(--ground)",
							border: "none",
							padding: "var(--space-base) var(--gap-md)",
							cursor: "pointer",
							fontSize: "var(--mono-size)",
							borderRadius: "var(--radius)",
							fontWeight: 600,
						}}
					>
						Clear all filters
					</button>
				</div>
			)}
		</div>
	);
}
