import { Marquee } from "@/design/primitives";

type Props = {
	formats: string[];
};

/**
 * v2's scrolling logo rail, adapted to a product that has no customer logos.
 *
 * The honest equivalent of "the companies we work with" here is "the formats
 * we speak": every extension the registry accepts or emits, derived at build
 * time. Same component anatomy, same continuous scroll, real content, and it
 * cannot drift from the product as tools are added. Inventing logos would be
 * fabrication on a page whose entire claim is that it can be checked.
 *
 * The scroll comes from the existing `Marquee` primitive rather than a second
 * implementation. That primitive already duplicates its track for a seamless
 * loop, marks the duplicate `aria-hidden` and `inert` so a keyboard user
 * cannot tab into a copy, and is covered by the reduced-motion pause keyed on
 * `[data-marquee]`. Reimplementing any of that here would duplicate four
 * solved problems and break the DRY rule the spec states as enforceable.
 */
export function FormatStrip({ formats }: Props) {
	if (formats.length === 0) return null;

	return (
		// The declared full-bleed exemption from `EditorialPage`'s shell gutter
		// -- named in `band-gutter.test.ts` rather than left for a broad
		// pattern to miss. Every other band wants the shell's inset; this one
		// is v2's continuous scroll, and a rail that stops short of the glass
		// on both edges reads as paused, not scrolling. Cancelling the shell's
		// own `var(--gap-md)` padding with the equal-and-opposite negative
		// margin restores true edge-to-edge bleed for this band alone, without
		// this band or `EditorialPage` needing to know about each other's
		// exact value -- they already agree, because they both read the same
		// token.
		<div style={{ marginInline: "calc(var(--gap-md) * -1)" }}>
			<Marquee ariaLabel="Supported file formats">
				{formats.map((format) => (
					<span
						key={format}
						className="meta"
						style={{
							color: "var(--ink-muted)",
							padding: "0 var(--gap-md)",
							whiteSpace: "nowrap",
						}}
					>
						{format.toUpperCase()}
					</span>
				))}
			</Marquee>
		</div>
	);
}
