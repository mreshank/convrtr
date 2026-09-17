import Link from "next/link";
import type { CSSProperties } from "react";

export type BreadcrumbItem = {
	name: string;
	href?: string;
};

export type BreadcrumbsProps = {
	items: BreadcrumbItem[];
	className?: string;
	style?: CSSProperties;
};

/**
 * Accessible, semantic Breadcrumbs navigation primitive adhering to the
 * Dieter Rams-inspired brutalist typography system.
 *
 * Strictly zero emojis: uses simple geometric arrow indicators ('➔') and
 * uppercase monospace labels with Microdata for search engine rich results.
 */
export function Breadcrumbs({ items, className, style }: BreadcrumbsProps) {
	if (!items || items.length === 0) return null;

	return (
		<nav
			aria-label="Breadcrumb"
			data-breadcrumbs
			className={className}
			style={{
				display: "flex",
				alignItems: "center",
				...style,
			}}
		>
			<ol
				itemScope
				itemType="https://schema.org/BreadcrumbList"
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					gap: "var(--space-base)",
					listStyle: "none",
					margin: 0,
					padding: 0,
				}}
			>
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					const position = index + 1;
					const label = item.name.toUpperCase();

					return (
						<li
							key={`${item.name}-${position}`}
							itemProp="itemListElement"
							itemScope
							itemType="https://schema.org/ListItem"
							aria-current={isLast ? "page" : undefined}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "var(--space-base)",
							}}
						>
							{item.href && !isLast ? (
								<Link
									itemProp="item"
									href={item.href}
									className="mono"
									style={{
										fontSize: "var(--mono-size)",
										color: "var(--ink-muted)",
										textDecoration: "none",
										letterSpacing: "0.06em",
										transition: "color var(--dur-hover) var(--ease)",
									}}
								>
									<span itemProp="name">{label}</span>
								</Link>
							) : (
								<span
									itemProp="name"
									className="mono"
									style={{
										fontSize: "var(--mono-size)",
										color: isLast ? "var(--ink)" : "var(--ink-muted)",
										fontWeight: isLast ? 600 : 400,
										letterSpacing: "0.06em",
									}}
								>
									{label}
								</span>
							)}
							<meta itemProp="position" content={String(position)} />

							{!isLast && (
								<span
									aria-hidden="true"
									className="mono"
									style={{
										color: "var(--rule-strong)",
										fontSize: "var(--mono-size)",
										userSelect: "none",
									}}
								>
									➔
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
