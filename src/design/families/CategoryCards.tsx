import Link from "next/link";
import type { CategoryCard } from "@/app/home-content";

type Props = {
	cards: CategoryCard[];
};

/**
 * The capability cards: one per file family, each with its live tool count
 * and three real sample routes from the registry. This is the honest
 * version of the template capability grid ("Blog Writer", "Email Writer"):
 * nobody wakes up wanting a transcoder, so the page starts from the job --
 * the photo, the clip, the dataset -- and every route shown is a tool that
 * exists, linked to its own page.
 *
 * Capped with no horizontal padding of its own: the shell owns the gutter,
 * the band owns only its cap.
 */
export function CategoryCards({ cards }: Props) {
	if (cards.length === 0) return null;
	return (
		<div
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
				gap: "var(--space-base)",
			}}
		>
			{cards.map((card) => (
				<article
					key={card.category}
					className="m3-surface-card flex flex-col gap-2 p-[var(--gap-sm)]"
					style={{ backgroundColor: "var(--ground)" }}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "baseline",
						}}
					>
						<span
							className="meta"
							style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
						>
							{card.label.toUpperCase()}
						</span>
						<span
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
							}}
						>
							{card.count} {card.count === 1 ? "TOOL" : "TOOLS"}
						</span>
					</div>
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: 0,
							lineHeight: 1.5,
						}}
					>
						{card.blurb}
					</p>
					<ul
						aria-label={`Sample ${card.label} conversions`}
						style={{
							listStyle: "none",
							margin: 0,
							paddingLeft: 0,
							paddingRight: 0,
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
							borderTopWidth: "var(--rule-width)",
							borderTopStyle: "solid",
							borderTopColor: "var(--rule-subtle)",
							paddingTop: "var(--space-base)",
							marginTop: "calc(var(--space-base) / 2)",
						}}
					>
						{card.samples.map((sample) => (
							<li key={`${sample.from}-${sample.to}`}>
								<Link
									href={sample.href}
									className="mono"
									style={{
										fontSize: "var(--mono-size)",
										color: "var(--ink)",
										textDecoration: "underline",
										textUnderlineOffset: "3px",
										textDecorationColor: "var(--rule-strong)",
									}}
								>
									{sample.from.toUpperCase()} ➔ {sample.to.toUpperCase()}
								</Link>
							</li>
						))}
					</ul>
					<Link
						href={`/tools?category=${card.category}`}
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--accent)",
							textDecoration: "none",
							marginTop: "auto",
							paddingTop: "var(--space-base)",
						}}
					>
						ALL {card.label.toUpperCase()} TOOLS ➔
					</Link>
				</article>
			))}
		</div>
	);
}
