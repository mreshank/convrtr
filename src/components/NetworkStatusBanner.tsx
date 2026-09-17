"use client";

import { useEffect, useState } from "react";
import { flushPendingSubmissions, getPendingQueue } from "@/lib/form-dispatch";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

export function NetworkStatusBanner() {
	const { isOnline, hasChecked } = useNetworkStatus();
	const [pendingCount, setPendingCount] = useState<number>(0);
	const [isFlushing, setIsFlushing] = useState<boolean>(false);
	const [flushMessage, setFlushMessage] = useState<string | null>(null);

	// Check local queue on load and on connectivity change
	useEffect(() => {
		if (typeof window === "undefined") return;
		const updateCount = () => {
			setPendingCount(getPendingQueue().length);
		};
		updateCount();

		window.addEventListener("online", updateCount);
		window.addEventListener("offline", updateCount);

		return () => {
			window.removeEventListener("online", updateCount);
			window.removeEventListener("offline", updateCount);
		};
	}, []);

	const handleFlush = async () => {
		setIsFlushing(true);
		try {
			const { flushedCount } = await flushPendingSubmissions();
			setPendingCount(getPendingQueue().length);
			setFlushMessage(`DISPATCHED ${flushedCount} ITEM(S) TO MAINTAINER`);
			setTimeout(() => setFlushMessage(null), 3500);
		} catch {
			setFlushMessage("DISPATCH RETRY FAILED");
			setTimeout(() => setFlushMessage(null), 3500);
		} finally {
			setIsFlushing(false);
		}
	};

	// Only show banner if checked and (offline OR has pending items to sync)
	if (!hasChecked) return null;
	if (isOnline && pendingCount === 0 && !flushMessage) return null;

	return (
		<aside
			aria-label="Network and synchronization status"
			className="w-full border-b py-2 px-4 transition-colors text-xs mono"
			style={{
				background: isOnline ? "var(--surface)" : "var(--surface-alt)",
				color: isOnline ? "var(--ink)" : "var(--ink-inverse)",
				borderColor: "var(--rule)",
			}}
		>
			<div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span
						className="inline-block w-2 h-2 rounded-full"
						style={{
							background: isOnline ? "var(--accent)" : "var(--ink-inverse)",
						}}
					/>
					<span className="font-bold tracking-wider uppercase text-[10px]">
						{!isOnline
							? "OFFLINE PWA MODE"
							: pendingCount > 0
								? "LOCAL QUEUE PENDING"
								: "SYNCHRONIZATION ACTIVE"}
					</span>
					<span
						className="hidden md:inline text-[10px]"
						style={{
							color: isOnline ? "var(--ink-muted)" : "var(--ink-inverse)",
						}}
					>
						{!isOnline
							? "// All 200 conversions execute 100% in-browser. Feedback & support queued locally."
							: flushMessage ||
								`// ${pendingCount} offline submission(s) awaiting network transmission.`}
					</span>
				</div>

				<div className="flex items-center gap-2">
					{isOnline && pendingCount > 0 && (
						<button
							type="button"
							onClick={handleFlush}
							disabled={isFlushing}
							className="text-[10px] font-bold py-1 px-3 border transition-colors cursor-pointer"
							style={{
								background: "var(--ink)",
								color: "var(--surface)",
								borderColor: "var(--ink)",
							}}
						>
							{isFlushing
								? "TRANSMITTING..."
								: `SYNC ${pendingCount} ITEM(S) ➔`}
						</button>
					)}
					{!isOnline && (
						<span className="text-[10px] uppercase tracking-wider font-semibold">
							100% CLIENT OFFLINE READY
						</span>
					)}
				</div>
			</div>
		</aside>
	);
}
