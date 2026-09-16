import type { BlogPostStatus } from "@/content/blog/types";

export function PostStatusBanner({ status }: { status?: BlogPostStatus }) {
	const isUnderReview = status === "under-review";
	const isDraft = status === "draft";

	if (isUnderReview) {
		return (
			<aside
				role="status"
				aria-label="Content under review"
				style={{
					padding: "var(--gap-sm) var(--gap-md)",
					background: "var(--surface)",
					border: "var(--rule-width) dashed var(--ink)",
					borderRadius: "var(--radius)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
					marginBottom: "var(--gap-md)",
				}}
			>
				<span
					className="meta mono"
					style={{
						color: "var(--accent)",
						fontSize: "11px",
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						display: "inline-flex",
						alignItems: "center",
						gap: "calc(var(--space-base) / 2)",
					}}
				>
					<span aria-hidden="true" className="font-mono">
						[!]
					</span>{" "}
					Under Review
				</span>
				<p
					style={{
						margin: 0,
						fontSize: "14px",
						lineHeight: "1.5",
						color: "var(--ink)",
					}}
				>
					This article is private and currently undergoing editorial review for
					content quality and accuracy. It is not listed in the public blog
					index.
				</p>
			</aside>
		);
	}

	if (isDraft) {
		return (
			<aside
				role="status"
				aria-label="Draft article"
				style={{
					padding: "var(--gap-sm) var(--gap-md)",
					background: "var(--surface)",
					border: "var(--rule-width) dashed var(--rule-strong)",
					borderRadius: "var(--radius)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
					marginBottom: "var(--gap-md)",
				}}
			>
				<span
					className="meta mono"
					style={{
						color: "var(--ink-muted)",
						fontSize: "11px",
						letterSpacing: "0.08em",
						textTransform: "uppercase",
					}}
				>
					Draft
				</span>
				<p
					style={{
						margin: 0,
						fontSize: "14px",
						lineHeight: "1.5",
						color: "var(--ink-muted)",
					}}
				>
					This article is a draft and is not published.
				</p>
			</aside>
		);
	}

	return null;
}
