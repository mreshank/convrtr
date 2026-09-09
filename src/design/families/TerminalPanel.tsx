type Tone = "ink" | "muted" | "accent";

type Line = {
	text: string;
	tone?: Tone;
};

type Props = {
	lines: Line[];
	/** Names the panel for assistive technology. */
	label: string;
};

const TONE: Record<Tone, string> = {
	ink: "var(--ink)",
	muted: "var(--ink-muted)",
	accent: "var(--accent)",
};

/**
 * v2's terminal and code panel, in GeistMono on the raised surface.
 *
 * v2 calls the mono family "the system's accent face, signaling 'developer
 * tool' wherever it appears -- in code panels, terminal timestamps, and the
 * CTA reading a shell command". This is the panel that claim describes, and it
 * is the first consumer of `--surface`: the migration declared that colour and
 * nothing used it, because there was no raised panel in the system yet.
 *
 * `tone: "accent"` is the code-token use of mint, which the palette rations
 * explicitly alongside CTA fills and the lossless ring. It colours text, never
 * a fill, so it stays clear of the pill-fill shape that means "action".
 *
 * One element per line rather than a single `white-space: pre` block, so the
 * line structure survives with no CSS -- which matters for a static export
 * whose stylesheet may not have arrived yet.
 *
 * `maxWidth: "var(--max-width)"` plus centring, matching every other band-level
 * family (`BranchDiagram`, `ComplianceRow`, `FeatureStrip`, `FeatureGrid`,
 * `ToolGrid`). Mounted directly on `/`'s home page (via `DotMatrix`, a grain
 * wrapper with no width opinion of its own -- capping there would wrongly
 * constrain `HeroBand`, the grain's other consumer, which already carries its
 * own cap), this band used to run the shell's full width while its neighbours
 * stopped at 1600px: the same inconsistency the gutter fix above exists to
 * remove, one width band up, visible only above 1600px where the cap binds.
 * `band-gutter.test.ts` now requires every band-level family to declare this
 * cap for exactly that reason.
 *
 * The cap lives on a wrapping `<div>`, not on the `<figure>` itself, even
 * though every other capped family puts `maxWidth` directly on its outermost
 * element. Those families' outermost element has no other job; this one's
 * does -- `padding: var(--gap-md)` here is the bordered panel's OWN inner
 * inset, not a gutter, and the task that added the cap is the same one that
 * taught this file to leave that inset alone. Landing `maxWidth` on the same
 * style object as that padding would make the two indistinguishable to
 * anything reading this file's source for "a capped element with its own
 * horizontal padding" -- which is exactly what `band-gutter.test.ts` does.
 * Keeping the cap on a separate, padding-free wrapper is what lets that guard
 * tell the two kinds of inset apart without needing to special-case this file
 * by name.
 *
 * A caller that later nests this panel inside a narrower measure (a prose
 * column, say) makes the cap a harmless no-op: `max-width` never forces a box
 * wider than its container allows, only narrower, so this renders correctly
 * at any container width the panel is given, cap engaged or not.
 */
export function TerminalPanel({ lines, label }: Props) {
	return (
		<div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
			{/* `<figure>`, not a role on a `<div>`: this is self-contained
			illustrative content referenced from the surrounding prose -- a
			static rendering of what a conversion does, not a live region and
			not a fieldset of form controls. Being a real semantic element
			gives it that meaning and its own implicit accessible-name wiring
			via `aria-label` for free, with nothing for `useSemanticElements`
			to flag. Tailwind's preflight zeroes the UA default margin on
			every element (`* { margin: 0 }`), so this carries none of
			`<figure>`'s historical default indent. */}
			<figure
				data-terminal
				aria-label={label}
				style={{
					background: "var(--surface)",
					// Longhands, not the `border` shorthand -- the same reason
					// SiteHeader.tsx and Hairline.tsx give: a shorthand whose parts
					// are all `var()` cannot be reparsed into its components, so it
					// round-trips through the CSSOM as
					// `var(--rule) var(--rule) var(--rule)` and no test can assert
					// on it.
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule-subtle)",
					padding: "var(--gap-md)",
					overflowX: "auto",
				}}
			>
				{lines.map((line, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: the text alone is not unique -- a real log repeats lines -- and the index alone loses identity when lines are prepended; the composite is the honest key.
						key={`${index}-${line.text}`}
						data-line
						className="mono"
						style={{
							color: TONE[line.tone ?? "ink"],
							fontSize: "var(--mono-size)",
							lineHeight: "var(--body-leading)",
							whiteSpace: "pre",
						}}
					>
						{line.text}
					</div>
				))}
			</figure>
		</div>
	);
}
