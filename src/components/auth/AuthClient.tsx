"use client";

import { SignIn, SignUp, useUser } from "@clerk/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { clerkAppearance } from "./clerk-theme";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthenticatedActiveSession() {
	const { isSignedIn, user } = useUser();

	if (!isSignedIn || !user) return null;

	return (
		<div
			style={{
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				width: "100%",
				maxWidth: "calc(var(--section-pad) * 2)",
				margin: "0 auto",
			}}
		>
			<div>
				<p
					className="meta"
					style={{
						color: "var(--accent)",
						marginBottom: "calc(var(--space-base) / 2)",
					}}
				>
					SESSION ACTIVE
				</p>
				<h2
					style={{
						fontSize: "var(--headline-size)",
						letterSpacing: "var(--headline-tracking)",
						fontWeight: 400,
					}}
				>
					Signed in as{" "}
					{user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "User"}
				</h2>
				<p
					style={{ color: "var(--ink-muted)", marginTop: "var(--space-base)" }}
				>
					Your account is active. Cross-device conversion history and saved
					presets are automatically synchronized.
				</p>
			</div>

			<div style={{ display: "flex", gap: "var(--gap-sm)", flexWrap: "wrap" }}>
				<Link
					href="/history"
					style={{
						display: "inline-flex",
						alignItems: "center",
						padding: "var(--space-base) var(--gap-sm)",
						borderRadius: "var(--radius-pill)",
						backgroundColor: "var(--ink)",
						color: "var(--ground)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						fontWeight: 600,
						textTransform: "uppercase",
						letterSpacing: "0.08em",
					}}
				>
					View History
				</Link>
				<Link
					href="/convert"
					style={{
						display: "inline-flex",
						alignItems: "center",
						padding: "var(--space-base) var(--gap-sm)",
						borderRadius: "var(--radius-pill)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						color: "var(--ink)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						textTransform: "uppercase",
						letterSpacing: "0.08em",
					}}
				>
					Start Converting
				</Link>
			</div>
		</div>
	);
}

function AuthFormTabs() {
	const searchParams = useSearchParams();
	const initialTab =
		searchParams.get("mode") === "signup" ? "signup" : "signin";
	const [tab, setTab] = useState<"signin" | "signup">(initialTab);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				maxWidth: "calc(var(--section-pad) * 2)",
				margin: "0 auto",
				width: "100%",
			}}
		>
			{/* Account Perks Strip */}
			<div
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-md)",
				}}
			>
				<p
					className="meta"
					style={{
						color: "var(--accent)",
						fontSize: "var(--mono-size)",
						letterSpacing: "0.1em",
						textTransform: "uppercase",
						marginBottom: "var(--gap-sm)",
					}}
				>
					AUTHENTICATED WORKSPACE CAPABILITIES
				</p>
				<ul
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
						color: "var(--ink-muted)",
						fontSize: "var(--mono-size)",
						margin: 0,
						padding: 0,
						listStyle: "none",
					}}
				>
					<li
						style={{
							display: "flex",
							alignItems: "baseline",
							gap: "var(--space-base)",
						}}
					>
						<span
							style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
						>
							[+]
						</span>
						<span>
							<strong style={{ color: "var(--ink)" }}>
								30-Day Audit History:
							</strong>{" "}
							Sync past conversion metadata across browsers.
						</span>
					</li>
					<li
						style={{
							display: "flex",
							alignItems: "baseline",
							gap: "var(--space-base)",
						}}
					>
						<span
							style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
						>
							[+]
						</span>
						<span>
							<strong style={{ color: "var(--ink)" }}>
								High Batch Concurrency:
							</strong>{" "}
							Unlock expanded 50+ file parallel worker queues.
						</span>
					</li>
					<li
						style={{
							display: "flex",
							alignItems: "baseline",
							gap: "var(--space-base)",
						}}
					>
						<span
							style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
						>
							[+]
						</span>
						<span>
							<strong style={{ color: "var(--ink)" }}>
								Local-First Privacy:
							</strong>{" "}
							Conversions always execute 100% inside your browser. Zero bytes
							uploaded.
						</span>
					</li>
				</ul>
			</div>

			{/* Tab Switcher */}
			<div
				style={{
					display: "flex",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--ground)",
				}}
			>
				<button
					type="button"
					onClick={() => setTab("signin")}
					style={{
						flex: 1,
						padding: "var(--space-base) var(--gap-sm)",
						backgroundColor:
							tab === "signin" ? "var(--surface)" : "transparent",
						color: tab === "signin" ? "var(--ink)" : "var(--ink-muted)",
						border: "none",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						cursor: "pointer",
						borderRight: "var(--rule-width) solid var(--rule)",
					}}
				>
					Sign In
				</button>
				<button
					type="button"
					onClick={() => setTab("signup")}
					style={{
						flex: 1,
						padding: "var(--space-base) var(--gap-sm)",
						backgroundColor:
							tab === "signup" ? "var(--surface)" : "transparent",
						color: tab === "signup" ? "var(--ink)" : "var(--ink-muted)",
						border: "none",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						cursor: "pointer",
					}}
				>
					Create Account
				</button>
			</div>

			{/* Clerk Component or Fallback */}
			<div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
				{PUBLISHABLE_KEY ? (
					tab === "signin" ? (
						<SignIn
							routing="hash"
							appearance={clerkAppearance}
							signUpUrl="/auth#signup"
							forceRedirectUrl="/history"
						/>
					) : (
						<SignUp
							routing="hash"
							appearance={clerkAppearance}
							signInUrl="/auth#signin"
							forceRedirectUrl="/history"
						/>
					)
				) : (
					<div
						style={{
							width: "100%",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							padding: "var(--gap-md)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--gap-sm)",
						}}
					>
						<p className="meta" style={{ color: "var(--ink-muted)" }}>
							CLERK AUTH READY
						</p>
						<p style={{ fontSize: "var(--label-size)", color: "var(--ink)" }}>
							Connect your Clerk instance by providing{" "}
							<code className="mono" style={{ color: "var(--accent)" }}>
								NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
							</code>{" "}
							in your environment.
						</p>
						<div
							style={{
								padding: "var(--gap-sm)",
								backgroundColor: "var(--ground)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
							}}
						>
							NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
							<br />
							CLERK_SECRET_KEY=sk_test_...
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export function AuthClient() {
	return (
		<Suspense fallback={null}>
			{PUBLISHABLE_KEY && <AuthenticatedActiveSession />}
			<AuthFormTabs />
		</Suspense>
	);
}
