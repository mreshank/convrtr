import { PillLink } from "@/design/primitives/PillLink";
import { CHROME_EXTENSION_URL } from "@/lib/site";
import { FusedHeadline } from "./FusedHeadline";

type Props = {
	eyebrow: string;
	title: { lead: string; cont: string };
	lede: string;
};

/**
 * WriteMate-style closing call to action:
 * Centered ambient glowing card with bold fused headline, clear lede, and
 * twin doors in. Converting starts in the tab with no sign-up; the extension
 * docks the engine beside every page.
 *
 * Capped with no horizontal padding of its own: the shell owns the gutter,
 * the band owns only its cap.
 */
export function FinalCta({ eyebrow, title, lede }: Props) {
	return (
		<div
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				textAlign: "center",
				gap: "var(--gap-sm)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				borderRadius: "var(--radius)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-lg) 0",
				position: "relative",
				overflow: "hidden",
			}}
		>
			<p
				className="meta"
				style={{
					color: "var(--accent)",
					margin: 0,
					letterSpacing: "0.08em",
				}}
			>
				{eyebrow}
			</p>
			<FusedHeadline as="h2" lead={title.lead} cont={title.cont} />
			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: 1.6,
					margin: 0,
					maxWidth: "50ch",
				}}
			>
				{lede}
			</p>
			<div
				style={{
					display: "flex",
					gap: "var(--space-base)",
					flexWrap: "wrap",
					justifyContent: "center",
					marginTop: "var(--gap-sm)",
				}}
			>
				<PillLink href="/convert" variant="fill">
					Start converting
				</PillLink>
				<PillLink href={CHROME_EXTENSION_URL} variant="outline" external>
					Install the extension ↗
				</PillLink>
			</div>
		</div>
	);
}
