"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
	prompt(): Promise<void>;
}

export function PwaInstallBanner() {
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [dismissed, setDismissed] = useState(false);
	const [isStandalone, setIsStandalone] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Check if already in standalone / installed mode
		const standalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			("standalone" in window.navigator &&
				(window.navigator as unknown as { standalone: boolean }).standalone);
		if (standalone) {
			setIsStandalone(true);
			return;
		}

		const dismissedStorage = localStorage.getItem("convrtr_pwa_dismissed");
		if (dismissedStorage === "true") {
			setDismissed(true);
		}

		const handleBeforeInstall = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e as BeforeInstallPromptEvent);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstall);

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
		};
	}, []);

	const handleInstall = async () => {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const choice = await deferredPrompt.userChoice;
		if (choice.outcome === "accepted") {
			setDeferredPrompt(null);
		}
	};

	const handleDismiss = () => {
		setDismissed(true);
		try {
			localStorage.setItem("convrtr_pwa_dismissed", "true");
		} catch {
			// LocalStorage unavailable
		}
	};

	if (isStandalone || dismissed || !deferredPrompt) {
		return null;
	}

	return (
		<section
			aria-label="Application Installation"
			className="w-full border-b border-rule bg-surface text-ink px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap"
		>
			<div className="flex items-center gap-3">
				<span
					className="w-2 h-2 rounded-full bg-accent inline-block shrink-0"
					aria-hidden="true"
				/>
				<span className="mono text-xs tracking-wider text-ink font-medium">
					{"PWA READY // INSTALL FOR NATIVE OFFLINE DESKTOP & MOBILE USE"}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleInstall}
					className="mono text-xs px-3 py-1 rounded-[var(--radius-control)] bg-ink text-ground font-medium hover:opacity-90 transition-opacity cursor-pointer border border-ink"
				>
					INSTALL APP ➔
				</button>
				<button
					type="button"
					onClick={handleDismiss}
					className="mono text-xs px-2.5 py-1 rounded-[var(--radius-control)] text-ink-muted hover:text-ink transition-colors cursor-pointer border border-rule bg-transparent"
				>
					DISMISS
				</button>
			</div>
		</section>
	);
}
