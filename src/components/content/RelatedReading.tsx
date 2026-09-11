import Link from "next/link";
import type { BlogPostMeta } from "@/content/blog/types";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

function formatDateline(iso: string): string {
	const [year, month, day] = iso.split("-").map(Number);
	if (!year || !month || !day) return iso;
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function estimateReadingTime(description: string): string {
	const words = description.split(/\s+/).length * 15;
	const mins = Math.max(3, Math.min(8, Math.round(words / 200)));
	return `${mins} MIN READ`;
}

export function RelatedReading({ posts }: { posts: BlogPostMeta[] }) {
	if (posts.length === 0) return null;

	return (
		<section
			data-testid="related-reading"
			className="mx-auto flex w-full max-w-[var(--converter-width,896px)] flex-col gap-5 pt-8 pb-10"
			style={{
				borderTop: "var(--rule-width) solid var(--rule)",
			}}
		>
			{/* Header bar */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<span
						className="mono text-[10px] tracking-[0.08em] px-2 py-0.5 border"
						style={{
							borderColor: "var(--rule-strong)",
							color: "var(--accent)",
							background: "var(--surface)",
							borderRadius: "var(--radius)",
						}}
					>
						[ ARCHIVE & GUIDES ]
					</span>
					<h2
						className="text-[18px] font-normal tracking-[-0.01em]"
						style={{ color: "var(--ink)" }}
					>
						Related reading
					</h2>
				</div>

				<Link
					href="/blog"
					className="mono text-[11px] inline-flex items-center gap-1 transition-colors hover:underline"
					style={{ color: "var(--ink-muted)" }}
				>
					<span>All guides</span>
					<ArrowUpRight size={12} />
				</Link>
			</div>

			{/* Responsive Card Grid */}
			<div
				className={`grid gap-4 w-full ${
					posts.length === 1
						? "grid-cols-1"
						: posts.length === 2
							? "grid-cols-1 md:grid-cols-2"
							: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
				}`}
			>
				{posts.map((post) => {
					const dateline = formatDateline(post.publishedAt);
					const readingTime = estimateReadingTime(post.description);

					return (
						<article
							key={post.slug}
							className="group relative flex flex-col justify-between border p-5 transition-all duration-200 hover:-translate-y-0.5"
							style={{
								borderColor: "var(--rule)",
								borderRadius: "var(--radius)",
								background: "var(--surface)",
							}}
						>
							{/* Technical blueprint corner markers */}
							<span
								className="absolute top-1.5 left-1.5 text-[9px] select-none pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity"
								style={{ color: "var(--rule-strong)" }}
							>
								┌
							</span>
							<span
								className="absolute top-1.5 right-1.5 text-[9px] select-none pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity"
								style={{ color: "var(--rule-strong)" }}
							>
								┐
							</span>

							<div className="flex flex-col gap-2.5">
								{/* Dateline & reading time */}
								<div className="flex items-center justify-between gap-2">
									<span
										className="mono text-[11px]"
										style={{ color: "var(--ink-muted)" }}
									>
										{dateline}
									</span>
									<span
										className="meta inline-flex items-center gap-1 text-[10px]"
										style={{ color: "var(--accent)" }}
									>
										<span aria-hidden="true">●</span>
										<span>{readingTime}</span>
									</span>
								</div>

								{/* Title with link */}
								<h3
									className="text-[15px] font-medium leading-snug tracking-[-0.01em]"
									style={{ color: "var(--ink)" }}
								>
									<Link
										href={`/blog/${post.slug}`}
										className="inline-flex items-baseline gap-1.5 transition-colors group-hover:text-[var(--accent)]"
									>
										<span>{post.title}</span>
										<ArrowUpRight
											size={13}
											className="shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
										/>
									</Link>
								</h3>

								{/* Description excerpt */}
								{post.description && (
									<p
										className="text-[13px] leading-relaxed line-clamp-2"
										style={{ color: "var(--ink-muted)" }}
									>
										{post.description}
									</p>
								)}
							</div>

							{/* Card footer: Tags */}
							{post.tags && post.tags.length > 0 && (
								<div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-[var(--rule)]">
									{post.tags.slice(0, 3).map((tag) => (
										<span
											key={tag}
											className="mono text-[10px] px-1.5 py-0.5"
											style={{
												background: "var(--ground)",
												border: "var(--rule-width) solid var(--rule)",
												borderRadius: "var(--radius)",
												color: "var(--ink-muted)",
											}}
										>
											#{tag.toLowerCase()}
										</span>
									))}
								</div>
							)}
						</article>
					);
				})}
			</div>
		</section>
	);
}
