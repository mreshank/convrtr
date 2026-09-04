import { Reveal } from "./Reveal";

type Props = {
	text: string;
	as?: "h1" | "h2";
};

/**
 * DESIGN.md's display type: 12vw, weight 700, -0.05em tracking, 0.9 line
 * height, assembled by a staggered per-character reveal.
 *
 * The heading element is real and carries the text as its accessible name
 * via Reveal, so the character split never reaches assistive technology.
 * Size and metrics come from tokens rather than literals so a change to
 * the display scale is one edit in one file.
 */
export function DisplayHeadline({ text, as: Tag = "h1" }: Props) {
	return (
		<Tag
			style={{
				fontSize: "var(--display-size)",
				fontWeight: 700,
				letterSpacing: "var(--tracking-display)",
				lineHeight: "var(--leading-display)",
			}}
		>
			<Reveal text={text} by="char" />
		</Tag>
	);
}
