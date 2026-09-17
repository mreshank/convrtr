"use client";

import { useEffect } from "react";

const GITHUB_ISSUES_URL = "https://github.com/mreshank/convrtr/issues";

export function IssuesRedirectClient() {
	useEffect(() => {
		window.location.replace(GITHUB_ISSUES_URL);
	}, []);

	return (
		<main className="min-h-[60vh] flex items-center justify-center p-6">
			<div
				className="border p-8 max-w-lg w-full flex flex-col gap-4 text-center"
				style={{
					background: "var(--surface)",
					borderColor: "var(--rule)",
				}}
			>
				<span
					className="mono text-[10px] tracking-wider uppercase"
					style={{ color: "var(--accent)" }}
				>
					REDIRECTING ➔
				</span>
				<h1
					className="mono text-lg font-bold uppercase tracking-tight"
					style={{ color: "var(--ink)" }}
				>
					OPENING GITHUB ISSUES
				</h1>
				<p className="mono text-xs" style={{ color: "var(--ink-muted)" }}>
					Taking you to the official convrtr issue tracker on GitHub...
				</p>
				<div className="pt-2">
					<a
						href={GITHUB_ISSUES_URL}
						className="mono text-xs font-bold py-2.5 px-4 border inline-block transition-colors"
						style={{
							background: "var(--ink)",
							color: "var(--surface)",
							borderColor: "var(--ink)",
						}}
					>
						CLICK HERE IF NOT REDIRECTED ➔
					</a>
				</div>
			</div>
		</main>
	);
}
