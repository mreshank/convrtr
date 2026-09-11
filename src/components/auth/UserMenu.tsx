"use client";

import { UserButton, useUser } from "@clerk/react";
import Link from "next/link";
import { clerkAppearance } from "./clerk-theme";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthenticatedMenu() {
	const { isSignedIn } = useUser();

	if (!isSignedIn) {
		return (
			<Link
				href="/auth"
				style={{
					display: "inline-flex",
					alignItems: "center",
					flexShrink: 0,
					height: "23px",
					padding: "0 14px",
					fontFamily: "var(--font-mono)",
					fontSize: "var(--mono-size)",
					color: "var(--ink)",
					textDecoration: "none",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					borderRadius: "var(--radius-control)",
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					transition: "border-color var(--dur-hover) var(--ease)",
				}}
			>
				Sign In
			</Link>
		);
	}

	return (
		<div
			style={{ display: "flex", alignItems: "center", gap: "var(--gap-sm)" }}
		>
			<Link
				href="/history"
				className="meta"
				style={{
					color: "var(--ink-muted)",
					textDecoration: "none",
					fontSize: "var(--mono-size)",
				}}
			>
				History
			</Link>
			<UserButton appearance={clerkAppearance} />
		</div>
	);
}

export function UserMenu() {
	if (!PUBLISHABLE_KEY) {
		return (
			<Link
				href="/auth"
				style={{
					display: "inline-flex",
					alignItems: "center",
					flexShrink: 0,
					height: "23px",
					padding: "0 14px",
					fontFamily: "var(--font-mono)",
					fontSize: "var(--mono-size)",
					color: "var(--ink)",
					textDecoration: "none",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					borderRadius: "var(--radius-control)",
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					transition: "border-color var(--dur-hover) var(--ease)",
				}}
			>
				Sign In
			</Link>
		);
	}

	return <AuthenticatedMenu />;
}
