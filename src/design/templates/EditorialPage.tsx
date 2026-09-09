import type { ReactNode } from "react";

type Band = {
	/** Stable identity for the band, used as its React key. */
	key: string;
	node: ReactNode;
};

type Props = {
	hero: ReactNode;
	bands: Band[];
};

/**
 * The home shape: a hero band, then a sequence of content bands separated by
 * v2's section rhythm.
 *
 * The shell deliberately imposes **no** max-width. Each family carries its own
 * `var(--max-width)`, and the previous plan shipped a stub wrapper whose
 * `max-w-4xl` clamped the page to 896px — which made every one of those
 * declarations permanently dead, at any viewport, and left the bands 16px
 * apart instead of v2's 240px. Two tests pin both halves of that lesson.
 *
 * The narrow-viewport rhythm lives in `templates.css`: 240px between every band
 * is right at desktop and absurd at 375px, and a media query cannot be written
 * in a style object.
 *
 * The shell also owns the page's horizontal gutter, as `var(--gap-md)`
 * padding -- and padding only, never a `max-width` alongside it. Four bands
 * (`BranchDiagram`, `ComplianceRow`, `FeatureStrip`, `ToolGrid`) set only
 * `var(--max-width)` with no padding of their own, so below 1600px that cap
 * never bound and they ran flush to the viewport edge, while `HeroBand` and
 * `FormatStrip` carried their own horizontal padding and stayed inset. The
 * page read as inconsistent because it was: some bands touching the glass,
 * others not. One shell padding, applied once here, replaces those four
 * potential copies that would otherwise have to agree -- `band-gutter.test.ts`
 * guards both halves: that a capped band declares no horizontal padding of
 * its own, and that this shell does. A `max-width` here instead would eat its
 * own padding before any child's `var(--max-width)` got to measure against
 * it, which is the exact failure this file's own comment above already
 * records for the missing cap -- the same trap, the other property.
 */
export function EditorialPage({ hero, bands }: Props) {
	return (
		<div
			data-editorial
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--section-pad)",
				padding: "0 var(--gap-md)",
			}}
		>
			{hero}
			{bands.map((band) => (
				<div key={band.key}>{band.node}</div>
			))}
		</div>
	);
}
