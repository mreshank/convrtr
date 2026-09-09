import { LiveDemo } from "@/components/instrument/LiveDemo";
import type { Category, QualityPreset } from "@/core/registry";
import { ListingRows } from "@/design/families";
import { MonoMeta } from "@/design/primitives";
import { HubPage } from "./HubPage";

export type ShowcaseTool = {
	id: string;
	href: string;
	name: string;
	category: Category;
	fromExt: string;
	toExt: string;
};

/** "audio" -> "Audio" -- the same capitalisation `/groups` already gives a
 * category when it appears as a reader-facing word rather than a token. */
function label(category: Category): string {
	return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

type Props = {
	eyebrow?: string;
	title: string;
	/**
	 * The set's reason for existing -- a collective's `why`, the thing that
	 * separates it from a group. Fused into `HubPage`'s headline as the
	 * muted continuation, rather than handed over as a plain `lede`: a group
	 * is mechanical and needs no justification, but a collective's whole
	 * claim rests on this sentence, so it has to lead the page, not follow
	 * the title as an afterthought a reader can skip.
	 */
	reason: string;
	count?: { value: number; noun: string };
	/** Spec §8.4: a ruled list of the set's member tools, each linking to its
	 * own converter. Used above the demo, never in place of it. */
	showcase: ShowcaseTool[];
	/** Spec §8.1: at most one real, on-demand conversion per page. Omitted
	 * entirely when a set has nothing this repo can generate an honest
	 * sample for.
	 *
	 * `presetId` is optional and defaults to the tool's own `defaultPreset`
	 * when omitted -- but a collective whose `why` stakes a claim on a
	 * specific preset (I4: podcast-kit's WAV normaliser demo has to run the
	 * "Podcast (-16 LUFS)" preset its own prose names, not whichever preset
	 * happens to be that tool's default) needs a way to pin one, or the
	 * page's interactive proof can never match the page's own sentence. */
	demo?: { toolId: string; sampleId: string; presetId?: QualityPreset };
};

/**
 * `HubPage` plus spec §8.4's showcase band and §8.1's demo slot — the shape
 * shared by every group and collective page: an eyebrow, a headline that
 * fuses the title with its `reason` (from `HubPage`), `ListingRows` for the
 * set's tools, and at most one `LiveDemo` beneath it.
 *
 * `title`/`reason` reach `HubPage` as one fused-headline pair rather than a
 * title-plus-lede, so the reason is the second clause of the headline
 * itself, not a paragraph a reader can scroll past before reading it.
 *
 * The showcase band is deliberately inert — every row is a `Link`, nothing
 * here fetches or converts. `LiveDemo` is the one place on this page a real
 * conversion can happen, and only on a user's click.
 */
export function ShowcasePage({
	eyebrow,
	title,
	reason,
	count,
	showcase,
	demo,
}: Props) {
	return (
		<HubPage
			eyebrow={eyebrow}
			title={{ lead: title, cont: reason }}
			count={count}
		>
			<section
				aria-label="Tools in this set"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<MonoMeta as="p">Member tools</MonoMeta>
				{/*
				 * Wrapped in a plain `div`, not a direct child of this section's own
				 * `display: flex` column -- `HubPage`'s identical comment on its own
				 * `ListingRows` call explains why: a flex item with auto cross-axis
				 * margins absorbs to its content width instead of stretching, so
				 * `ListingRows`'s self-centring `max-width` + `margin: 0 auto` only
				 * measures against the section's full width from inside a normal
				 * block containing block.
				 */}
				<div>
					<ListingRows
						items={showcase.map((tool) => ({
							href: tool.href,
							title: tool.name,
							meta: `${tool.fromExt.toUpperCase()} → ${tool.toExt.toUpperCase()}`,
							description: label(tool.category),
						}))}
					/>
				</div>
			</section>

			{demo ? (
				<section
					aria-label="Live demo"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					<MonoMeta as="p">Try it</MonoMeta>
					{/*
					 * C1: `LiveDemo` used to render straight into `HubPage`'s
					 * content column with no width of its own, inheriting the
					 * full column instead of a cell -- 1232px against a sibling
					 * tile's 296px at 1280px, four times over. The showcase
					 * tiles above are sized by this same grid; putting the demo
					 * in one grid cell too, rather than leaving it un-gridded,
					 * is what makes it read as part of the same composition
					 * instead of a break in it. `col-span-2` gives it a cell
					 * twice a tile's width -- deliberately roomier, since it
					 * carries a readout and a button a plain tile does not,
					 * but still a bounded cell in the tiles' own grid, not the
					 * whole column.
					 */}
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<div className="col-span-2">
							<LiveDemo
								toolId={demo.toolId}
								sampleId={demo.sampleId}
								presetId={demo.presetId}
							/>
						</div>
					</div>
				</section>
			) : null}
		</HubPage>
	);
}
