import type { ReactNode } from "react";
import {
	BranchDiagram,
	FusedHeadline,
	type ListingItem,
	ListingRows,
} from "@/design/families";

/**
 * One `ListingRows` worth of data, plus the optional heading that separates
 * it from a sibling section -- `/groups` needs two ("BY FORMAT", "BY TASK"),
 * `/blog` and `/collectives` need exactly one with no heading at all.
 */
export type ListingSection = {
	heading?: string;
	items: ListingItem[];
};

type Props = {
	/** Small mono label above the headline. Optional — not every hub needs one. */
	eyebrow?: string;
	/**
	 * A plain string for every hub but one. `ShowcasePage` passes the
	 * `{ lead, cont }` pair instead, for the one hub whose second sentence IS
	 * the reason the page exists -- a collective's `why`. Fusing it into the
	 * headline (see `FusedHeadline`) is what makes it lead the page rather
	 * than sit underneath as a lede a reader can skip past.
	 */
	title: string | { lead: string; cont: string };
	/** Optional because the fused-title hub above says everything `lede`
	 * would have said, inside the headline itself -- a second copy beneath
	 * it would be the same sentence twice. */
	lede?: string;
	/** v2's data-readout voice applied to a hub: "53 conversions". */
	count?: { value: number; noun: string };
	/**
	 * The conversion graph rooted at this hub, when it has one -- see
	 * `BranchDiagram`. Optional and handed over unconditionally: the family
	 * itself returns `null` for an empty `to` list, so a format with no
	 * outward branches (e.g. `svg`) still renders nothing here, with no
	 * emptiness check needed at either call site.
	 */
	branch?: { from: string; to: string[] };
	/**
	 * v2's ruled table of rows -- see `ListingRows`. `route-purity.test.ts`
	 * forbids a route (or a helper it renders) from importing
	 * `@/design/families` directly, so this is the slot a hub route uses to
	 * reach it: hand over data, and this template does the composing. One
	 * entry with no `heading` is the common case; more than one is a hub
	 * that lists more than one dimension, the way `/groups` lists tools by
	 * format and by task.
	 */
	sections?: ListingSection[];
	children?: ReactNode;
};

/**
 * The hub shape, shared by the tools index, each category, and the blog: an
 * eyebrow, a headline at the headline scale, a muted lede, an optional mono
 * count, then whatever listing the route resolves.
 *
 * The count is optional rather than derived, because not every hub has a total
 * worth stating — and a hub that invents one would be stating a number for the
 * sake of the shape.
 */
export function HubPage({
	eyebrow,
	title,
	lede,
	count,
	branch,
	sections,
	children,
}: Props) {
	return (
		<div
			data-hub
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			{eyebrow ? (
				<p className="meta" style={{ color: "var(--ink-muted)" }}>
					{eyebrow}
				</p>
			) : null}

			{typeof title === "string" ? (
				<h1
					style={{
						fontSize: "var(--headline-size)",
						fontWeight: 400,
						letterSpacing: "var(--headline-tracking)",
						lineHeight: "var(--display-leading)",
						color: "var(--ink)",
					}}
				>
					{title}
				</h1>
			) : (
				<FusedHeadline lead={title.lead} cont={title.cont} as="h1" />
			)}

			{lede ? (
				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						lineHeight: "var(--body-leading)",
					}}
				>
					{lede}
				</p>
			) : null}

			{count ? (
				<p data-count className="mono" style={{ color: "var(--ink-muted)" }}>
					{`${count.value} ${count.noun}`}
				</p>
			) : null}

			{branch ? <BranchDiagram from={branch.from} to={branch.to} /> : null}

			{sections?.map((section) => (
				<div
					key={section.heading ?? "listing"}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					{section.heading ? (
						<p className="meta" style={{ color: "var(--ink-muted)" }}>
							{section.heading}
						</p>
					) : null}
					{/*
					 * `ListingRows` caps and centres itself with its own
					 * `maxWidth: var(--max-width)` + `margin: "0 auto"` -- the
					 * same convention every other band-level family uses. That
					 * pairing only centres correctly in a plain BLOCK
					 * containing block: a flex item with auto cross-axis
					 * margins is exempted from `align-items: stretch` (the
					 * flex spec resolves those auto margins by absorbing the
					 * item down to its own content size, then centring THAT
					 * -- it does not stretch first), so `ListingRows` placed
					 * as a DIRECT child of this section's own `display: flex`
					 * column shrank to the width of its widest row instead of
					 * the section's full width, visibly on `/groups`, whose
					 * rows carry no description to force a wide row. This
					 * inert wrapper `div` is the same fix `EditorialPage`
					 * already relies on for every band it hosts -- each of
					 * ITS bands sits inside a plain `<div key={band.key}>`,
					 * never as a direct child of that shell's own flex
					 * column -- absorbing the flex-item position so the
					 * capped child measures itself against a normal block
					 * containing block instead.
					 */}
					<div>
						<ListingRows items={section.items} />
					</div>
				</div>
			))}

			{children}
		</div>
	);
}
