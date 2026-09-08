type Props = {
	/** The input extension, e.g. "heic". */
	from: string;
	/** Every output reachable from it. */
	to: string[];
};

/**
 * The `d` attribute for one branch: a trunk along the vertical centre, an
 * elbow at the horizontal midpoint, then a run out to the right edge at the
 * middle of this branch's own horizontal band.
 *
 * Exported and pure so its arithmetic can be tested directly. That is not
 * incidental: happy-dom parses a `d` attribute and renders nothing, so a test
 * asserting the path exists, or is non-empty, passes for every wrong path
 * there is. Checking the numbers is the only assertion with teeth here.
 */
export function branchPath(
	index: number,
	count: number,
	width: number,
	height: number,
): string {
	const mid = height / 2;
	const elbow = width / 2;
	const band = height / count;
	const y = band * index + band / 2;

	return `M 0 ${mid} H ${elbow} V ${y} H ${width}`;
}

const WIDTH = 240;
const HEIGHT = 120;

/**
 * v2's branching-line graphic, carrying the conversion graph.
 *
 * v2 asks for "branching diagram lines" and "a fine branching-line network
 * graphic". The honest content for this product is the registry's own graph:
 * an input extension really does branch to the outputs reachable from it, so
 * the drawing means something instead of decorating the page.
 *
 * The format names are real text beside the drawing, and the `<svg>` is
 * `aria-hidden`. The lines are geometry; the labels are the content, and a
 * screen reader should get the second without the first.
 */
export function BranchDiagram({ from, to }: Props) {
	if (to.length === 0) return null;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "var(--gap-sm)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			<span className="meta" style={{ color: "var(--ink)" }}>
				{from.toUpperCase()}
			</span>

			<svg
				aria-hidden="true"
				width={WIDTH}
				height={HEIGHT}
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				style={{ flexShrink: 0, overflow: "visible" }}
			>
				{to.map((output, index) => (
					<path
						key={output}
						d={branchPath(index, to.length, WIDTH, HEIGHT)}
						stroke="var(--rule)"
						strokeWidth="1"
						fill="none"
					/>
				))}
			</svg>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-around",
					height: `${HEIGHT}px`,
				}}
			>
				{to.map((output) => (
					<span
						key={output}
						className="meta"
						style={{ color: "var(--ink-muted)" }}
					>
						{output.toUpperCase()}
					</span>
				))}
			</div>
		</div>
	);
}
