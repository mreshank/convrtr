type Props = {
	size?: number;
	className?: string;
};

/**
 * The hover-revealed glyph DESIGN.md places top-right of a grid item.
 *
 * Drawn in `currentColor` rather than a token so it follows whatever ground
 * it is placed on — including an inverted one, where the footer redefines
 * `--ink` locally and a hardcoded token would point at the wrong value.
 *
 * Decorative: the item's own link already names its destination.
 */
export function ArrowUpRight({ size = 24, className }: Props) {
	return (
		<svg
			data-arrow
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			className={className}
		>
			<path
				d="M7 17 L17 7 M17 7 H8 M17 7 V16"
				stroke="currentColor"
				strokeWidth="1"
			/>
		</svg>
	);
}
