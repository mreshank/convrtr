"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";
import { HALFTONE_FRAGMENT, ShaderSurface } from "@/design/texture";

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
	const tagSelectId = useId();
	const [query, setQuery] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [sort, setSort] = useState<SortOption>("newest");
	const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
	const [tagSearch, setTagSearch] = useState("");
	const tagDropdownRef = useRef<HTMLDivElement>(null);
	const tagSearchInputRef = useRef<HTMLInputElement>(null);

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

	// Filter tags inside the dropdown based on search
	const filteredTags = useMemo(() => {
		const q = tagSearch.trim().toLowerCase();
		if (!q) return tagsWithCount;
		return tagsWithCount.filter(([tag]) => tag.toLowerCase().includes(q));
	}, [tagsWithCount, tagSearch]);

	// Close tag dropdown on outside click or Escape
	useEffect(() => {
		if (!isTagMenuOpen) return;

		function handleClickOutside(event: MouseEvent) {
			if (
				tagDropdownRef.current &&
				!tagDropdownRef.current.contains(event.target as Node)
			) {
				setIsTagMenuOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsTagMenuOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isTagMenuOpen]);

	// Focus tag search input when dropdown opens
	useEffect(() => {
		if (isTagMenuOpen) {
			tagSearchInputRef.current?.focus();
		} else {
			setTagSearch("");
		}
	}, [isTagMenuOpen]);

	const toggleTag = (tag: string) => {
		const lower = tag.toLowerCase();
		setSelectedTags((prev) =>
			prev.includes(lower) ? prev.filter((t) => t !== lower) : [...prev, lower],
		);
	};

	const clearTags = () => {
		setSelectedTags([]);
	};

	// Filter and sort posts with fuzzy search scores
	const filteredPosts = useMemo(() => {
		const trimmed = query.trim().toLowerCase();
		const tokens = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

		// Filter by tags (matches any selected tag) and compute fuzzy match scores
		const scored: { post: BlogGridItem; score: number }[] = [];
		for (const post of posts) {
			if (selectedTags.length > 0) {
				const hasAnyTag = post.tags.some((t) =>
					selectedTags.includes(t.toLowerCase()),
				);
				if (!hasAnyTag) continue;
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
	}, [posts, query, selectedTags, sort]);

	const isFiltered = query.trim().length > 0 || selectedTags.length > 0;

	const resetFilters = () => {
		setQuery("");
		setSelectedTags([]);
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
					position: "relative",
					overflow: "visible",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
					border: "var(--rule-width) solid var(--rule)",
					background: "var(--surface)",
					padding: "var(--gap-md)",
				}}
			>
				<ShaderSurface
					fragment={HALFTONE_FRAGMENT}
					intensity={0.14}
					label="blog-toolbar-halftone"
				/>
				<div
					style={{
						position: "relative",
						zIndex: 1,
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					{/* Controls Row: Search Input | Tags Multiselect | Sort Selector */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							gap: "var(--gap-sm)",
						}}
					>
						{/* 1. Search articles */}
						<div
							style={{
								position: "relative",
								flex: "2 1 calc(var(--space-base) * 30)",
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
									borderRadius: "var(--radius-control)",
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

						{/* 2. Searchable Multiselect Tags Field (between search and sort) */}
						<div
							ref={tagDropdownRef}
							style={{
								position: "relative",
								flex: "1 1 calc(var(--space-base) * 24)",
								minWidth: "calc(var(--space-base) * 24)",
							}}
						>
							<button
								id={tagSelectId}
								type="button"
								aria-haspopup="listbox"
								aria-expanded={isTagMenuOpen}
								onClick={() => setIsTagMenuOpen((prev) => !prev)}
								className="mono"
								style={{
									width: "100%",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									background: "var(--ground)",
									border:
										"var(--rule-width) solid " +
										(isTagMenuOpen || selectedTags.length > 0
											? "var(--rule-strong)"
											: "var(--rule)"),
									color: "var(--ink)",
									fontSize: "var(--mono-size)",
									padding: "var(--space-base) var(--gap-sm)",
									borderRadius: "var(--radius-control)",
									cursor: "pointer",
									outline: "none",
									gap: "var(--space-base)",
									whiteSpace: "nowrap",
								}}
							>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "var(--space-base)",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}
								>
									<span className="meta" style={{ color: "var(--ink-muted)" }}>
										TAGS
									</span>
									<span
										style={{
											color:
												selectedTags.length > 0
													? "var(--ink)"
													: "var(--ink-muted)",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{selectedTags.length === 0
											? "All tags"
											: selectedTags.length === 1
												? `#${selectedTags[0]?.toUpperCase()}`
												: `${selectedTags.length} tags selected`}
									</span>
								</span>

								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "var(--space-base)",
										flexShrink: 0,
									}}
								>
									{selectedTags.length > 0 && (
										<span
											className="mono"
											style={{
												background: "var(--ink)",
												color: "var(--ground)",
												fontSize: "var(--mono-size)",
												fontWeight: 600,
												padding: "0 var(--space-base)",
												borderRadius: "var(--radius-pill)",
												lineHeight: 1.2,
											}}
										>
											{selectedTags.length}
										</span>
									)}
									<span
										aria-hidden="true"
										style={{
											color: "var(--ink-muted)",
											fontSize: "var(--mono-size)",
											display: "inline-block",
											transform: isTagMenuOpen
												? "rotate(180deg)"
												: "rotate(0deg)",
											transition: "transform var(--dur-hover) var(--ease)",
										}}
									>
										▾
									</span>
								</span>
							</button>

							{/* Dropdown Popover */}
							{isTagMenuOpen && (
								<div
									role="listbox"
									aria-label="Tags filter"
									aria-multiselectable="true"
									style={{
										position: "absolute",
										top: "calc(100% + var(--space-base))",
										left: 0,
										right: 0,
										minWidth: "calc(var(--space-base) * 32)",
										zIndex: 100,
										background: "var(--surface)",
										border: "var(--rule-width) solid var(--rule-strong)",
										borderRadius: "var(--radius-control)",
										overflow: "hidden",
										display: "flex",
										flexDirection: "column",
									}}
								>
									{/* Search tags inside dropdown */}
									<div
										style={{
											padding: "var(--space-base)",
											borderBottom: "var(--rule-width) solid var(--rule)",
											background: "var(--ground)",
										}}
									>
										<input
											ref={tagSearchInputRef}
											type="search"
											value={tagSearch}
											onChange={(e) => setTagSearch(e.target.value)}
											placeholder="Search tags…"
											className="mono"
											style={{
												width: "100%",
												background: "var(--surface)",
												border: "var(--rule-width) solid var(--rule)",
												color: "var(--ink)",
												fontSize: "var(--mono-size)",
												padding: "var(--space-base)",
												borderRadius: "var(--radius-control)",
												outline: "none",
											}}
										/>
									</div>

									{/* Quick Header */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											padding: "var(--space-base)",
											borderBottom: "var(--rule-width) solid var(--rule)",
											background: "var(--surface)",
										}}
									>
										<span
											className="meta"
											style={{ color: "var(--ink-muted)" }}
										>
											{filteredTags.length}{" "}
											{filteredTags.length === 1 ? "TAG" : "TAGS"}
										</span>
										{selectedTags.length > 0 && (
											<button
												type="button"
												onClick={clearTags}
												className="mono"
												style={{
													background: "transparent",
													border: "none",
													color: "var(--accent)",
													fontSize: "var(--mono-size)",
													cursor: "pointer",
													padding: 0,
												}}
											>
												Clear
											</button>
										)}
									</div>

									{/* Scrollable Tag List */}
									<div
										style={{
											maxHeight: "calc(var(--space-base) * 30)",
											overflowY: "auto",
											display: "flex",
											flexDirection: "column",
										}}
									>
										{filteredTags.length > 0 ? (
											filteredTags.map(([tag, count]) => {
												const isSelected = selectedTags.includes(
													tag.toLowerCase(),
												);
												return (
													<button
														key={tag}
														type="button"
														role="option"
														aria-selected={isSelected}
														onClick={() => toggleTag(tag)}
														className="mono"
														style={{
															display: "flex",
															alignItems: "center",
															justifyContent: "space-between",
															padding: "var(--space-base)",
															background: isSelected
																? "var(--rule-subtle)"
																: "transparent",
															border: "none",
															borderBottom:
																"var(--rule-width) solid var(--rule)",
															color: isSelected
																? "var(--ink)"
																: "var(--ink-muted)",
															fontSize: "var(--mono-size)",
															cursor: "pointer",
															textAlign: "left",
															width: "100%",
														}}
													>
														<span
															style={{
																display: "inline-flex",
																alignItems: "center",
																gap: "var(--space-base)",
															}}
														>
															<span
																style={{
																	width: "14px",
																	height: "14px",
																	border:
																		"var(--rule-width) solid " +
																		(isSelected
																			? "var(--ink)"
																			: "var(--rule-strong)"),
																	background: isSelected
																		? "var(--ink)"
																		: "var(--ground)",
																	display: "inline-flex",
																	alignItems: "center",
																	justifyContent: "center",
																	borderRadius: "var(--radius-control)",
																	flexShrink: 0,
																	color: "var(--ground)",
																	fontSize: "var(--mono-size)",
																	lineHeight: 1,
																	fontWeight: 600,
																}}
															>
																{isSelected ? "✓" : ""}
															</span>
															<span
																style={{
																	color: isSelected ? "var(--ink)" : "inherit",
																}}
															>
																#{tag.toUpperCase()}
															</span>
														</span>
														<span
															style={{
																color: "var(--ink-muted)",
															}}
														>
															({count})
														</span>
													</button>
												);
											})
										) : (
											<div
												style={{
													padding: "var(--space-base)",
													textAlign: "center",
													color: "var(--ink-muted)",
													fontSize: "var(--mono-size)",
												}}
												className="mono"
											>
												No tags match &ldquo;{tagSearch}&rdquo;
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* 3. Sort Selector */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "var(--space-base)",
								marginLeft: "auto",
								flexShrink: 0,
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
									borderRadius: "var(--radius-control)",
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

					{/* Active Tags Chips Strip */}
					{selectedTags.length > 0 && (
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								alignItems: "center",
								gap: "var(--space-base)",
								paddingTop: "var(--space-base)",
								borderTop: "var(--rule-width) solid var(--rule)",
							}}
						>
							<span className="meta" style={{ color: "var(--ink-muted)" }}>
								ACTIVE TAGS:
							</span>
							{selectedTags.map((tag) => (
								<span
									key={tag}
									className="mono"
									style={{
										background: "var(--ground)",
										border: "var(--rule-width) solid var(--rule-strong)",
										color: "var(--ink)",
										fontSize: "var(--mono-size)",
										padding: "0 var(--space-base)",
										height: "23px",
										borderRadius: "var(--radius-control)",
										display: "inline-flex",
										alignItems: "center",
										gap: "var(--space-base)",
									}}
								>
									#{tag.toUpperCase()}
									<button
										type="button"
										onClick={() => toggleTag(tag)}
										aria-label={`Remove tag ${tag}`}
										style={{
											background: "transparent",
											border: "none",
											color: "var(--ink-muted)",
											cursor: "pointer",
											padding: 0,
											fontSize: "var(--mono-size)",
											lineHeight: 1,
										}}
									>
										✕
									</button>
								</span>
							))}
							<button
								type="button"
								onClick={clearTags}
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
								Clear all tags
							</button>
						</div>
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
						}}
					>
						Reset filters
					</button>
				)}
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
									{post.tags.map((tag) => {
										const isSelected = selectedTags.includes(tag.toLowerCase());
										return (
											<button
												key={tag}
												type="button"
												onClick={(e) => {
													e.preventDefault();
													toggleTag(tag);
												}}
												className="mono"
												style={{
													background: isSelected
														? "var(--ink)"
														: "var(--ground)",
													border:
														"var(--rule-width) solid " +
														(isSelected ? "var(--ink)" : "var(--rule)"),
													color: isSelected
														? "var(--ground)"
														: "var(--ink-muted)",
													fontSize: "var(--mono-size)",
													padding: "1px var(--space-base)",
													cursor: "pointer",
													borderRadius: "var(--radius-control)",
												}}
											>
												{`#${tag}`}
											</button>
										);
									})}
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
