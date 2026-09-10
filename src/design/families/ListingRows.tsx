import Link from "next/link";
import { parseToolTitle } from "@/lib/format";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

export type ListingItem = {
	href: string;
	title: string;
	/** A mono data readout -- a publish date, a tool count. Omitted columns render nothing, not an empty cell. */
	meta?: string;
	description?: string;
};

type Props = {
	items: ListingItem[];
};

/**
 * v2's ruled table of rows -- the shape `/blog`, `/groups` and `/collectives`
 * all need and none of them had. The defect this replaces was two Tailwind
 * arbitrary values (`text-[18px]`, `text-[14px]`) bypassing the type scale
 * entirely, under a browser-default `underline` that is not this system's
 * link treatment. Neither survives here: title and description are set from
 * `--label-size` and `--body-size`, and the link carries no text-decoration
 * at all.
 *
 * Each row is one `<a>`, not a `<div>` holding a smaller link -- v2's "ruled
 * dividers" and "table-like structure" describe a row as the unit a reader
 * clicks, and a 200px title link inside a 1200px row would be a needlessly
 * small target. `data-arrow-host` sits on that same `<a>`, so the hover/
 * focus-within rule in `primitives.css` needs nothing extra to reach it:
 * `:focus-within` matches an element that is ITSELF focused, not only one
 * with a focused descendant, so tabbing onto the row directly still reveals
 * the arrow.
 *
 * The hairline lives in `families.css`, between rows and never around them --
 * the identical shape `FeatureGrid`'s divider rules already solved for a
 * grid rather than a stack: a top border on every row but the first, so the
 * union is 0 borders on row 1 and one border between every subsequent pair.
 * A border on every row would double each interior line and draw an outer
 * frame nothing here asks for.
 *
 * The outer element declares its own `var(--max-width)` cap with no
 * horizontal padding on that same object, per `band-gutter.test.ts`'s rule
 * for every band-level family: the hub shell that hosts this already owns
 * the horizontal gutter, so a second one here would double it.
 */
export function ListingRows({ items }: Props) {
	return (
		<div
			data-listing-rows
			style={{
				display: "flex",
				flexDirection: "column",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{items.map((item) => (
				<Link
					key={item.href}
					href={item.href}
					data-row
					data-arrow-host
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "var(--gap-md)",
						padding: "var(--gap-sm) 0",
						color: "var(--ink)",
						textDecoration: "none",
					}}
				>
					<span
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						{(() => {
							const { primary, secondary } = parseToolTitle(item.title);
							return (
								<span
									data-title
									style={{
										fontSize: "var(--label-size)",
										fontWeight: "var(--label-weight)",
										letterSpacing: "var(--label-tracking)",
										color: "var(--ink)",
									}}
								>
									<span>{primary}</span>
									{secondary ? (
										<span
											style={{
												fontSize: "12px",
												fontWeight: 400,
												color: "var(--ink-muted)",
												opacity: 0.65,
											}}
										>
											{secondary}
										</span>
									) : null}
								</span>
							);
						})()}
						{item.description ? (
							<span
								style={{
									fontSize: "var(--body-size)",
									lineHeight: "var(--body-leading)",
									color: "var(--ink-muted)",
								}}
							>
								{item.description}
							</span>
						) : null}
					</span>
					<span
						style={{
							display: "flex",
							alignItems: "center",
							gap: "var(--gap-sm)",
							flexShrink: 0,
						}}
					>
						{item.meta ? (
							<span
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								{item.meta}
							</span>
						) : null}
						<ArrowUpRight size={16} />
					</span>
				</Link>
			))}
		</div>
	);
}
