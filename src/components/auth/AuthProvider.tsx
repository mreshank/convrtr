"use client";

import { ClerkProvider, GoogleOneTap } from "@clerk/nextjs";
import type { ReactNode } from "react";
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
		<ClerkProvider
			publishableKey={PUBLISHABLE_KEY}
			appearance={clerkAppearance}
		>
			<GoogleOneTap cancelOnTapOutside={true} />
			{children}
		</ClerkProvider>
	);
}
