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
 */
export function EditorialPage({ hero, bands }: Props) {
	return (
		<div
			data-editorial
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--section-pad)",
			}}
		>
			{hero}
			{bands.map((band) => (
				<div key={band.key}>{band.node}</div>
			))}
		</div>
	);
}
