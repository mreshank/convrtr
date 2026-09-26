import { PillLink } from "@/design/primitives/PillLink";
import { CHROME_EXTENSION_URL } from "@/lib/site";
import { FusedHeadline } from "./FusedHeadline";

type Props = {
	eyebrow: string;
	title: { lead: string; cont: string };
	lede: string;
};

/**
 * The closing call to action: one last headline, both doors in. Converting
 * starts in the tab with no sign-up; the extension moves the same engine
 * beside every tab. Nothing here asks for anything -- there is nothing to
 * give.
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
				gap: "var(--gap-sm)",
				borderTopWidth: "var(--rule-width)",
				borderTopStyle: "solid",
				borderTopColor: "var(--rule)",
				paddingTop: "var(--gap-md)",
			}}
		>
			<p className="meta" style={{ color: "var(--accent)", margin: 0 }}>
				{eyebrow}
			</p>
			<FusedHeadline as="h2" lead={title.lead} cont={title.cont} />
			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: 1.6,
					margin: 0,
					maxWidth: "65ch",
				}}
			>
				{lede}
			</p>
			<div
				style={{
					display: "flex",
					gap: "var(--space-base)",
					flexWrap: "wrap",
					marginTop: "var(--space-base)",
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
