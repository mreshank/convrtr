"use client";

import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";
import { AuthErrorBoundary } from "./AuthErrorBoundary";
import { clerkAppearance } from "./clerk-theme";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Props = {
	children: ReactNode;
};

export function AuthProvider({ children }: Props) {
	if (!PUBLISHABLE_KEY) {
		// When no Clerk key is configured (e.g. local test runs, CI),
		// render children directly so the site never crashes.
		return <>{children}</>;
	}

	return (
		<AuthErrorBoundary fallback={children}>
			<ClerkProvider
				publishableKey={PUBLISHABLE_KEY}
				appearance={clerkAppearance}
			>
				{children}
			</ClerkProvider>
		</AuthErrorBoundary>
	);
}
