"use client";

import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";
import { AuthErrorBoundary } from "./AuthErrorBoundary";
import { clerkAppearance } from "./clerk-theme";

const DUMMY_KEY = "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";
const PUBLISHABLE_KEY =
	process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || DUMMY_KEY;

type Props = {
	children: ReactNode;
};

export function AuthProvider({ children }: Props) {
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
