import { Reveal } from "./Reveal";

type Props = {
	text: string;
	as?: "h1" | "h2";
};

/**
 * v2's display type: clamp(40px, 8vw, 68px), weight 400, -2.7px tracking,
 * 1.13 line height, assembled by a staggered per-character reveal.
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
				fontWeight: 400,
				letterSpacing: "var(--display-tracking)",
				lineHeight: "var(--display-leading)",
			}}
		>
			<Reveal text={text} by="char" />
		</Tag>
	);
}
