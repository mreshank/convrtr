import Link from "next/link";
import { CATEGORIES, type Category, getToolsByCategory } from "@/core/registry";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

const TOP_FORMATS: Record<Category, string[]> = {
	image: ["png", "webp", "jpg", "svg", "avif", "gif", "heic", "ico"],
	audio: ["wav", "mp3", "flac", "ogg", "m4a", "opus"],
	video: ["mp4", "webm", "mkv", "mov", "avi"],
	document: ["pdf", "markdown", "docx", "txt", "csv", "json"],
	data: ["json", "csv", "xml", "yaml", "sql"],
};

export function CategoryNavStrip({
	currentCategory,
}: {
	currentCategory: Category;
}) {
	const categoryStats = CATEGORIES.map((cat) => ({
		id: cat,
		label: `${cat.charAt(0).toUpperCase()}${cat.slice(1)}`,
		count: getToolsByCategory(cat).length,
		isCurrent: cat === currentCategory,
		href: `/${cat}`,
	}));

	const topFormats = TOP_FORMATS[currentCategory] ?? [];

	return (
		<div
			data-testid="category-nav-strip"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-sm)",
				marginBottom: "var(--gap-md)",
			}}
		>
			{/* All Categories Cross-Links */}
			<nav
				aria-label="File Categories"
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "var(--space-base)",
					alignItems: "center",
				}}
			>
				{categoryStats.map((cat) => {
					return (
						<Link
							key={cat.id}
							href={cat.href}
							aria-current={cat.isCurrent ? "page" : undefined}
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								padding: "var(--space-base) var(--gap-sm)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: cat.isCurrent
									? "var(--rule-strong)"
									: "var(--rule)",
								backgroundColor: cat.isCurrent
									? "var(--ground)"
									: "var(--surface)",
								color: cat.isCurrent ? "var(--ink)" : "var(--ink-muted)",
								fontWeight: cat.isCurrent ? 600 : 400,
								textDecoration: "none",
								borderRadius: "var(--radius-control)",
								display: "inline-flex",
								alignItems: "center",
								gap: "var(--space-base)",
								transition: "border-color var(--dur-hover) var(--ease)",
							}}
						>
							<span
								style={{
									color: cat.isCurrent ? "var(--accent)" : "var(--ink-muted)",
								}}
							>
								{cat.isCurrent ? "●" : "○"}
							</span>
							<span>{cat.label.toUpperCase()}</span>
							<span
								style={{
									fontSize: "11px",
									color: cat.isCurrent ? "var(--accent)" : "var(--ink-muted)",
								}}
							>
								({cat.count})
							</span>
						</Link>
					);
				})}
			</nav>

			{/* Top Formats for current category */}
			{topFormats.length > 0 && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						gap: "var(--space-base)",
						padding: "var(--space-base) var(--gap-sm)",
						border: "var(--rule-width) solid var(--rule)",
						backgroundColor: "var(--surface)",
					}}
				>
					<span
						className="meta"
						style={{
							fontSize: "11px",
							color: "var(--ink-muted)",
						}}
					>
						TOP FORMATS:
					</span>
					{topFormats.map((fmt) => (
						<Link
							key={fmt}
							href={`/groups/format/${fmt}`}
							className="mono"
							style={{
								fontSize: "11px",
								color: "var(--accent)",
								textDecoration: "none",
								padding: "1px var(--space-base)",
								border: "var(--rule-width) solid var(--rule)",
								borderRadius: "var(--radius-control)",
								display: "inline-flex",
								alignItems: "center",
								gap: "var(--space-base)",
							}}
						>
							<span>.{fmt.toUpperCase()}</span>
							<ArrowUpRight size={9} />
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
