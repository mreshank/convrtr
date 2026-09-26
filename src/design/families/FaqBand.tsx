import { CollapsibleSection } from "./CollapsibleSection";

type Props = {
	items: { question: string; answer: string }[];
};

/**
 * Asked constantly, answered without a sales team. Each answer states a
 * checkable fact (network guard, static export, service worker, registry)
 * rather than a reassurance. The first answer ships open; the rest disclose
 * on demand via the shared `CollapsibleSection`.
 *
 * Capped with no horizontal padding of its own: the shell owns the gutter,
 * the band owns only its cap.
 */
export function FaqBand({ items }: Props) {
	if (items.length === 0) return null;
	return (
		<div
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-base)",
			}}
		>
			{items.map((item, index) => (
				<CollapsibleSection
					key={item.question}
					heading={item.question}
					defaultOpen={index === 0}
				>
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--body-size)",
							lineHeight: 1.6,
							margin: 0,
							maxWidth: "65ch",
							padding: "var(--space-base) var(--gap-sm)",
						}}
					>
						{item.answer}
					</p>
				</CollapsibleSection>
			))}
		</div>
	);
}
