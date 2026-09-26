import Link from "next/link";
import type { CategoryCard } from "@/app/home-content";

type Props = {
	cards: CategoryCard[];
};

function getCategoryIcon(category: string) {
	switch (category) {
		case "image":
			return (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<rect width="18" height="18" x="3" y="3" />
					<circle cx="9" cy="9" r="2" />
					<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
				</svg>
			);
		case "video":
			return (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
					<rect x="2" y="6" width="14" height="12" />
				</svg>
			);
		case "audio":
			return (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M2 10v3" />
					<path d="M6 6v11" />
					<path d="M10 3v18" />
					<path d="M14 8v7" />
					<path d="M18 5v13" />
					<path d="M22 10v3" />
				</svg>
			);
		case "document":
			return (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
					<path d="M14 2v4a2 2 0 0 0 2 2h4" />
					<path d="M10 9H8" />
					<path d="M16 13H8" />
					<path d="M16 17H8" />
				</svg>
			);
		case "data":
			return (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<ellipse cx="12" cy="5" rx="9" ry="3" />
					<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
					<path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
				</svg>
			);
		default:
			return (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<polyline points="21 8 21 21 3 21 3 8" />
					<rect x="1" y="3" width="22" height="5" />
					<line x1="10" y1="12" x2="14" y2="12" />
				</svg>
			);
	}
}

/**
 * WriteMate-style capability cards:
 * High-contrast dark cards with category SVG geometry, tool count badge,
 * description, live sample routes, and direct category links.
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
				gap: "var(--gap-sm)",
			}}
		>
			{cards.map((card) => (
				<article
					key={card.category}
					className="m3-surface-card flex flex-col gap-3 p-[var(--gap-sm)]"
					style={{
						backgroundColor: "var(--surface)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
						position: "relative",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "var(--space-base)",
								color: "var(--accent)",
							}}
						>
							{getCategoryIcon(card.category)}
							<span
								className="meta"
								style={{
									color: "var(--ink)",
									fontSize: "var(--mono-size)",
									fontWeight: 600,
									letterSpacing: "0.06em",
								}}
							>
								{card.label.toUpperCase()}
							</span>
						</div>
						<span
							className="mono px-1.5 py-0.5"
							style={{
								fontSize: "calc(var(--mono-size) * 0.85)",
								color: "var(--ink-muted)",
								backgroundColor: "var(--ground)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								borderRadius: "var(--radius-control)",
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
						className="mono inline-flex items-center gap-1"
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
