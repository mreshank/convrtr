"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
	type BroadcastMessage,
	dismissBroadcast,
	getActiveBroadcastsForPath,
	trackBroadcastClick,
	trackBroadcastImpression,
} from "@/lib/broadcasts";

export function BroadcastBanner() {
	const pathname = usePathname() || "/";
	const [activeBroadcasts, setActiveBroadcasts] = useState<BroadcastMessage[]>(
		[],
	);

	useEffect(() => {
		const list = getActiveBroadcastsForPath(pathname);
		setActiveBroadcasts(list);

		for (const item of list) {
			trackBroadcastImpression(item.id);
		}
	}, [pathname]);

	// Render the topmost active banner
	const banner = activeBroadcasts[0];
	if (!banner) return null;
	const activeBanner = banner;

	const handleDismiss = () => {
		dismissBroadcast(activeBanner.id);
		setActiveBroadcasts((prev) => prev.filter((b) => b.id !== activeBanner.id));
	};

	const handleClick = () => {
		trackBroadcastClick(activeBanner.id);
	};

	const isAccent = activeBanner.level === "accent";
	const isWarning = activeBanner.level === "warning";
	const isCritical = activeBanner.level === "critical";

	const borderColor = isCritical
		? "var(--rule-strong)"
		: isWarning
			? "var(--rule-strong)"
			: isAccent
				? "var(--accent)"
				: "var(--rule)";

	const badgeColor = isAccent ? "var(--accent)" : "var(--ink)";

	return (
		<aside
			aria-label="System announcement"
			style={{
				width: "100%",
				backgroundColor: "var(--ground)",
				borderBottomWidth: "var(--rule-width)",
				borderBottomStyle: "solid",
				borderBottomColor: borderColor,
				padding: "calc(var(--space-base) / 2) var(--gap-md)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "var(--space-base)",
				zIndex: 50,
				position: "relative",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "var(--space-base)",
					flexWrap: "wrap",
					flex: 1,
				}}
			>
				<span
					className="mono"
					style={{
						fontSize: "var(--mono-size)",
						color: badgeColor,
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						padding: "calc(var(--space-base) / 4) calc(var(--space-base) / 2)",
						borderRadius: "var(--radius-control)",
						letterSpacing: "0.06em",
						textTransform: "uppercase",
					}}
				>
					{activeBanner.title}
				</span>
				<span
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--mono-size)",
						fontFamily: "var(--font-mono)",
					}}
				>
					{activeBanner.content}
				</span>
				{activeBanner.cta && (
					<Link
						href={activeBanner.cta.href}
						onClick={handleClick}
						style={{
							color: "var(--ink)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							fontWeight: 600,
							textDecoration: "underline",
							textUnderlineOffset: "2px",
						}}
					>
						{activeBanner.cta.label}
					</Link>
				)}
			</div>

			{activeBanner.dismissible && (
				<button
					type="button"
					onClick={handleDismiss}
					aria-label="Dismiss announcement"
					style={{
						background: "transparent",
						border: "none",
						color: "var(--ink-muted)",
						cursor: "pointer",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						padding: "calc(var(--space-base) / 4)",
					}}
				>
					[×]
				</button>
			)}
		</aside>
	);
}
