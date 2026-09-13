"use client";

import { UserButton, useUser } from "@clerk/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Tooltip } from "@/design/primitives/Tooltip";
import { clerkAppearance } from "./clerk-theme";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function UserAvatarIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	);
}

function HistoryIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

function AuthIconButton({ hasSession = false }: { hasSession?: boolean }) {
	return (
		<Tooltip
			content={hasSession ? "Workspace Active — Manage Session" : "Sign In"}
			position="bottom"
		>
			<Link
				href="/auth"
				aria-label={hasSession ? "Manage active workspace session" : "Sign In"}
				style={{
					position: "relative",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
					width: "36px",
					height: "36px",
					borderRadius: "var(--radius-pill)",
					color: "var(--ink)",
					background: "transparent",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: hasSession ? "var(--rule-strong)" : "var(--rule)",
					transition:
						"border-color var(--dur-hover) var(--ease), background-color var(--dur-hover) var(--ease)",
				}}
			>
				<UserAvatarIcon />
				{hasSession && (
					<span
						aria-hidden="true"
						style={{
							position: "absolute",
							top: "calc(var(--space-base) / 2)",
							right: "calc(var(--space-base) / 2)",
							width: "var(--space-base)",
							height: "var(--space-base)",
							borderRadius: "var(--radius-pill)",
							backgroundColor: "var(--accent)",
						}}
					/>
				)}
			</Link>
		</Tooltip>
	);
}

function AuthenticatedMenu() {
	const { isSignedIn } = useUser();

	if (!isSignedIn) {
		return <AuthIconButton />;
	}

	return (
		<div
			style={{ display: "flex", alignItems: "center", gap: "var(--gap-sm)" }}
		>
			<Tooltip content="Conversion History" position="bottom">
				<Link
					href="/history"
					aria-label="View conversion history"
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						width: "36px",
						height: "36px",
						borderRadius: "var(--radius-pill)",
						color: "var(--ink-muted)",
						background: "transparent",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						transition:
							"border-color var(--dur-hover) var(--ease), color var(--dur-hover) var(--ease)",
					}}
				>
					<HistoryIcon />
				</Link>
			</Tooltip>
			<UserButton appearance={clerkAppearance} />
		</div>
	);
}

export function UserMenu() {
	const [hasLocalSession, setHasLocalSession] = useState(false);

	useEffect(() => {
		try {
			const session = localStorage.getItem("convrtr_workspace_session");
			if (session) setHasLocalSession(true);
		} catch {
			// Storage access error or unavailable in sandboxed frames
		}
	}, []);

	if (!PUBLISHABLE_KEY) {
		return <AuthIconButton hasSession={hasLocalSession} />;
	}

	return <AuthenticatedMenu />;
}
